
-- Table for tracking unknown geo IDs encountered at runtime
CREATE TABLE public.unknown_geo_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geo_id text UNIQUE NOT NULL,
  ad_platform text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unknown_geo_ids ENABLE ROW LEVEL SECURITY;

-- Admin read/write only
CREATE POLICY "Admins full access unknown_geo_ids"
ON public.unknown_geo_ids FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RPC: upsert with count increment (security definer for use from edge functions / anon)
CREATE OR REPLACE FUNCTION public.log_unknown_geo_id(
  _geo_id text,
  _ad_platform text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.unknown_geo_ids (geo_id, ad_platform)
  VALUES (_geo_id, _ad_platform)
  ON CONFLICT (geo_id) DO UPDATE
  SET count = unknown_geo_ids.count + 1,
      last_seen = now();
END;
$$;

-- RPC: increment page_views on landing_pages (security definer)
CREATE OR REPLACE FUNCTION public.increment_page_views(
  _landing_page_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.landing_pages
  SET page_views = COALESCE(page_views, 0) + 1
  WHERE id = _landing_page_id;
END;
$$;
