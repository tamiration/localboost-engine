CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS about_text text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS service_area_description text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS before_image_url text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS after_image_url text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS notification_email text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS ghl_webhook_url text DEFAULT NULL;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS maps_embed_url text DEFAULT NULL;