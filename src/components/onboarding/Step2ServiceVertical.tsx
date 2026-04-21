import { useState, useRef, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  REGIONS,
  REGION_LABELS,
  validateZip,
  getZipLabel,
  getZipExample,
  type SupportedCountry,
} from '@/lib/validation';
import { Check, MapPin, X } from 'lucide-react';

export interface ServiceInfo {
  verticals: string[];
  fullAddress: string;
  defaultCity: string;
  states: string[];
  zip: string;
}

const VERTICALS = [
  { value: 'garage_door', label: 'Garage Door' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'dryer_vent', label: 'Dryer Vent' },
  { value: 'chimney', label: 'Chimney' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'other', label: 'Other' },
];

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

interface Props {
  data: ServiceInfo;
  country: SupportedCountry;
  onChange: (data: ServiceInfo) => void;
}

export function Step2ServiceVertical({ data, country, onChange }: Props) {
  const [touched, setTouched] = useState<Partial<Record<keyof ServiceInfo, boolean>>>({});
  const touch = (field: keyof ServiceInfo) => setTouched((t) => ({ ...t, [field]: true }));

  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState(data.fullAddress);
  const [debouncedQuery] = useDebounce(addressQuery, 400);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressRef = useRef<HTMLDivElement>(null);

  // Fetch Nominatim suggestions
  useEffect(() => {
    if (debouncedQuery.length < 3) { setSuggestions([]); return; }
    const countryCode = country === 'GB' ? 'gb' : country.toLowerCase();
    setLoadingSuggestions(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&countrycodes=${countryCode}&format=json&addressdetails=1&limit=6`,
      { headers: { 'User-Agent': 'LocalBoostEngine/1.0' } }
    )
      .then((r) => r.json())
      .then((results: NominatimResult[]) => setSuggestions(results))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [debouncedQuery, country]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectAddress = (result: NominatimResult) => {
    const addr = result.address;
    const city = addr.city ?? addr.town ?? addr.village ?? '';
    const state = addr.state ?? '';
    const zip = addr.postcode ?? '';
    setAddressQuery(result.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange({
      ...data,
      fullAddress: result.display_name,
      defaultCity: city,
      zip: zip || data.zip,
      // Auto-select the state if it matches a known region
      states: state && !data.states.includes(state) ? [...data.states, state] : data.states,
    });
  };

  const toggleVertical = (value: string) => {
    const next = data.verticals.includes(value)
      ? data.verticals.filter((v) => v !== value)
      : [...data.verticals, value];
    onChange({ ...data, verticals: next });
  };

  const toggleState = (value: string) => {
    const next = data.states.includes(value)
      ? data.states.filter((s) => s !== value)
      : [...data.states, value];
    onChange({ ...data, states: next });
  };

  const regions = REGIONS[country] ?? REGIONS['US'];
  const regionLabel = REGION_LABELS[country];

  const zipError = touched.zip ? (validateZip(data.zip, country) ?? undefined) : undefined;
  const addressError = touched.fullAddress && !data.fullAddress.trim() ? 'Business address is required.' : undefined;
  const verticalsError = touched.verticals && data.verticals.length === 0 ? 'Select at least one service.' : undefined;
  const statesError = touched.states && data.states.length === 0 ? `Select at least one ${regionLabel.toLowerCase()}.` : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Service & Location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your services and the primary market you serve.
        </p>
      </div>

      {/* Service verticals — multi-select checkboxes */}
      <div className="space-y-2">
        <Label>
          Service Verticals
          <span className="ml-1 text-xs text-muted-foreground">(select all that apply)</span>
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VERTICALS.map((v) => {
            const selected = data.verticals.includes(v.value);
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => { toggleVertical(v.value); touch('verticals'); }}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
                {v.label}
              </button>
            );
          })}
        </div>
        {verticalsError && <p className="text-xs text-destructive">{verticalsError}</p>}
      </div>

      {/* Address autocomplete */}
      <div className="space-y-1.5" ref={addressRef}>
        <Label htmlFor="fullAddress">Business Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="fullAddress"
            placeholder="Start typing your address..."
            value={addressQuery}
            onChange={(e) => {
              setAddressQuery(e.target.value);
              onChange({ ...data, fullAddress: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => touch('fullAddress')}
            className={cn('pl-9', addressError ? 'border-destructive' : '')}
            autoComplete="off"
          />
          {addressQuery && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setAddressQuery('');
                onChange({ ...data, fullAddress: '', defaultCity: '', zip: '' });
                setSuggestions([]);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (loadingSuggestions || suggestions.length > 0) && (
          <div className="absolute z-50 mt-1 w-full max-w-lg rounded-lg border border-border bg-popover shadow-lg">
            {loadingSuggestions ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
            ) : (
              <ul>
                {suggestions.map((s) => (
                  <li key={s.place_id}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectAddress(s); }}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{s.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {addressError && <p className="text-xs text-destructive">{addressError}</p>}
        <p className="text-xs text-muted-foreground">
          Used to auto-fill city, state, and ZIP. Start typing to search.
        </p>
      </div>

      {/* ZIP code */}
      <div className="space-y-1.5">
        <Label htmlFor="zip">{getZipLabel(country)}</Label>
        <Input
          id="zip"
          placeholder={getZipExample(country)}
          value={data.zip}
          onChange={(e) => onChange({ ...data, zip: e.target.value })}
          onBlur={() => touch('zip')}
          className={zipError ? 'border-destructive' : ''}
        />
        {zipError && <p className="text-xs text-destructive">{zipError}</p>}
      </div>

      {/* States / regions — multi-select */}
      <div className="space-y-2">
        <Label>
          {regionLabel}s You Serve
          <span className="ml-1 text-xs text-muted-foreground">(select one or many)</span>
        </Label>

        {/* Selected tags */}
        {data.states.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.states.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {s}
                <button
                  type="button"
                  onClick={() => toggleState(s)}
                  className="ml-0.5 rounded-full hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Scrollable checkbox list */}
        <div
          className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card p-2"
          onBlur={() => touch('states')}
        >
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {regions.map((r) => {
              const selected = data.states.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { toggleState(r.value); touch('states'); }}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                    selected
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                    )}
                  >
                    {selected && <Check className="h-2.5 w-2.5" />}
                  </span>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
        {statesError && <p className="text-xs text-destructive">{statesError}</p>}
      </div>
    </div>
  );
}
