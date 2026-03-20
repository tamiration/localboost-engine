/**
 * Phone Number Resolver for LocalAds System
 * Two-layer matching: exact area code → toll-free fallback
 */

export interface PhoneNumber {
  id: string;
  phone_number: string;
  area_code: string;
  is_toll_free: boolean;
  is_primary: boolean;
  label: string;
  active: boolean;
  call_tracking_enabled: boolean;
  call_tracking_provider: string | null;
  call_tracking_number: string | null;
}

export interface PhoneResolverResult {
  phone_number: string;
  display_number: string;
  area_code: string;
  is_toll_free: boolean;
  match_type: 'exact_area_code' | 'toll_free_fallback';
}

const TOLL_FREE_CODES = new Set(['800', '888', '877', '866', '855', '844', '833']);

const EMPTY_RESULT: PhoneResolverResult = {
  phone_number: '',
  display_number: '',
  area_code: '',
  is_toll_free: false,
  match_type: 'toll_free_fallback',
};

// PHASE 2 — CALL TRACKING (NOT YET IMPLEMENTED)
// When call_tracking_enabled = true on a number,
// display the call_tracking_number instead of
// phone_number. The tracking number forwards to
// the real number via Twilio or CallRail.
// This allows per-city call analytics.
// Do not implement this logic yet.

/**
 * Returns true if the area code is a toll-free code
 * (800, 888, 877, 866, 855, 844, 833).
 * Used during client setup validation.
 */
export function isTollFreeAreaCode(areaCode: string): boolean {
  return TOLL_FREE_CODES.has(areaCode);
}

/**
 * Formats a phone number for display.
 * Input: +12145550100 or 2145550100
 * Output: (214) 555-0100
 */
export function formatPhoneDisplay(phoneNumber: string): string {
  try {
    if (!phoneNumber) return '';
    const digits = phoneNumber.replace(/\D/g, '');
    const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (ten.length !== 10) return phoneNumber;
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  } catch {
    return phoneNumber;
  }
}

/**
 * Resolves the best phone number for a visitor using two-layer matching:
 *   Layer 1 — Exact area code match (local number)
 *   Layer 2 — Toll-free fallback
 */
export function resolvePhoneNumber(
  clientNumbers: PhoneNumber[],
  visitorAreaCode: string
): PhoneResolverResult {
  try {
    const activeNumbers = clientNumbers.filter((n) => n.active);
    if (activeNumbers.length === 0) return { ...EMPTY_RESULT };

    // Layer 1 — Exact area code match (skip if no visitor area code)
    if (visitorAreaCode) {
      const localMatch = activeNumbers.find(
        (n) => !n.is_toll_free && n.area_code === visitorAreaCode
      );
      if (localMatch) {
        return {
          phone_number: localMatch.phone_number,
          display_number: formatPhoneDisplay(localMatch.phone_number),
          area_code: localMatch.area_code,
          is_toll_free: false,
          match_type: 'exact_area_code',
        };
      }
    }

    // Layer 2 — Toll-free fallback
    const tollFreeNumbers = activeNumbers.filter((n) => n.is_toll_free);
    if (tollFreeNumbers.length === 0) return { ...EMPTY_RESULT };

    const pick = tollFreeNumbers.find((n) => n.is_primary) ?? tollFreeNumbers[0];
    return {
      phone_number: pick.phone_number,
      display_number: formatPhoneDisplay(pick.phone_number),
      area_code: pick.area_code,
      is_toll_free: true,
      match_type: 'toll_free_fallback',
    };
  } catch {
    return { ...EMPTY_RESULT };
  }
}
