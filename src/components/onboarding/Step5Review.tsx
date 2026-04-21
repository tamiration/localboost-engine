import type { BusinessInfo } from './Step1BusinessInfo';
import type { ServiceInfo } from './Step2ServiceVertical';
import type { PhoneEntry } from './Step3PhoneNumbers';
import type { LandingPageSetup } from './Step4LandingPageSetup';

const VERTICAL_LABELS: Record<string, string> = {
  garage_door: 'Garage Door',
  locksmith: 'Locksmith',
  dryer_vent: 'Dryer Vent',
  chimney: 'Chimney',
  other: 'Other',
};

const FALLBACK_LABELS: Record<string, string> = {
  A: 'Option A — 5-Star Rated',
  B: 'Option B — Fast, Reliable',
  custom: 'Custom headline',
};

interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground break-all">{value || '—'}</span>
    </div>
  );
}

interface Props {
  step1: BusinessInfo;
  step2: ServiceInfo;
  step3: PhoneEntry[];
  step4: LandingPageSetup;
}

export function Step5Review({ step1, step2, step3, step4 }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Review & Submit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your details before creating your account.
        </p>
      </div>

      {/* Business Info */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Business Info
        </h3>
        <ReviewRow label="Business Name" value={step1.businessName} />
        <ReviewRow label="Owner Name" value={step1.ownerName} />
        <ReviewRow label="Email" value={step1.email} />
        <ReviewRow label="Main Phone" value={step1.mainPhone} />
      </section>

      {/* Service */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Service & Location
        </h3>
        <ReviewRow label="Vertical" value={VERTICAL_LABELS[step2.vertical] ?? step2.vertical} />
        <ReviewRow label="Default City" value={step2.defaultCity} />
        <ReviewRow label="State" value={step2.state} />
      </section>

      {/* Phone Numbers */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Phone Numbers ({step3.length})
        </h3>
        {step3.length === 0 ? (
          <p className="text-sm text-muted-foreground">None added.</p>
        ) : (
          step3.map((p, i) => (
            <div key={p.id} className="py-2 border-b border-border last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {p.phoneNumber}
                  {p.isDefault && (
                    <span className="ml-2 text-xs text-primary">(default)</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.areaCode && `AC: ${p.areaCode}`}
                  {p.label && ` · ${p.label}`}
                </span>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Landing Page */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Landing Page
        </h3>
        <ReviewRow
          label="URL"
          value={step4.subdomain ? `https://localboost-engine.vercel.app/p/${step4.subdomain}` : ''}
        />
        <ReviewRow label="Brand Color" value={step4.primaryColor} />
        <ReviewRow
          label="Fallback Headline"
          value={
            step4.fallbackHeadlineStyle === 'custom'
              ? step4.customHeadline
              : FALLBACK_LABELS[step4.fallbackHeadlineStyle]
          }
        />
      </section>
    </div>
  );
}
