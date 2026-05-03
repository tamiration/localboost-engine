CREATE TABLE IF NOT EXISTS analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id uuid REFERENCES landing_pages(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  page_views integer DEFAULT 1,
  unique_visitors integer DEFAULT 1,
  form_submissions integer DEFAULT 0,
  cta_clicks integer DEFAULT 0,
  ad_platform text,
  device_type text,
  location_source text,
  city_resolved text,
  state_resolved text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins full access analytics"
  ON analytics FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY IF NOT EXISTS "Clients read own analytics"
  ON analytics FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Anyone can insert analytics"
  ON analytics FOR INSERT
  WITH CHECK (true);
