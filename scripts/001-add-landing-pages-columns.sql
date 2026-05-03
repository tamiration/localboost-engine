-- Add all missing columns to landing_pages
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS page_name text,
  ADD COLUMN IF NOT EXISTS deployed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS page_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS template_type text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS ghl_webhook_url text,
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS before_image_url text,
  ADD COLUMN IF NOT EXISTS after_image_url text,
  ADD COLUMN IF NOT EXISTS maps_embed_url text,
  ADD COLUMN IF NOT EXISTS headline_template text,
  ADD COLUMN IF NOT EXISTS subheadline_template text,
  ADD COLUMN IF NOT EXISTS about_text text,
  ADD COLUMN IF NOT EXISTS service_area_description text;

-- Backfill page_name from title where null
UPDATE landing_pages SET page_name = title WHERE page_name IS NULL AND title IS NOT NULL;

-- Add missing columns to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS ghl_webhook_url text;
