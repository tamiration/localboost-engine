import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Copy, Check, Link2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

const VERTICALS = [
  { id: 'garage_door', label: 'Garage Door' },
  { id: 'chimney', label: 'Chimney' },
  { id: 'locksmith', label: 'Locksmith' },
  { id: 'dryer_vent', label: 'Dryer Vent' },
];

export interface LandingPageFormData {
  page_name: string;
  client_id: string;
  template_type: string;
  country: string;
  subdomain: string;
  headline_template: string;
  subheadline_template: string;
  cta_text: string;
  about_text: string;
  service_area_description: string;
  primary_color: string;
  hero_image_url: string;
  before_image_url: string;
  after_image_url: string;
  logo_url: string;
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
  garage_door: '{service} in {city}, {state_abbr} — Call ({area_code}) Today',
  chimney: 'Professional Chimney Services in {city}, {state_abbr}',
  locksmith: '24/7 Locksmith in {city}, {state_abbr} — Fast Response',
  dryer_vent: 'Dryer Vent Cleaning in {city}, {state_abbr}',
};

export function LandingPageForm({ initialData, onSubmit, mode, pageId }: LandingPageFormProps) {
  const [clients, setClients] = useState<Tables<'clients'>[]>([]);
  const [form, setForm] = useState<LandingPageFormData>({
    page_name: '', client_id: '', template_type: '', country: 'US',
    subdomain: '', headline_template: '', subheadline_template: '',
    cta_text: 'Call Now — Free Estimate', about_text: '',
    service_area_description: '', primary_color: '#3b82f6',
    hero_image_url: '', before_image_url: '', after_image_url: '',
    logo_url: '', ghl_webhook_url: '', notification_email: '',
    maps_embed_url: '', ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showClone, setShowClone] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);

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
      set('country', c.country);
      if (c.email && !form.notification_email) set('notification_email', c.email);
      const ghl = (c as Record<string, unknown>).ghl_webhook_url as string;
      if (ghl && !form.ghl_webhook_url) set('ghl_webhook_url', ghl);
    }
  };

  const handleVerticalChange = (v: string) => {
    set('template_type', v);
    if (!form.headline_template) set('headline_template', HEADLINE_DEFAULTS[v] ?? '');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.page_name.trim()) e.page_name = 'Required';
    if (!form.client_id) e.client_id = 'Required';
    if (!form.template_type) e.template_type = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  const handleClone = async () => {
    if (!cloneUrl.trim()) return;
    setCloneLoading(true);
    try {
      // Use allorigins.win as a CORS proxy to fetch any public page
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cloneUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Could not fetch that URL');
      const { contents: html } = await res.json();
      if (!html) throw new Error('Empty response from URL');

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const meta = (prop: string) =>
        doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
        doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') || '';

      const headline = meta('og:title') || doc.querySelector('h1')?.textContent?.trim() || doc.title || '';
      const subheadline = meta('og:description') || meta('description') || doc.querySelector('h2')?.textContent?.trim() || '';
      const ctaText = doc.querySelector('.cta, [class*="cta"], a[href*="tel"], button[type="submit"]')?.textContent?.trim() || 'Call Now';
      const heroRaw = meta('og:image') || doc.querySelector('.hero img, [class*="hero"] img, img')?.getAttribute('src') || '';
      const heroImageUrl = heroRaw.startsWith('http') ? heroRaw : heroRaw ? new URL(heroRaw, cloneUrl).href : '';

      const bodyText = doc.body?.textContent?.toLowerCase() ?? '';
      let templateType = form.template_type || 'garage_door';
      if (bodyText.includes('chimney') || bodyText.includes('fireplace')) templateType = 'chimney';
      else if (bodyText.includes('locksmith')) templateType = 'locksmith';
      else if (bodyText.includes('dryer') || bodyText.includes('vent')) templateType = 'dryer_vent';
      else if (bodyText.includes('hvac') || bodyText.includes('air condition')) templateType = 'hvac';
      else if (bodyText.includes('plumb')) templateType = 'plumbing';
      else if (bodyText.includes('electric')) templateType = 'electrical';
      else if (bodyText.includes('roof')) templateType = 'roofing';
      else if (bodyText.includes('pest')) templateType = 'pest_control';
      else if (bodyText.includes('garage')) templateType = 'garage_door';

      setForm(prev => ({
        ...prev,
        headline_template: headline,
        subheadline_template: subheadline,
        cta_text: ctaText || prev.cta_text,
        hero_image_url: heroImageUrl || prev.hero_image_url,
        template_type: templateType,
      }));
      if (!form.template_type && templateType) {
        if (!form.headline_template) setForm(prev => ({ ...prev, headline_template: HEADLINE_DEFAULTS[templateType] ?? headline }));
      }
      toast({ title: 'Page cloned', description: 'Fields pre-filled. Review and adjust before saving.' });
      setShowClone(false);
      setCloneUrl('');
    } catch (err: any) {
      toast({ title: 'Clone failed', description: err.message || 'Could not scrape that URL.', variant: 'destructive' });
    } finally {
      setCloneLoading(false);
    }
  };

  const copyUrl = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const googleUrl = form.subdomain ? `https://${form.subdomain}?loc_interest_ms={loc_interest_ms}&loc_physical_ms={loc_physical_ms}&keyword={keyword}&campaign={campaign}&adgroup={adgroup}&device={device}&gclid={gclid}` : '';
  const bingUrl = form.subdomain ? `https://${form.subdomain}?loc_interest_ms={loc_interest_ms}&loc_physical_ms={loc_physical_ms}&keyword={keyword}&campaign={campaign}&adgroup={adgroup}&device={device}&msclkid={msclkid}&utm_source=bing` : '';

  const fieldError = (key: string) => errors[key] ? <p className="text-xs text-destructive mt-1">{errors[key]}</p> : null;

  return (
    <>
    <Dialog open={showClone} onOpenChange={setShowClone}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clone from URL</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="clone-url">Competitor or reference URL</Label>
          <Input
            id="clone-url"
            placeholder="https://competitor.com/garage-door-dallas"
            value={cloneUrl}
            onChange={e => setCloneUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleClone()}
          />
          <p className="text-xs text-muted-foreground">
            Extracts headline, subheadline, CTA, hero image, and auto-detects the vertical. You can edit all fields after.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setShowClone(false)}>Cancel</Button>
          <Button type="button" onClick={handleClone} disabled={cloneLoading || !cloneUrl.trim()}>
            {cloneLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cloning...</> : 'Clone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <form onSubmit={handleSubmit} className="space-y-8">
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
            <Label>Country</Label>
            <Input value={form.country === 'US' ? '🇺🇸 USA' : '🇦🇺 Australia'} readOnly className="bg-muted" />
          </div>
          <div className="md:col-span-2">
            <Label>Subdomain URL</Label>
            <Input value={form.subdomain} onChange={e => set('subdomain', e.target.value)} placeholder="ads.clientdomain.com" />
            <p className="text-xs text-muted-foreground mt-1">Client must point this subdomain to your server via CNAME</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Content Templates</h3>
        <p className="text-xs text-muted-foreground">Supports {'{city}'}, {'{state_abbr}'}, {'{keyword}'}, {'{service}'}</p>
        <div className="space-y-4">
          <div><Label>Headline Template</Label><Input value={form.headline_template} onChange={e => set('headline_template', e.target.value)} /></div>
          <div><Label>Subheadline Template</Label><Input value={form.subheadline_template} onChange={e => set('subheadline_template', e.target.value)} /></div>
          <div><Label>CTA Text</Label><Input value={form.cta_text} onChange={e => set('cta_text', e.target.value)} /></div>
          <div><Label>About Text</Label><Textarea value={form.about_text} onChange={e => set('about_text', e.target.value)} rows={3} /></div>
          <div><Label>Service Area Description</Label><Input value={form.service_area_description} onChange={e => set('service_area_description', e.target.value)} /></div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Contact & Conversion</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>GHL Webhook URL</Label><Input value={form.ghl_webhook_url} onChange={e => set('ghl_webhook_url', e.target.value)} placeholder="https://hooks.gohighlevel.com/..." /></div>
          <div><Label>Notification Email</Label><Input value={form.notification_email} onChange={e => set('notification_email', e.target.value)} type="email" /></div>
          <div className="md:col-span-2"><Label>Google Maps Embed URL</Label><Input value={form.maps_embed_url} onChange={e => set('maps_embed_url', e.target.value)} placeholder="Paste embed URL from Google Maps" /></div>
        </div>
      </section>

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
          <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} /></div>
          <div><Label>Hero Image URL</Label><Input value={form.hero_image_url} onChange={e => set('hero_image_url', e.target.value)} /></div>
          <div><Label>Before Image URL</Label><Input value={form.before_image_url} onChange={e => set('before_image_url', e.target.value)} /></div>
          <div><Label>After Image URL</Label><Input value={form.after_image_url} onChange={e => set('after_image_url', e.target.value)} /></div>
        </div>
      </section>

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
