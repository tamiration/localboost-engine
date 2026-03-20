/**
 * Phone Number Resolver for LocalAds System
 * Two-layer matching: exact area code → toll-free fallback
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const AU_CODES: Record<string, string> = {
  'new south wales': '02',
  'australian capital territory': '02',
  'victoria': '03',
  'tasmania': '03',
  'queensland': '07',
  'western australia': '08',
  'south australia': '08',
  'northern territory': '08',
};

/**
 * Resolves the area code for a city/state/country.
 * AU: hardcoded state map (8 entries).
 * US: two-layer DB lookup — exact city match → state fallback.
 * Never throws — returns '' on any error.
 */
export async function getAreaCode(
  city: string,
  state: string,
  country: 'US' | 'AU',
  supabase: SupabaseClient
): Promise<string> {
  try {
    if (country === 'AU') {
      return AU_CODES[state.toLowerCase().trim()] ?? '';
    }

    // US — Layer 1: exact city match
    const { data: cityData } = await supabase
      .from('us_area_codes')
      .select('area_code')
      .ilike('city', city.trim())
      .ilike('state', state.trim())
      .limit(1)
      .maybeSingle();

    if (cityData?.area_code) return cityData.area_code;

    // US — Layer 2: state fallback
    const { data: stateData } = await supabase
      .from('us_state_area_codes')
      .select('area_code')
      .eq('state', state.toLowerCase().trim())
      .maybeSingle();

    if (stateData?.area_code) return stateData.area_code;

    // Layer 3: empty fallback
    return '';
  } catch {
    return '';
  }
}

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
