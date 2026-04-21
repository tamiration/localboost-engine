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
import {
  validateEmail,
  validatePassword,
  validatePhone,
  COUNTRIES,
  getPhoneExample,
  type SupportedCountry,
} from '@/lib/validation';

export interface BusinessInfo {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  mainPhone: string;
  country: SupportedCountry;
}

interface FieldErrors {
  businessName?: string;
  email?: string;
  password?: string;
  mainPhone?: string;
}

interface Props {
  data: BusinessInfo;
  onChange: (data: BusinessInfo) => void;
}

export function Step1BusinessInfo({ data, onChange }: Props) {
  const [touched, setTouched] = useState<Partial<Record<keyof BusinessInfo, boolean>>>({});

  const set = (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, [field]: e.target.value });
  };

  const touch = (field: keyof BusinessInfo) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const errors: FieldErrors = {
    businessName: touched.businessName && !data.businessName.trim()
      ? 'Business name is required.'
      : undefined,
    email: touched.email ? (validateEmail(data.email) ?? undefined) : undefined,
    password: touched.password ? (validatePassword(data.password) ?? undefined) : undefined,
    mainPhone: touched.mainPhone
      ? (validatePhone(data.mainPhone, data.country) ?? undefined)
      : undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Business Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your business so we can set up your account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Country */}
        <div className="space-y-1.5">
          <Label htmlFor="country">Advertising Country</Label>
          <Select
            value={data.country}
            onValueChange={(v) => onChange({ ...data, country: v as SupportedCountry, mainPhone: '' })}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used to validate phone numbers and addresses correctly.
          </p>
        </div>

        {/* Business name */}
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            placeholder="e.g. Acme Garage Door"
            value={data.businessName}
            onChange={set('businessName')}
            onBlur={touch('businessName')}
            className={errors.businessName ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
        </div>

        {/* Owner name */}
        <div className="space-y-1.5">
          <Label htmlFor="ownerName">Owner Name</Label>
          <Input
            id="ownerName"
            placeholder="e.g. John Smith"
            value={data.ownerName}
            onChange={set('ownerName')}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={data.email}
            onChange={set('email')}
            onBlur={touch('email')}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            autoComplete="new-password"
            value={data.password}
            onChange={set('password')}
            onBlur={touch('password')}
            className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="mainPhone">Main Phone Number</Label>
          <Input
            id="mainPhone"
            type="tel"
            placeholder={getPhoneExample(data.country)}
            value={data.mainPhone}
            onChange={set('mainPhone')}
            onBlur={touch('mainPhone')}
            className={errors.mainPhone ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.mainPhone && <p className="text-xs text-destructive">{errors.mainPhone}</p>}
        </div>
      </div>
    </div>
  );
}
