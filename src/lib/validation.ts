/**
 * Country-aware validation rules for LocalBoost Engine.
 * Supported countries: US, CA, AU, IL (Israel), GB (UK / Europe proxy)
 */

export type SupportedCountry = 'US' | 'CA' | 'AU' | 'IL' | 'GB';

// ─── Phone patterns ────────────────────────────────────────────────────────

const PHONE_PATTERNS: Record<SupportedCountry, RegExp> = {
  US: /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/,
  CA: /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/,
  AU: /^(\+?61[-.\s]?)?(0?\d[-.\s]?)?\d{4}[-.\s]?\d{4}$/,
  IL: /^(\+?972[-.\s]?)?(0?\d{1,2}[-.\s]?)?\d{7}$/,
  GB: /^(\+?44[-.\s]?)?(0?\d{2,5}[-.\s]?)?\d{6,8}$/,
};

const PHONE_EXAMPLES: Record<SupportedCountry, string> = {
  US: '(555) 000-0000',
  CA: '(416) 000-0000',
  AU: '04 0000 0000',
  IL: '050-000-0000',
  GB: '07700 900000',
};

// ─── ZIP / Postal code patterns ────────────────────────────────────────────

const ZIP_PATTERNS: Record<SupportedCountry, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  AU: /^\d{4}$/,
  IL: /^\d{7}$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
};

const ZIP_LABELS: Record<SupportedCountry, string> = {
  US: 'ZIP Code',
  CA: 'Postal Code',
  AU: 'Postcode',
  IL: 'Postal Code',
  GB: 'Postcode',
};

const ZIP_EXAMPLES: Record<SupportedCountry, string> = {
  US: '90210',
  CA: 'M5V 2T6',
  AU: '2000',
  IL: '6100000',
  GB: 'SW1A 1AA',
};

// ─── Region (state/province) lists ─────────────────────────────────────────

export const REGIONS: Record<SupportedCountry, { value: string; label: string }[]> = {
  US: [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
    'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
    'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
    'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
    'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
    'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
    'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
    'Wisconsin','Wyoming',
  ].map((s) => ({ value: s, label: s })),

  CA: [
    'Alberta','British Columbia','Manitoba','New Brunswick',
    'Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut',
    'Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon',
  ].map((s) => ({ value: s, label: s })),

  AU: [
    'Australian Capital Territory','New South Wales','Northern Territory',
    'Queensland','South Australia','Tasmania','Victoria','Western Australia',
  ].map((s) => ({ value: s, label: s })),

  IL: [
    'Central District','Haifa District','Jerusalem District',
    'Northern District','Southern District','Tel Aviv District',
  ].map((s) => ({ value: s, label: s })),

  GB: [
    'England','Northern Ireland','Scotland','Wales',
    'Greater London','South East','South West','East of England',
    'East Midlands','West Midlands','Yorkshire and the Humber',
    'North East','North West',
  ].map((s) => ({ value: s, label: s })),
};

export const REGION_LABELS: Record<SupportedCountry, string> = {
  US: 'State',
  CA: 'Province / Territory',
  AU: 'State / Territory',
  IL: 'District',
  GB: 'Region',
};

// ─── Country list for selector ─────────────────────────────────────────────

export const COUNTRIES: { value: SupportedCountry; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'IL', label: 'Israel' },
  { value: 'GB', label: 'United Kingdom / Europe' },
];

// ─── Validation helpers ────────────────────────────────────────────────────

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

export function validatePhone(phone: string, country: SupportedCountry): string | null {
  if (!phone.trim()) return 'Phone number is required.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return `Enter a valid phone number. Example: ${PHONE_EXAMPLES[country]}`;
  if (!PHONE_PATTERNS[country].test(phone.trim())) {
    return `Enter a valid ${country} phone number. Example: ${PHONE_EXAMPLES[country]}`;
  }
  return null;
}

export function validateZip(zip: string, country: SupportedCountry): string | null {
  if (!zip.trim()) return `${ZIP_LABELS[country]} is required.`;
  if (!ZIP_PATTERNS[country].test(zip.trim())) {
    return `Enter a valid ${ZIP_LABELS[country]}. Example: ${ZIP_EXAMPLES[country]}`;
  }
  return null;
}

export function getZipLabel(country: SupportedCountry): string {
  return ZIP_LABELS[country];
}

export function getZipExample(country: SupportedCountry): string {
  return ZIP_EXAMPLES[country];
}

export function getPhoneExample(country: SupportedCountry): string {
  return PHONE_EXAMPLES[country];
}
