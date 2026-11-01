-- Recovery only, with founder approval. Restores archived rows without overwriting
-- any customer mapping or purchase created after the live payment cutover.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
INSERT INTO public.billing_customers
SELECT (jsonb_populate_record(NULL::public.billing_customers, a.row_data)).*
FROM public.billing_test_archive a WHERE a.source_table = 'billing_customers'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.billing_subscriptions
SELECT (jsonb_populate_record(NULL::public.billing_subscriptions, a.row_data)).*
FROM public.billing_test_archive a WHERE a.source_table = 'billing_subscriptions'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.promo_redemptions
SELECT (jsonb_populate_record(NULL::public.promo_redemptions, a.row_data)).*
FROM public.billing_test_archive a WHERE a.source_table = 'promo_redemptions'
ON CONFLICT (id) DO NOTHING;
COMMIT;
