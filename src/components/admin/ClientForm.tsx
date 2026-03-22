import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const SERVICE_VERTICALS = [
  { id: 'garage_door', label: 'Garage Door' },
  { id: 'chimney', label: 'Chimney' },
  { id: 'locksmith', label: 'Locksmith' },
  { id: 'dryer_vent', label: 'Dryer Vent' },
];

const SUBSCRIPTION_TIERS = ['free', 'basic', 'medium', 'enterprise', 'nationwide'];

export interface ClientFormData {
  business_name: string;
  website_url: string;
  service_verticals: string[];
  country: 'US' | 'AU';
  contact_name: string;
  email: string;
  phone: string;
  default_city: string;
  default_state: string;
  default_area_code: string;
  default_address: string;
  subscription_tier: string;
  setup_fee_amount: number | null;
  setup_fee_paid: boolean;
  monthly_amount: number | null;
  next_billing_date: string | null;
  ghl_webhook_url: string;
  ghl_contact_id: string;
  notes: string;
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  mode: 'create' | 'edit';
}

const defaultFormData: ClientFormData = {
  business_name: '',
  website_url: '',
  service_verticals: [],
  country: 'US',
  contact_name: '',
  email: '',
  phone: '',
  default_city: '',
  default_state: '',
  default_area_code: '',
  default_address: '',
  subscription_tier: 'free',
  setup_fee_amount: null,
  setup_fee_paid: false,
  monthly_amount: null,
  next_billing_date: null,
  ghl_webhook_url: '',
  ghl_contact_id: '',
  notes: '',
};

export function ClientForm({ initialData, onSubmit, mode }: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>({ ...defaultFormData, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) setForm(prev => ({ ...prev, ...initialData }));
  }, [initialData]);

  const set = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleVertical = (v: string) => {
    setForm(prev => ({
      ...prev,
      service_verticals: prev.service_verticals.includes(v)
        ? prev.service_verticals.filter(x => x !== v)
        : [...prev.service_verticals, v],
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.business_name.trim()) e.business_name = 'Business name is required';
    if (!form.default_city.trim()) e.default_city = 'Default city is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Invalid email format';
    if (form.website_url && !/^https?:\/\/.+/.test(form.website_url))
      e.website_url = 'URL must start with http:// or https://';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-destructive mt-1">{errors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1 — Business Info */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Business Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business_name">Business Name *</Label>
            <Input id="business_name" value={form.business_name} onChange={e => set('business_name', e.target.value)} />
            {fieldError('business_name')}
          </div>
          <div>
            <Label htmlFor="website_url">Website URL</Label>
            <Input id="website_url" value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://..." />
            {fieldError('website_url')}
          </div>
        </div>
        <div>
          <Label>Service Verticals</Label>
          <div className="flex flex-wrap gap-4 mt-2">
            {SERVICE_VERTICALS.map(v => (
              <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.service_verticals.includes(v.id)} onCheckedChange={() => toggleVertical(v.id)} />
                <span className="text-sm">{v.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Country</Label>
          <div className="flex gap-4 mt-2">
            {(['US', 'AU'] as const).map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="country" checked={form.country === c} onChange={() => set('country', c)} className="accent-primary" />
                <span className="text-sm">{c === 'US' ? '🇺🇸 USA' : '🇦🇺 Australia'}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Contact */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Contact Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input id="contact_name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            {fieldError('email')}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Section 3 — Default Location */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Default Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="default_city">Default City *</Label>
            <Input id="default_city" value={form.default_city} onChange={e => set('default_city', e.target.value)} />
            {fieldError('default_city')}
          </div>
          <div>
            <Label htmlFor="default_state">Default State *</Label>
            <Input id="default_state" value={form.default_state} onChange={e => set('default_state', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="default_area_code">Default Area Code</Label>
            <Input id="default_area_code" value={form.default_area_code} onChange={e => set('default_area_code', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="default_address">Default Address</Label>
            <Input id="default_address" value={form.default_address} onChange={e => set('default_address', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Section 4 — Subscription */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Subscription</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Subscription Tier</Label>
            <Select value={form.subscription_tier} onValueChange={v => set('subscription_tier', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_TIERS.map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="monthly_amount">Monthly Amount ($)</Label>
            <Input id="monthly_amount" type="number" value={form.monthly_amount ?? ''} onChange={e => set('monthly_amount', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <Label htmlFor="setup_fee_amount">Setup Fee ($)</Label>
            <Input id="setup_fee_amount" type="number" value={form.setup_fee_amount ?? ''} onChange={e => set('setup_fee_amount', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <Checkbox checked={form.setup_fee_paid} onCheckedChange={c => set('setup_fee_paid', c === true)} />
              <span className="text-sm">Setup Fee Paid</span>
            </label>
          </div>
          <div>
            <Label>Next Billing Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !form.next_billing_date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.next_billing_date ? format(new Date(form.next_billing_date), 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.next_billing_date ? new Date(form.next_billing_date) : undefined} onSelect={d => set('next_billing_date', d ? d.toISOString() : null)} /></PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      {/* Section 5 — GHL */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">GHL Integration</h3>
        <p className="text-xs text-muted-foreground">GHL integration will be configured later</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ghl_webhook_url">GHL Webhook URL</Label>
            <Input id="ghl_webhook_url" value={form.ghl_webhook_url} onChange={e => set('ghl_webhook_url', e.target.value)} placeholder="https://hooks.gohighlevel.com/..." />
          </div>
          <div>
            <Label htmlFor="ghl_contact_id">GHL Contact ID</Label>
            <Input id="ghl_contact_id" value={form.ghl_contact_id} onChange={e => set('ghl_contact_id', e.target.value)} placeholder="Populated automatically" />
          </div>
        </div>
      </section>

      {/* Section 6 — Notes */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Internal Notes</h3>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this client..." rows={4} />
      </section>

      <Button type="submit" disabled={saving} className="w-full md:w-auto">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === 'create' ? 'Create Client' : 'Save Changes'}
      </Button>
    </form>
  );
}
