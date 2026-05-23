-- Umprompt billing tables
-- Run once in Supabase SQL editor or via supabase db push.

-- 1. Stripe customer mapping
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id  text UNIQUE NOT NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- 2. Subscriptions and lifetime purchases
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id          text,
  stripe_subscription_id      text UNIQUE,
  stripe_checkout_session_id  text UNIQUE,
  stripe_price_id             text,
  plan                        text NOT NULL CHECK (plan IN ('free','pro_monthly','founder_monthly','lifetime','founder_lifetime')),
  status                      text NOT NULL DEFAULT 'inactive',
  is_lifetime                 boolean DEFAULT false,
  is_founder                  boolean DEFAULT false,
  current_period_end          timestamptz,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- 3. Promo code redemptions
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code                        text NOT NULL,
  offer_type                  text NOT NULL CHECK (offer_type IN ('monthly','lifetime')),
  stripe_checkout_session_id  text UNIQUE,
  status                      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','expired')),
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- 4. Usage events (for weekly limit enforcement and abuse guard)
CREATE TABLE IF NOT EXISTS usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  source      text,
  created_at  timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id ON billing_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_status ON promo_redemptions(code, status);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_created ON usage_events(user_id, created_at DESC);

-- RLS
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own billing data
CREATE POLICY "users_read_own_billing_customers"
  ON billing_customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_billing_subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_promo_redemptions"
  ON promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_usage_events"
  ON usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_usage_events"
  ON usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (used by webhook and server-side helpers) can do everything.
-- The service role bypasses RLS by default — no policies needed.

-- Helper: count successful founder redemptions (SECURITY DEFINER bypasses RLS for this read)
CREATE OR REPLACE FUNCTION get_founder_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM promo_redemptions
  WHERE code = 'UMPROMPT'
    AND status = 'succeeded';
$$;

GRANT EXECUTE ON FUNCTION get_founder_count() TO authenticated;
