import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  REGIONS,
  REGION_LABELS,
  validateZip,
  getZipLabel,
  getZipExample,
  type SupportedCountry,
} from '@/lib/validation';

export interface ServiceInfo {
  vertical: string;
  defaultCity: string;
  state: string;
  zip: string;
}

const VERTICALS = [
  { value: 'garage_door', label: 'Garage Door' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'dryer_vent', label: 'Dryer Vent' },
  { value: 'chimney', label: 'Chimney' },
  { value: 'other', label: 'Other' },
];

interface Props {
  data: ServiceInfo;
  country: SupportedCountry;
  onChange: (data: ServiceInfo) => void;
}

export function Step2ServiceVertical({ data, country, onChange }: Props) {
  const [touched, setTouched] = useState<Partial<Record<keyof ServiceInfo, boolean>>>({});
  const touch = (field: keyof ServiceInfo) => () => setTouched((t) => ({ ...t, [field]: true }));

  const zipError = touched.zip ? (validateZip(data.zip, country) ?? undefined) : undefined;
  const cityError = touched.defaultCity && !data.defaultCity.trim()
    ? 'Default city is required.'
    : undefined;
  const stateError = touched.state && !data.state
    ? `${REGION_LABELS[country]} is required.`
    : undefined;

  const regions = REGIONS[country] ?? REGIONS['US'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Service & Location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your service type and the primary market you serve.
        </p>
      </div>

      <div className="space-y-4">
        {/* Service vertical */}
        <div className="space-y-2">
          <Label>Service Vertical</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {VERTICALS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => onChange({ ...data, vertical: v.value })}
                className={cn(
                  'rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors',
                  data.vertical === v.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default city */}
        <div className="space-y-1.5">
          <Label htmlFor="defaultCity">Default City</Label>
          <Input
            id="defaultCity"
            placeholder="e.g. Los Angeles"
            value={data.defaultCity}
            onChange={(e) => onChange({ ...data, defaultCity: e.target.value })}
            onBlur={touch('defaultCity')}
            className={cityError ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {cityError
            ? <p className="text-xs text-destructive">{cityError}</p>
            : <p className="text-xs text-muted-foreground">Used as fallback when no visitor location is detected.</p>
          }
        </div>

        {/* Region (state/province) */}
        <div className="space-y-1.5">
          <Label htmlFor="state">{REGION_LABELS[country]}</Label>
          <Select
            value={data.state}
            onValueChange={(v) => onChange({ ...data, state: v })}
          >
            <SelectTrigger
              id="state"
              onBlur={touch('state')}
              className={stateError ? 'border-destructive focus-visible:ring-destructive' : ''}
            >
              <SelectValue placeholder={`Select ${REGION_LABELS[country]}`} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stateError && <p className="text-xs text-destructive">{stateError}</p>}
        </div>

        {/* ZIP / Postal code */}
        <div className="space-y-1.5">
          <Label htmlFor="zip">{getZipLabel(country)}</Label>
          <Input
            id="zip"
            placeholder={getZipExample(country)}
            value={data.zip}
            onChange={(e) => onChange({ ...data, zip: e.target.value })}
            onBlur={touch('zip')}
            className={zipError ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {zipError && <p className="text-xs text-destructive">{zipError}</p>}
        </div>
      </div>
    </div>
  );
}
