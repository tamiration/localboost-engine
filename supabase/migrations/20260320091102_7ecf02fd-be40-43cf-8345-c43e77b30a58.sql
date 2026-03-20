
-- Add has_toll_free to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS has_toll_free boolean DEFAULT false;

-- Create phone_numbers table
CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  area_code text NOT NULL,
  is_toll_free boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  label text,
  active boolean DEFAULT true,
  call_tracking_enabled boolean DEFAULT false,
  call_tracking_provider text,
  call_tracking_number text
);

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access phone_numbers"
  ON public.phone_numbers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Client read own numbers
CREATE POLICY "Clients read own phone_numbers"
  ON public.phone_numbers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role) AND client_id = get_my_client_id());
