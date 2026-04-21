import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface PhoneEntry {
  id: string;
  phoneNumber: string;
  areaCode: string;
  label: string;
  isDefault: boolean;
}

interface Props {
  data: PhoneEntry[];
  onChange: (data: PhoneEntry[]) => void;
}

function newEntry(): PhoneEntry {
  return { id: crypto.randomUUID(), phoneNumber: '', areaCode: '', label: '', isDefault: false };
}

export function Step3PhoneNumbers({ data, onChange }: Props) {
  const add = () => {
    const entry = newEntry();
    if (data.length === 0) entry.isDefault = true;
    onChange([...data, entry]);
  };

  const remove = (id: string) => {
    const remaining = data.filter((e) => e.id !== id);
    // if we removed the default, assign default to first remaining
    if (remaining.length > 0 && !remaining.some((e) => e.isDefault)) {
      remaining[0].isDefault = true;
    }
    onChange(remaining);
  };

  const update = (id: string, field: keyof PhoneEntry, value: string | boolean) => {
    onChange(data.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const setDefault = (id: string) => {
    onChange(data.map((e) => ({ ...e, isDefault: e.id === id })));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Phone Numbers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the phone numbers you want displayed on your landing pages.
        </p>
      </div>

      <div className="space-y-3">
        {data.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No phone numbers added yet. Click below to add one.
          </p>
        )}

        {data.map((entry, idx) => (
          <div
            key={entry.id}
            className={cn(
              'rounded-lg border p-4 space-y-3',
              entry.isDefault ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Number {idx + 1}
                {entry.isDefault && (
                  <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    Default
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {!entry.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(entry.id)}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  placeholder="(555) 000-0000"
                  value={entry.phoneNumber}
                  onChange={(e) => update(entry.id, 'phoneNumber', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Area Code</Label>
                <Input
                  placeholder="555"
                  maxLength={6}
                  value={entry.areaCode}
                  onChange={(e) => update(entry.id, 'areaCode', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                placeholder="e.g. Beverly Hills, West Side"
                value={entry.label}
                onChange={(e) => update(entry.id, 'label', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="w-full">
        + Add Phone Number
      </Button>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add a local number for each market you serve. We recommend using a virtual phone system
          like <span className="font-medium text-foreground">CallRail</span> or{' '}
          <span className="font-medium text-foreground">Twilio</span> to track calls and
          automatically swap numbers based on visitor location.
        </p>
      </div>
    </div>
  );
}
