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

export interface ServiceInfo {
  vertical: string;
  defaultCity: string;
  state: string;
}

const VERTICALS = [
  { value: 'garage_door', label: 'Garage Door' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'dryer_vent', label: 'Dryer Vent' },
  { value: 'chimney', label: 'Chimney' },
  { value: 'other', label: 'Other' },
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

interface Props {
  data: ServiceInfo;
  onChange: (data: ServiceInfo) => void;
}

export function Step2ServiceVertical({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Service & Location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your service type and the primary market you serve.
        </p>
      </div>

      <div className="space-y-4">
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

        <div className="space-y-2">
          <Label htmlFor="defaultCity">Default City</Label>
          <Input
            id="defaultCity"
            placeholder="e.g. Los Angeles"
            value={data.defaultCity}
            onChange={(e) => onChange({ ...data, defaultCity: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Used as a fallback display when no visitor location is detected.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select value={data.state} onValueChange={(v) => onChange({ ...data, state: v })}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
