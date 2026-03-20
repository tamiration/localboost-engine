-- Add country to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US';

-- Add country to landing_pages
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US';

-- Add countries array to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS countries text[] NOT NULL DEFAULT ARRAY['US'];