
-- Table 1: google_geo_lookup
CREATE TABLE public.google_geo_lookup (
  criteria_id text PRIMARY KEY,
  city text NOT NULL,
  state text NOT NULL,
  state_abbr text NOT NULL,
  country text NOT NULL,
  area_code text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_google_geo_country ON public.google_geo_lookup (country);
CREATE INDEX idx_google_geo_city_state_country ON public.google_geo_lookup (LOWER(city), LOWER(state), country);

ALTER TABLE public.google_geo_lookup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read google_geo_lookup" ON public.google_geo_lookup
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins write google_geo_lookup" ON public.google_geo_lookup
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table 2: bing_geo_lookup
CREATE TABLE public.bing_geo_lookup (
  location_id text PRIMARY KEY,
  city text NOT NULL,
  state text NOT NULL,
  state_abbr text NOT NULL,
  country text NOT NULL,
  area_code text NOT NULL DEFAULT '',
  google_criteria_id text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_bing_geo_country ON public.bing_geo_lookup (country);
CREATE INDEX idx_bing_geo_city_state_country ON public.bing_geo_lookup (LOWER(city), LOWER(state), country);
CREATE INDEX idx_bing_geo_google_id ON public.bing_geo_lookup (google_criteria_id);

ALTER TABLE public.bing_geo_lookup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bing_geo_lookup" ON public.bing_geo_lookup
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins write bing_geo_lookup" ON public.bing_geo_lookup
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
