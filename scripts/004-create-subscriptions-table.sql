CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  plan_tier text DEFAULT 'free',
  status text DEFAULT 'active',
  monthly_amount numeric(10,2) DEFAULT 0,
  setup_fee_amount numeric(10,2) DEFAULT 0,
  setup_fee_paid boolean DEFAULT false,
  billing_cycle text DEFAULT 'monthly',
  next_billing_date date,
  cancelled_at timestamptz,
  countries text[] DEFAULT ARRAY['US'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins full access subscriptions"
  ON subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY IF NOT EXISTS "Clients read own subscriptions"
  ON subscriptions FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
