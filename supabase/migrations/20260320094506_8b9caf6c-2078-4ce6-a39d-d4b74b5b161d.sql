
-- Table 3: us_area_codes
CREATE TABLE public.us_area_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  area_code text NOT NULL
);

CREATE UNIQUE INDEX idx_us_area_codes_city_state ON public.us_area_codes (LOWER(city), LOWER(state));
CREATE INDEX idx_us_area_codes_state ON public.us_area_codes (LOWER(state));

ALTER TABLE public.us_area_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read us_area_codes" ON public.us_area_codes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins write us_area_codes" ON public.us_area_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table 4: us_state_area_codes
CREATE TABLE public.us_state_area_codes (
  state text PRIMARY KEY,
  area_code text NOT NULL
);

ALTER TABLE public.us_state_area_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read us_state_area_codes" ON public.us_state_area_codes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins write us_state_area_codes" ON public.us_state_area_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
