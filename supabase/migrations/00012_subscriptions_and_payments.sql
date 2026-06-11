
-- ── Subscription plans (static catalog) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id           text        PRIMARY KEY,  -- 'free', 'pro', 'elite'
  name         text        NOT NULL,
  price_inr    int         NOT NULL DEFAULT 0,  -- in paise (₹299 = 29900)
  features     jsonb       NOT NULL DEFAULT '[]',
  credits_per_month int    NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Anyone reads plans') THEN
    CREATE POLICY "Anyone reads plans" ON subscription_plans FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO subscription_plans (id, name, price_inr, credits_per_month, features) VALUES
  ('free',  'Free',  0,
   0,
   '["12 courses","AI Mentor (5 msg/day)","Community access","Basic quizzes"]'::jsonb),
  ('pro',   'Pro',   29900,
   500,
   '["All Free features","Unlimited AI Mentor","All 12 courses","Priority support","500 credits/month","Certificate downloads","Advanced quizzes"]'::jsonb),
  ('elite', 'Elite', 79900,
   1500,
   '["All Pro features","AI Mock Interviewer","AI Resume Builder","Job Portal access","1500 credits/month","Placement support","1-on-1 mentor sessions"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  credits_per_month = EXCLUDED.credits_per_month,
  features = EXCLUDED.features;

-- ── User subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id        text        NOT NULL REFERENCES subscription_plans(id),
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','trialing')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  razorpay_subscription_id text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(user_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_subscriptions' AND policyname='Users view own subscription') THEN
    CREATE POLICY "Users view own subscription" ON user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Free plan row is auto-created on profile insert
CREATE OR REPLACE FUNCTION ensure_free_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_subscriptions(user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_free_sub ON profiles;
CREATE TRIGGER trg_ensure_free_sub
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_free_subscription();

-- Backfill free plan for existing users
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT id, 'free', 'active' FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_subscriptions WHERE status = 'active')
ON CONFLICT DO NOTHING;

-- ── Payment orders ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_orders (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id             text        NOT NULL REFERENCES subscription_plans(id),
  amount_paise        int         NOT NULL,
  currency            text        NOT NULL DEFAULT 'INR',
  status              text        NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  razorpay_order_id   text        UNIQUE,
  razorpay_payment_id text,
  razorpay_signature  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_rzp ON payment_orders(razorpay_order_id);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_orders' AND policyname='Users view own payment orders') THEN
    CREATE POLICY "Users view own payment orders" ON payment_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;
