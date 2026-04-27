import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloneUrlDialog } from '@/components/admin/CloneUrlDialog';
import type { ClonedPage } from '@/components/admin/CloneUrlDialog';
import { Loader2, Copy, Check, Link2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

const VERTICALS = [
  { id: 'garage_door',  label: 'Garage Door' },
  { id: 'chimney',      label: 'Chimney' },
  { id: 'locksmith',    label: 'Locksmith' },
  { id: 'dryer_vent',   label: 'Dryer Vent' },
  { id: 'hvac',         label: 'HVAC' },
  { id: 'plumbing',     label: 'Plumbing' },
  { id: 'electrical',   label: 'Electrical' },
  { id: 'roofing',      label: 'Roofing' },
  { id: 'pest_control', label: 'Pest Control' },
];

export interface LandingPageFormData {
  // Basic
  page_name: string;
  client_id: string;
  template_type: string;
  country: string;
  subdomain: string;
  service_name: string;
  // Content
  headline_template: string;
  fallback_headline: string;
  subheadline: string;
  subheadline_template: string;
  cta_text: string;
  about_title: string;
  about_text: string;
  service_area_description: string;
  // Visual
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  hero_image_url: string;
  before_image_url: string;
  after_image_url: string;
  // JSON blocks
  features: { icon: string; title: string; description: string }[];
  testimonials: { name: string; text: string; rating: number }[];
  // Integrations
  ghl_webhook_url: string;
  notification_email: string;
  maps_embed_url: string;
}

interface LandingPageFormProps {
  initialData?: Partial<LandingPageFormData>;
  onSubmit: (data: LandingPageFormData) => Promise<void>;
  mode: 'create' | 'edit';
  pageId?: string;
}

const HEADLINE_DEFAULTS: Record<string, string> = {
  garage_door:  '{service} in {city}, {state_abbr} — Call ({area_code}) Today',
  chimney:      'Professional Chimney Services in {city}, {state_abbr}',
  locksmith:    '24/7 Locksmith in {city}, {state_abbr} — Fast Response',
  dryer_vent:   'Dryer Vent Cleaning in {city}, {state_abbr}',
  hvac:         'HVAC Repair & Installation in {city}, {state_abbr}',
  plumbing:     'Licensed Plumber in {city}, {state_abbr} — Same Day Service',
  electrical:   'Licensed Electrician in {city}, {state_abbr}',
  roofing:      'Roof Repair & Replacement in {city}, {state_abbr}',
  pest_control: 'Pest Control Services in {city}, {state_abbr}',
};

const DEFAULT_FORM: LandingPageFormData = {
  page_name: '', client_id: '', template_type: '', country: 'US',
  subdomain: '', service_name: '',
  headline_template: '', fallback_headline: '',
  subheadline: '', subheadline_template: '',
  cta_text: 'Call Now — Free Estimate',
  about_title: '', about_text: '', service_area_description: '',
  primary_color: '#3b82f6', secondary_color: '#1e293b', accent_color: '#f59e0b',
  logo_url: '', hero_image_url: '', before_image_url: '', after_image_url: '',
  features: [], testimonials: [],
  ghl_webhook_url: '', notification_email: '', maps_embed_url: '',
};

export function LandingPageForm({ initialData, onSubmit, mode, pageId }: LandingPageFormProps) {
  const [clients, setClients] = useState<Tables<'clients'>[]>([]);
  const [form, setForm] = useState<LandingPageFormData>({ ...DEFAULT_FORM, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showClone, setShowClone] = useState(false);

  useEffect(() => {
    supabase.from('clients').select('*').eq('status', 'active').order('business_name').then(({ data }) => {
      if (data) setClients(data);
    });
  }, []);

  useEffect(() => {
    if (initialData) setForm(prev => ({ ...prev, ...initialData }));
  }, [initialData]);

  const set = <K extends keyof LandingPageFormData>(key: K, val: LandingPageFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleClientChange = (clientId: string) => {
    set('client_id', clientId);
    const c = clients.find(x => x.id === clientId);
    if (c) {
      if ((c as any).country) set('country', (c as any).country);
      if (c.email && !form.notification_email) set('notification_email', c.email);
      const ghl = (c as any).ghl_webhook_url as string;
      if (ghl && !form.ghl_webhook_url) set('ghl_webhook_url', ghl);
    }
  };

  const handleVerticalChange = (v: string) => {
    set('template_type', v);
    if (!form.headline_template) set('headline_template', HEADLINE_DEFAULTS[v] ?? '');
  };

  // ── Clone handler: maps every extracted section into form fields ──
  const handleCloned = (data: Partial<ClonedPage>) => {
    setForm(prev => ({
      ...prev,
      // Basic
      page_name:               data.page_name              || prev.page_name,
      service_name:            data.service_name           || prev.service_name,
      template_type:           data.template_type          || prev.template_type,
      // Headlines
      headline_template:       data.headline_template      || prev.headline_template,
      fallback_headline:       data.fallback_headline      || prev.fallback_headline,
      subheadline:             data.subheadline            || prev.subheadline,
      subheadline_template:    data.subheadline_template   || prev.subheadline_template,
      cta_text:                data.cta_text               || prev.cta_text,
      // Content
      about_title:             data.about_title            || prev.about_title,
      about_text:              data.about_text             || prev.about_text,
      service_area_description: data.service_area_description || prev.service_area_description,
      // Visual
      primary_color:           data.primary_color          || prev.primary_color,
      secondary_color:         data.secondary_color        || prev.secondary_color,
      accent_color:            data.accent_color           || prev.accent_color,
      logo_url:                data.logo_url               || prev.logo_url,
      hero_image_url:          data.hero_image_url         || prev.hero_image_url,
      before_image_url:        data.before_image_url       || prev.before_image_url,
      after_image_url:         data.after_image_url        || prev.after_image_url,
      // JSON blocks — always replace if found
      features:                data.features?.length       ? data.features    : prev.features,
      testimonials:            data.testimonials?.length   ? data.testimonials : prev.testimonials,
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.page_name.trim())  e.page_name     = 'Required';
    if (!form.client_id)         e.client_id     = 'Required';
    if (!form.template_type)     e.template_type = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  const copyUrl = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const googleUrl = form.subdomain
    ? `https://${form.subdomain}?loc_interest_ms={loc_interest_ms}&loc_physical_ms={loc_physical_ms}&keyword={keyword}&campaign={campaign}&adgroup={adgroup}&device={device}&gclid={gclid}`
    : '';
  const bingUrl = form.subdomain
    ? `https://${form.subdomain}?loc_interest_ms={loc_interest_ms}&loc_physical_ms={loc_physical_ms}&keyword={keyword}&campaign={campaign}&adgroup={adgroup}&device={device}&msclkid={msclkid}&utm_source=bing`
    : '';

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-destructive mt-1">{errors[key]}</p> : null;

  return (
    <>
      <CloneUrlDialog open={showClone} onOpenChange={setShowClone} onCloned={handleCloned} />

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Basic Info ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-lg font-semibold text-foreground">Basic Info</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowClone(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Clone from URL
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Page Name *</Label>
              <Input value={form.page_name} onChange={e => set('page_name', e.target.value)} placeholder="DFW Garage Door — Dallas" />
              {fieldError('page_name')}
            </div>
            <div>
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent>
              </Select>
              {fieldError('client_id')}
            </div>
            <div>
              <Label>Template / Vertical *</Label>
              <Select value={form.template_type} onValueChange={handleVerticalChange}>
                <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
                <SelectContent>{VERTICALS.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
              {fieldError('template_type')}
            </div>
            <div>
              <Label>Service Name</Label>
              <Input value={form.service_name} onChange={e => set('service_name', e.target.value)} placeholder="e.g. Garage Door Repair" />
            </div>
            <div className="md:col-span-2">
              <Label>Subdomain URL</Label>
              <Input value={form.subdomain} onChange={e => set('subdomain', e.target.value)} placeholder="ads.clientdomain.com" />
              <p className="text-xs text-muted-foreground mt-1">Client must point this subdomain to your server via CNAME</p>
            </div>
          </div>
        </section>

        {/* ── Content ── */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Content Templates</h3>
          <p className="text-xs text-muted-foreground">Supports {'{city}'}, {'{state_abbr}'}, {'{keyword}'}, {'{service}'}, {'{area_code}'}</p>
          <div className="space-y-4">
            <div>
              <Label>Headline Template</Label>
              <Input value={form.headline_template} onChange={e => set('headline_template', e.target.value)} placeholder={HEADLINE_DEFAULTS[form.template_type] || 'Headline with {city} token'} />
            </div>
            <div>
              <Label>Fallback Headline (no city resolved)</Label>
              <Input value={form.fallback_headline} onChange={e => set('fallback_headline', e.target.value)} placeholder="5-Star Rated Garage Door Repair – Local & Dependable" />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Input value={form.subheadline || form.subheadline_template} onChange={e => { set('subheadline', e.target.value); set('subheadline_template', e.target.value); }} />
            </div>
            <div>
              <Label>CTA Button Text</Label>
              <Input value={form.cta_text} onChange={e => set('cta_text', e.target.value)} />
            </div>
            <div>
              <Label>About Section Title</Label>
              <Input value={form.about_title} onChange={e => set('about_title', e.target.value)} placeholder="About Our Business" />
            </div>
            <div>
              <Label>About Text</Label>
              <Textarea value={form.about_text} onChange={e => set('about_text', e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Service Area Description</Label>
              <Textarea value={form.service_area_description} onChange={e => set('service_area_description', e.target.value)} rows={2} />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
            Features / Why Choose Us
            <span className="ml-2 text-xs font-normal text-muted-foreground">(auto-extracted or edit manually)</span>
          </h3>
          {form.features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No features extracted yet. Use &quot;Clone from URL&quot; or add manually.</p>
          ) : (
            <div className="space-y-3">
              {form.features.map((f, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-xs">Icon</Label>
                    <Select value={f.icon} onValueChange={v => {
                      const updated = [...form.features]; updated[i] = { ...f, icon: v }; set('features', updated);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="star">Star</SelectItem>
                        <SelectItem value="clock">Clock</SelectItem>
                        <SelectItem value="scissors">Scissors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input className="h-8 text-xs" value={f.title} onChange={e => {
                      const updated = [...form.features]; updated[i] = { ...f, title: e.target.value }; set('features', updated);
                    }} />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Description</Label>
                      <Input className="h-8 text-xs" value={f.description} onChange={e => {
                        const updated = [...form.features]; updated[i] = { ...f, description: e.target.value }; set('features', updated);
                      }} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => {
                      set('features', form.features.filter((_, idx) => idx !== i));
                    }}>
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() =>
            set('features', [...form.features, { icon: 'star', title: '', description: '' }])
          }>
            + Add Feature
          </Button>
        </section>

        {/* ── Testimonials ── */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
            Testimonials
            <span className="ml-2 text-xs font-normal text-muted-foreground">(auto-extracted or edit manually)</span>
          </h3>
          {form.testimonials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No testimonials extracted yet. Use &quot;Clone from URL&quot; or add manually.</p>
          ) : (
            <div className="space-y-3">
              {form.testimonials.map((t, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 text-xs" value={t.name} onChange={e => {
                      const updated = [...form.testimonials]; updated[i] = { ...t, name: e.target.value }; set('testimonials', updated);
                    }} />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Review Text</Label>
                      <Input className="h-8 text-xs" value={t.text} onChange={e => {
                        const updated = [...form.testimonials]; updated[i] = { ...t, text: e.target.value }; set('testimonials', updated);
                      }} />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Rating (1-5)</Label>
                      <Select value={String(t.rating)} onValueChange={v => {
                        const updated = [...form.testimonials]; updated[i] = { ...t, rating: Number(v) }; set('testimonials', updated);
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[5,4,3,2,1].map(n => <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => {
                      set('testimonials', form.testimonials.filter((_, idx) => idx !== i));
                    }}>
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() =>
            set('testimonials', [...form.testimonials, { name: '', text: '', rating: 5 }])
          }>
            + Add Testimonial
          </Button>
        </section>

        {/* ── Visual ── */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Visual</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)} className="h-10 w-14 rounded border border-input cursor-pointer" />
                <Input value={form.primary_color} onChange={e => set('primary_color', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Secondary Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.secondary_color} onChange={e => set('secondary_color', e.target.value)} className="h-10 w-14 rounded border border-input cursor-pointer" />
                <Input value={form.secondary_color} onChange={e => set('secondary_color', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Accent Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.accent_color} onChange={e => set('accent_color', e.target.value)} className="h-10 w-14 rounded border border-input cursor-pointer" />
                <Input value={form.accent_color} onChange={e => set('accent_color', e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} />
            </div>
            <div>
              <Label>Hero Image URL</Label>
              <Input value={form.hero_image_url} onChange={e => set('hero_image_url', e.target.value)} />
              {form.hero_image_url && (
                <img src={form.hero_image_url} alt="Hero preview" className="mt-2 h-20 w-full object-cover rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div>
              <Label>Before Image URL</Label>
              <Input value={form.before_image_url} onChange={e => set('before_image_url', e.target.value)} />
              {form.before_image_url && (
                <img src={form.before_image_url} alt="Before preview" className="mt-2 h-20 w-full object-cover rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div>
              <Label>After Image URL</Label>
              <Input value={form.after_image_url} onChange={e => set('after_image_url', e.target.value)} />
              {form.after_image_url && (
                <img src={form.after_image_url} alt="After preview" className="mt-2 h-20 w-full object-cover rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
          </div>
        </section>

        {/* ── Integrations ── */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Contact & Conversion</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>GHL Webhook URL</Label>
              <Input value={form.ghl_webhook_url} onChange={e => set('ghl_webhook_url', e.target.value)} placeholder="https://hooks.gohighlevel.com/..." />
            </div>
            <div>
              <Label>Notification Email</Label>
              <Input value={form.notification_email} onChange={e => set('notification_email', e.target.value)} type="email" />
            </div>
            <div className="md:col-span-2">
              <Label>Google Maps Embed URL</Label>
              <Input value={form.maps_embed_url} onChange={e => set('maps_embed_url', e.target.value)} placeholder="Paste embed URL from Google Maps" />
            </div>
          </div>
        </section>

        {/* ── Ad URLs ── */}
        {mode === 'edit' && form.subdomain && (
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Ad Platform URLs</h3>
            <p className="text-xs text-muted-foreground">Use these as Final URL Suffix in your Google/Bing Ads campaigns</p>
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Google Ads URL</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 items-start">
                  <code className="text-xs bg-muted p-2 rounded flex-1 break-all">{googleUrl}</code>
                  <Button type="button" variant="outline" size="icon" onClick={() => copyUrl(googleUrl, 'google')}>
                    {copied === 'google' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Bing Ads URL</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 items-start">
                  <code className="text-xs bg-muted p-2 rounded flex-1 break-all">{bingUrl}</code>
                  <Button type="button" variant="outline" size="icon" onClick={() => copyUrl(bingUrl, 'bing')}>
                    {copied === 'bing' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <Button type="submit" disabled={saving} className="w-full md:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Landing Page' : 'Save Changes'}
        </Button>

      </form>
    </>
  );
}
