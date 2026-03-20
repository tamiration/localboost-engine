/**
 * Area Code Resolution for LocalAds System
 * US: two-layer Supabase lookup (city → state fallback)
 * AU: hardcoded state-based map (8 entries)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const AU_AREA_CODES: Record<string, string> = {
  'new south wales': '02',
  'australian capital territory': '02',
  'victoria': '03',
  'tasmania': '03',
  'queensland': '07',
  'western australia': '08',
  'south australia': '08',
  'northern territory': '08',
};

const US_TOLL_FREE = new Set(['800', '888', '877', '866', '855', '844', '833']);
const AU_TOLL_FREE = new Set(['1800', '1300']);

/**
 * Returns true if the area code is a toll-free code.
 * US: 800, 888, 877, 866, 855, 844, 833
 * AU: 1800, 1300
 */
export function isTollFreeAreaCode(areaCode: string, country: 'US' | 'AU'): boolean {
  if (country === 'AU') return AU_TOLL_FREE.has(areaCode);
  return US_TOLL_FREE.has(areaCode);
}

/**
 * Resolves the area code for a city/state/country.
 * AU: hardcoded state map — no DB query.
 * US: two-layer DB lookup — exact city → state fallback.
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
      return AU_AREA_CODES[state.toLowerCase().trim()] ?? '';
    }

    // US — Layer 1: exact city+state match
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
