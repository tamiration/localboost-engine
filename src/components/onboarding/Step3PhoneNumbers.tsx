import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { validatePhone, formatPhoneInput, getPhoneExample, type SupportedCountry } from '@/lib/validation';
import { Phone } from 'lucide-react';

export interface PhoneEntry {
  vertical: string;
  verticalLabel: string;
  phoneNumber: string;
  isDefault: boolean;
}

interface Props {
  data: PhoneEntry[];
  country: SupportedCountry;
  onChange: (data: PhoneEntry[]) => void;
}

export function Step3PhoneNumbers({ data, country, onChange }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (vertical: string) =>
    setTouched((t) => ({ ...t, [vertical]: true }));

  const update = (vertical: string, phoneNumber: string) => {
    onChange(data.map((e) => (e.vertical === vertical ? { ...e, phoneNumber } : e)));
  };

  const getError = (entry: PhoneEntry) => {
    if (!touched[entry.vertical]) return undefined;
    if (!entry.phoneNumber.trim()) return 'Phone number is required.';
    return validatePhone(entry.phoneNumber, country) ?? undefined;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Phone Numbers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign a dedicated tracking number to each service. Visitors will see
          the number matching the service they found you through.
        </p>
      </div>

      <div className="space-y-4">
        {data.map((entry, idx) => {
          const error = getError(entry);
          return (
            <div
              key={entry.vertical}
              className={cn(
                'rounded-lg border p-4 space-y-3 transition-colors',
                idx === 0
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card'
              )}
            >
              {/* Vertical label + default badge */}
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {entry.verticalLabel}
                </span>
                {idx === 0 && (
                  <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    Default
                  </span>
                )}
              </div>

              {/* Phone input */}
              <div className="space-y-1.5">
                <Label htmlFor={`phone-${entry.vertical}`} className="text-xs">
                  Phone Number
                </Label>
                <Input
                  id={`phone-${entry.vertical}`}
                  type="tel"
                  placeholder={getPhoneExample(country)}
                  value={entry.phoneNumber}
                  onChange={(e) => update(entry.vertical, formatPhoneInput(e.target.value, country))}
                  onBlur={() => touch(entry.vertical)}
                  className={cn(error ? 'border-destructive' : '')}
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set up each number in your virtual phone system (e.g.{' '}
          <span className="font-medium text-foreground">CallRail</span> or{' '}
          <span className="font-medium text-foreground">Twilio</span>) to enable
          automatic call routing and location-based number swapping.
        </p>
      </div>
    </div>
  );
}
