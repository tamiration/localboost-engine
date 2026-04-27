CREATE TABLE IF NOT EXISTS edit_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  landing_page_id uuid REFERENCES landing_pages(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edit_description text NOT NULL,
  status text DEFAULT 'pending',
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins full access edit_requests"
  ON edit_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY IF NOT EXISTS "Clients manage own edit_requests"
  ON edit_requests FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
