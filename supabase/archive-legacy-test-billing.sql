-- Manual maintenance only: requires the founder's approval immediately before use.
-- Archives exactly one pre-cutover, expired MONTHLY TEST purchase and its matching
-- old customer link. User accounts, prompts, usage, and real purchases are untouched.
-- Run in the production project's SQL Editor, never as an automatic schema migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
LOCK TABLE public.billing_subscriptions, public.billing_customers, public.promo_redemptions
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.billing_test_archive (
  source_table text NOT NULL,
  source_key text NOT NULL,
  row_data jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'Legacy Stripe test billing before live payment cutover',
  PRIMARY KEY (source_table, source_key)
);
ALTER TABLE public.billing_test_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_test_archive FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.billing_test_archive TO service_role;

DO $archive$
DECLARE
  old_subscription public.billing_subscriptions%ROWTYPE;
  old_customer public.billing_customers%ROWTYPE;
  candidate_count integer;
BEGIN
  SELECT count(*) INTO candidate_count FROM public.billing_subscriptions
  WHERE status IN ('active', 'trialing')
    AND plan IN ('pro_monthly', 'founder_monthly')
    AND NOT coalesce(is_lifetime, false)
    AND left(stripe_checkout_session_id, 8) = 'cs_test_'
    AND current_period_end < '2026-10-29T00:00:00Z'
    AND created_at < '2026-10-29T00:00:00Z';
  IF candidate_count = 0 THEN
    RAISE NOTICE 'No eligible old test purchase remains; no billing rows removed.';
    RETURN;
  END IF;
  IF candidate_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one old test purchase; transaction cancelled.';
  END IF;
  SELECT * INTO STRICT old_subscription FROM public.billing_subscriptions
  WHERE status IN ('active', 'trialing')
    AND plan IN ('pro_monthly', 'founder_monthly')
    AND NOT coalesce(is_lifetime, false)
    AND left(stripe_checkout_session_id, 8) = 'cs_test_'
    AND current_period_end < '2026-10-29T00:00:00Z'
    AND created_at < '2026-10-29T00:00:00Z';

  SELECT * INTO STRICT old_customer FROM public.billing_customers
  WHERE user_id = old_subscription.user_id
    AND stripe_customer_id = old_subscription.stripe_customer_id
    AND updated_at < '2026-10-29T00:00:00Z';
  IF EXISTS (
    SELECT 1 FROM public.billing_subscriptions
    WHERE user_id = old_subscription.user_id AND id <> old_subscription.id
      AND status IN ('active', 'trialing')
      AND left(stripe_checkout_session_id, 8) = 'cs_live_'
  ) THEN
    RAISE EXCEPTION 'A live purchase now exists for this account; manual review required.';
  END IF;

  INSERT INTO public.billing_test_archive (source_table, source_key, row_data)
  VALUES ('billing_subscriptions', old_subscription.id::text, to_jsonb(old_subscription)),
    ('billing_customers', old_customer.user_id::text, to_jsonb(old_customer))
  ON CONFLICT DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM public.billing_test_archive WHERE source_table = 'billing_subscriptions'
      AND source_key = old_subscription.id::text AND row_data = to_jsonb(old_subscription)
  ) OR NOT EXISTS (
    SELECT 1 FROM public.billing_test_archive WHERE source_table = 'billing_customers'
      AND source_key = old_customer.user_id::text AND row_data = to_jsonb(old_customer)
  ) THEN
    RAISE EXCEPTION 'Recovery copy differs from current data; no billing rows removed.';
  END IF;
  INSERT INTO public.billing_test_archive (source_table, source_key, row_data)
  SELECT 'promo_redemptions', id::text, to_jsonb(p) FROM public.promo_redemptions p
  WHERE stripe_checkout_session_id = old_subscription.stripe_checkout_session_id
  ON CONFLICT DO NOTHING;
  IF EXISTS (
    SELECT 1 FROM public.promo_redemptions p
    WHERE stripe_checkout_session_id = old_subscription.stripe_checkout_session_id
      AND NOT EXISTS (
        SELECT 1 FROM public.billing_test_archive a WHERE a.source_table = 'promo_redemptions'
          AND a.source_key = p.id::text AND a.row_data = to_jsonb(p)
      )
  ) THEN
    RAISE EXCEPTION 'Promo recovery copy differs; no billing rows removed.';
  END IF;

  DELETE FROM public.promo_redemptions
    WHERE stripe_checkout_session_id = old_subscription.stripe_checkout_session_id;
  DELETE FROM public.billing_subscriptions WHERE id = old_subscription.id;
  DELETE FROM public.billing_customers
    WHERE user_id = old_customer.user_id AND stripe_customer_id = old_customer.stripe_customer_id;
  RAISE NOTICE 'One old test purchase and matching customer link archived with recovery copies.';
END;
$archive$;
COMMIT;
