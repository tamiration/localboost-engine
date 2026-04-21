import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface LandingPageSetup {
  subdomain: string;
  primaryColor: string;
  fallbackHeadlineStyle: 'A' | 'B' | 'custom';
  customHeadline: string;
}

interface Props {
  data: LandingPageSetup;
  onChange: (data: LandingPageSetup) => void;
  serviceName: string;
}

const FALLBACK_OPTIONS = [
  {
    key: 'A' as const,
    label: 'Option A',
    preview: (service: string) => `5-Star Rated ${service} – Local & Dependable`,
  },
  {
    key: 'B' as const,
    label: 'Option B',
    preview: (service: string) => `Fast, Reliable ${service} – Wherever You Are`,
  },
  {
    key: 'custom' as const,
    label: 'Custom',
    preview: () => 'Write your own fallback headline',
  },
];

const TEMPLATE_MAP: Record<string, string> = {
  garage_door: 'garage_door',
  locksmith: 'modern',
  dryer_vent: 'modern',
  chimney: 'modern',
  other: 'modern',
};

export function Step4LandingPageSetup({ data, onChange, serviceName }: Props) {
  const set = (field: keyof LandingPageSetup) => (value: string) =>
    onChange({ ...data, [field]: value });

  const liveUrl = data.subdomain
    ? `https://localboost-engine.vercel.app/p/${data.subdomain.toLowerCase().replace(/\s+/g, '-')}`
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Landing Page Setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your landing page URL and branding.
        </p>
      </div>

      <div className="space-y-4">
        {/* Subdomain */}
        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/p/</span>
            <Input
              id="subdomain"
              placeholder="your-business"
              value={data.subdomain}
              onChange={(e) =>
                onChange({
                  ...data,
                  subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
            />
          </div>
          {liveUrl && (
            <p className="truncate text-xs text-primary">{liveUrl}</p>
          )}
        </div>

        {/* Brand color */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Brand Primary Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              type="color"
              value={data.primaryColor}
              onChange={(e) => set('primaryColor')(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-md border border-border bg-card p-1"
            />
            <Input
              value={data.primaryColor}
              onChange={(e) => set('primaryColor')(e.target.value)}
              placeholder="#1a1a2e"
              className="max-w-[140px] font-mono text-sm"
            />
          </div>
        </div>

        {/* Fallback headline */}
        <div className="space-y-2">
          <Label>Fallback Headline Style</Label>
          <p className="text-xs text-muted-foreground">
            Shown when no visitor location is detected.
          </p>
          <div className="space-y-2">
            {FALLBACK_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange({ ...data, fallbackHeadlineStyle: opt.key })}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                  data.fallbackHeadlineStyle === opt.key
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {opt.label}
                </span>
                <p className="mt-0.5 text-sm text-foreground">
                  {opt.preview(serviceName || 'Your Service')}
                </p>
              </button>
            ))}
          </div>

          {data.fallbackHeadlineStyle === 'custom' && (
            <Input
              placeholder="Enter your custom fallback headline..."
              value={data.customHeadline}
              onChange={(e) => onChange({ ...data, customHeadline: e.target.value })}
              className="mt-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { TEMPLATE_MAP };
