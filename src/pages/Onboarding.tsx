import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Step1BusinessInfo, type BusinessInfo } from '@/components/onboarding/Step1BusinessInfo';
import { Step2ServiceVertical, type ServiceInfo } from '@/components/onboarding/Step2ServiceVertical';
import { validateEmail, validatePassword, validatePhone, validateZip } from '@/lib/validation';
import { Step3PhoneNumbers, type PhoneEntry } from '@/components/onboarding/Step3PhoneNumbers';
import { Step4LandingPageSetup, type LandingPageSetup, TEMPLATE_MAP } from '@/components/onboarding/Step4LandingPageSetup';
import { Step5Review } from '@/components/onboarding/Step5Review';
import { cn } from '@/lib/utils';

const STEPS = [
  'Business Info',
  'Service',
  'Phone Numbers',
  'Landing Page',
  'Review',
];

const VERTICAL_LABELS: Record<string, string> = {
  garage_door: 'Garage Door',
  locksmith: 'Locksmith',
  dryer_vent: 'Dryer Vent',
  chimney: 'Chimney',
  other: 'Other',
};

function validateStep(step: number, s1: BusinessInfo, s2: ServiceInfo, s3: PhoneEntry[], s4: LandingPageSetup): string | null {
  if (step === 1) {
    if (!s1.businessName.trim()) return 'Business name is required.';
    const emailErr = validateEmail(s1.email);
    if (emailErr) return emailErr;
    const passErr = validatePassword(s1.password);
    if (passErr) return passErr;
    const phoneErr = validatePhone(s1.mainPhone, s1.country);
    if (phoneErr) return phoneErr;
  }
  if (step === 2) {
    if (!s2.vertical) return 'Please select a service vertical.';
    if (!s2.defaultCity.trim()) return 'Default city is required.';
    if (!s2.state) return 'Please select a region.';
    const zipErr = validateZip(s2.zip, s1.country);
    if (zipErr) return zipErr;
  }
  if (step === 4) {
    if (!s4.subdomain.trim()) return 'Subdomain is required.';
    if (s4.fallbackHeadlineStyle === 'custom' && !s4.customHeadline.trim()) {
      return 'Please enter your custom headline.';
    }
  }
  return null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [step1, setStep1] = useState<BusinessInfo>({
    businessName: '', ownerName: '', email: '', password: '', mainPhone: '', country: 'US',
  });
  const [step2, setStep2] = useState<ServiceInfo>({
    vertical: '', defaultCity: '', state: '', zip: '',
  });
  const [step3, setStep3] = useState<PhoneEntry[]>([]);
  const [step4, setStep4] = useState<LandingPageSetup>({
    subdomain: '', primaryColor: '#1a1a2e', fallbackHeadlineStyle: 'A', customHeadline: '',
  });

  const serviceName = VERTICAL_LABELS[step2.vertical] ?? 'Your Service';

  const goNext = () => {
    const err = validateStep(step, step1, step2, step3, step4);
    if (err) {
      toast({ title: 'Please fix the following', description: err, variant: 'destructive' });
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    const err = validateStep(5, step1, step2, step3, step4);
    if (err) {
      toast({ title: 'Please fix the following', description: err, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: step1.email,
        password: step1.password,
        options: {
          data: {
            full_name: step1.ownerName,
            business_name: step1.businessName,
          },
        },
      });

      if (authError) throw authError;
      const user = authData.user;

      // 3. Insert client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          business_name: step1.businessName,
          contact_email: step1.email,
          contact_phone: step1.mainPhone,
          city: step2.defaultCity,
          state: step2.state,
          zip_code: step2.zip,
          country: step1.country,
          category: step2.vertical,
          industry: step2.vertical,
          service_verticals: [step2.vertical],
          status: 'active',
          user_id: user?.id ?? null,
        })
        .select('id')
        .single();

      if (clientError || !client) throw clientError ?? new Error('Failed to create client');

      // 4. Insert landing page
      const fallbackHeadline =
        step4.fallbackHeadlineStyle === 'A'
          ? `5-Star Rated ${serviceName} – Local & Dependable`
          : step4.fallbackHeadlineStyle === 'B'
          ? `Fast, Reliable ${serviceName} – Wherever You Are`
          : step4.customHeadline;

      const { error: pageError } = await supabase
        .from('landing_pages')
        .insert({
          client_id: client.id,
          subdomain: step4.subdomain,
          page_name: `${step1.businessName} — Main`,
          headline: `{service_name} in {location}`,
          subheadline: `Serving {location} with expert ${serviceName.toLowerCase()} services.`,
          cta_text: 'Call Us Now',
          primary_color: step4.primaryColor,
          theme_style: 'modern',
          service_name: serviceName,
          fallback_headline: fallbackHeadline,
          is_published: true,
        });

      if (pageError) throw pageError;

      // 5. Insert phone numbers
      if (step3.length > 0) {
        const { error: phoneError } = await supabase
          .from('phone_numbers')
          .insert(
            step3.map((p) => ({
              client_id: client.id,
              phone_number: p.phoneNumber,
              area_code: p.areaCode,
              label: p.label,
              is_default: p.isDefault,
            }))
          );
        if (phoneError) throw phoneError;
      }

      toast({ title: 'Account created!', description: 'Your landing page is live. Redirecting...' });
      navigate(`/p/${step4.subdomain}`);
    } catch (err: any) {
      toast({
        title: 'Something went wrong',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <p className="text-lg font-semibold text-foreground">LocalBoost Engine</p>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        done
                          ? 'bg-primary text-primary-foreground'
                          : active
                          ? 'border-2 border-primary text-primary'
                          : 'border-2 border-border text-muted-foreground'
                      )}
                    >
                      {done ? '✓' : n}
                    </div>
                    <span
                      className={cn(
                        'hidden text-xs sm:block',
                        active ? 'font-medium text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'mx-1 h-px flex-1 transition-colors',
                        done ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {step === 1 && <Step1BusinessInfo data={step1} onChange={setStep1} />}
          {step === 2 && <Step2ServiceVertical data={step2} country={step1.country} onChange={setStep2} />}
          {step === 3 && <Step3PhoneNumbers data={step3} onChange={setStep3} />}
          {step === 4 && (
            <Step4LandingPageSetup data={step4} onChange={setStep4} serviceName={serviceName} />
          )}
          {step === 5 && (
            <Step5Review step1={step1} step2={step2} step3={step3} step4={step4} />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={goBack} disabled={step === 1}>
            Back
          </Button>

          {step < 5 ? (
            <Button onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          )}
        </div>

        {/* Step counter */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
