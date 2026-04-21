import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BusinessInfo {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  mainPhone: string;
}

interface Props {
  data: BusinessInfo;
  onChange: (data: BusinessInfo) => void;
}

export function Step1BusinessInfo({ data, onChange }: Props) {
  const set = (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [field]: e.target.value });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Business Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your business so we can set up your account.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            placeholder="e.g. Acme Garage Door"
            value={data.businessName}
            onChange={set('businessName')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName">Owner Name</Label>
          <Input
            id="ownerName"
            placeholder="e.g. John Smith"
            value={data.ownerName}
            onChange={set('ownerName')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={data.email}
            onChange={set('email')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            value={data.password}
            onChange={set('password')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mainPhone">Main Phone Number</Label>
          <Input
            id="mainPhone"
            type="tel"
            placeholder="(555) 000-0000"
            value={data.mainPhone}
            onChange={set('mainPhone')}
          />
        </div>
      </div>
    </div>
  );
}
