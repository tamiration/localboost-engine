ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ghl_webhook_url text DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ghl_contact_id text DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_name text DEFAULT NULL;