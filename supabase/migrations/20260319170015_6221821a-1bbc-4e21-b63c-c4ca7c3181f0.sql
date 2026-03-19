-- Add client_id to existing profiles table (new column only, no existing changes)
ALTER TABLE public.profiles ADD COLUMN client_id UUID;

-- TABLE 1: clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    business_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    website_url TEXT,
    service_verticals TEXT[],
    default_city TEXT,
    default_state TEXT,
    default_area_code TEXT,
    default_address TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'medium', 'enterprise', 'nationwide')),
    active BOOLEAN DEFAULT true,
    notes TEXT
);

-- Add foreign key from profiles.client_id -> clients.id
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- TABLE 2: landing_pages
CREATE TABLE public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    page_name TEXT NOT NULL,
    subdomain TEXT,
    template_type TEXT CHECK (template_type IN ('garage_door', 'chimney')),
    headline_template TEXT,
    subheadline_template TEXT,
    phone_template TEXT,
    cta_text TEXT DEFAULT 'Call Now — Free Estimate',
    primary_color TEXT DEFAULT '#3b82f6',
    deployed BOOLEAN DEFAULT false,
    page_views INTEGER DEFAULT 0,
    google_ads_url TEXT,
    bing_ads_url TEXT
);

-- TABLE 3: geo_configs
CREATE TABLE public.geo_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    priority_1 TEXT DEFAULT 'location_interest',
    priority_2 TEXT DEFAULT 'physical_location',
    priority_3 TEXT DEFAULT 'company_default',
    loc_interest_param TEXT DEFAULT 'loc_interest_ms',
    loc_physical_param TEXT DEFAULT 'loc_physical_ms',
    keyword_param TEXT DEFAULT 'keyword',
    campaign_param TEXT DEFAULT 'campaign',
    adgroup_param TEXT DEFAULT 'adgroup',
    use_adgroup_as_city BOOLEAN DEFAULT false
);

-- TABLE 4: edit_requests
CREATE TABLE public.edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    edit_description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    admin_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- TABLE 5: analytics
CREATE TABLE public.analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    cta_clicks INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    location_source TEXT CHECK (location_source IN ('location_interest', 'physical_location', 'adgroup_name', 'company_default')),
    city_resolved TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'desktop')),
    ad_platform TEXT CHECK (ad_platform IN ('google', 'bing', 'direct'))
);

-- TABLE 6: subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plan_tier TEXT CHECK (plan_tier IN ('free', 'basic', 'medium', 'enterprise', 'nationwide')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
    setup_fee_paid BOOLEAN DEFAULT false,
    setup_fee_amount NUMERIC,
    monthly_amount NUMERIC,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- TABLE 7: templates
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    template_name TEXT NOT NULL,
    vertical TEXT CHECK (vertical IN ('garage_door', 'chimney')),
    thumbnail_url TEXT,
    html_structure TEXT,
    default_headline TEXT,
    default_subheadline TEXT,
    default_cta TEXT,
    default_primary_color TEXT DEFAULT '#3b82f6',
    active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: get client_id for current user from profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- ============================================================
-- ADMIN POLICIES (full access on all tables)
-- ============================================================
CREATE POLICY "Admins full access clients" ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access landing_pages" ON public.landing_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access geo_configs" ON public.geo_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access edit_requests" ON public.edit_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access analytics" ON public.analytics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access templates" ON public.templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- CLIENT POLICIES
-- ============================================================

-- clients: read own row only
CREATE POLICY "Clients read own client" ON public.clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND id = public.get_my_client_id());

-- landing_pages: read own pages only
CREATE POLICY "Clients read own landing_pages" ON public.landing_pages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND client_id = public.get_my_client_id());

-- geo_configs: read configs for own pages
CREATE POLICY "Clients read own geo_configs" ON public.geo_configs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND landing_page_id IN (
    SELECT id FROM public.landing_pages WHERE client_id = public.get_my_client_id()
  ));

-- edit_requests: read own + insert new
CREATE POLICY "Clients read own edit_requests" ON public.edit_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND client_id = public.get_my_client_id());

CREATE POLICY "Clients insert edit_requests" ON public.edit_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'client') AND client_id = public.get_my_client_id());

-- analytics: read own page analytics
CREATE POLICY "Clients read own analytics" ON public.analytics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND landing_page_id IN (
    SELECT id FROM public.landing_pages WHERE client_id = public.get_my_client_id()
  ));

-- subscriptions: read own subscription
CREATE POLICY "Clients read own subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND client_id = public.get_my_client_id());

-- templates: read all active templates
CREATE POLICY "Clients read active templates" ON public.templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client') AND active = true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_landing_pages_client_id ON public.landing_pages(client_id);
CREATE INDEX idx_geo_configs_landing_page_id ON public.geo_configs(landing_page_id);
CREATE INDEX idx_edit_requests_client_id ON public.edit_requests(client_id);
CREATE INDEX idx_edit_requests_landing_page_id ON public.edit_requests(landing_page_id);
CREATE INDEX idx_analytics_landing_page_id ON public.analytics(landing_page_id);
CREATE INDEX idx_subscriptions_client_id ON public.subscriptions(client_id);
CREATE INDEX idx_profiles_client_id ON public.profiles(client_id);