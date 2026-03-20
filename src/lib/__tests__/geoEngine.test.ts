import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAreaCode, isTollFreeAreaCode } from '@/lib/areaCodes';
import {
  readUrlParams,
  detectAdPlatform,
  lookupByGoogleId,
  lookupByBingId,
  lookupByAdGroupName,
  resolveLocation,
  injectDynamicContent,
  logVisit,
  type UrlParams,
  type GeoResult,
  type ClientConfig,
} from '@/lib/geoEngine';
import { logUnknownGeoId } from '@/lib/geoLogger';

// ============================================================
// Mock Supabase Client
// ============================================================

const GOOGLE_DALLAS = { city: 'Dallas', state: 'Texas', state_abbr: 'TX', country: 'US', area_code: '214' };
const GOOGLE_SYDNEY = { city: 'Sydney', state: 'New South Wales', state_abbr: 'NSW', country: 'AU', area_code: '02' };
const BING_DALLAS = { city: 'Dallas', state: 'Texas', state_abbr: 'TX', country: 'US', area_code: '214' };
const BING_MELBOURNE = { city: 'Melbourne', state: 'Victoria', state_abbr: 'VIC', country: 'AU', area_code: '03' };
const GOOGLE_HOUSTON = { city: 'Houston', state: 'Texas', state_abbr: 'TX', country: 'US', area_code: '713' };

function createMockChain(finalData: Record<string, unknown> | null, shouldThrow = false) {
  const chain: Record<string, unknown> = {};
  const terminalPromise = shouldThrow
    ? Promise.resolve({ data: null, error: { message: 'Mock error' } })
    : Promise.resolve({ data: finalData, error: null });

  // For maybeSingle at the end
  chain.maybeSingle = vi.fn(() => terminalPromise);
  chain.single = vi.fn(() => terminalPromise);
  chain.limit = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.update = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);

  return chain;
}

function createMockSupabase(options?: { throwOnTable?: string }): SupabaseClient {
  const fromFn = vi.fn((table: string) => {
    if (options?.throwOnTable === table) {
      return createMockChain(null, true);
    }

    if (table === 'google_geo_lookup') {
      const chain = createMockChain(null);
      chain.eq = vi.fn((col: string, val: string) => {
        if (col === 'criteria_id') {
          if (val === '1026339') return createMockChain(GOOGLE_DALLAS);
          if (val === '1000286') return createMockChain(GOOGLE_SYDNEY);
        }
        if (col === 'country') {
          // For adgroup lookups — return chain that has maybeSingle
          return chain;
        }
        return createMockChain(null);
      });
      chain.ilike = vi.fn((col: string, val: string) => {
        if (col === 'city' && val.toLowerCase().trim() === 'houston') {
          // Return a chain where .eq('country', 'US') returns Houston
          const countryChain = createMockChain(null);
          countryChain.eq = vi.fn((c: string, v: string) => {
            if (c === 'country' && v === 'US') return createMockChain(GOOGLE_HOUSTON);
            return createMockChain(null);
          });
          return countryChain;
        }
        // For unknown cities
        const fallbackChain = createMockChain(null);
        fallbackChain.eq = vi.fn(() => createMockChain(null));
        return fallbackChain;
      });
      return chain;
    }

    if (table === 'bing_geo_lookup') {
      const chain = createMockChain(null);
      chain.eq = vi.fn((col: string, val: string) => {
        if (col === 'location_id') {
          if (val === '65300') return createMockChain(BING_DALLAS);
          if (val === '112413') return createMockChain(BING_MELBOURNE);
        }
        return createMockChain(null);
      });
      chain.ilike = vi.fn(() => {
        const fallbackChain = createMockChain(null);
        fallbackChain.eq = vi.fn(() => createMockChain(null));
        return fallbackChain;
      });
      return chain;
    }

    if (table === 'us_area_codes') {
      const chain = createMockChain(null);
      // Track ilike calls to determine city+state
      let matchedCity = '';
      chain.ilike = vi.fn((_col: string, val: string) => {
        matchedCity = val.toLowerCase().trim();
        const innerChain = createMockChain(null);
        innerChain.ilike = vi.fn((_c: string, stateVal: string) => {
          const st = stateVal.toLowerCase().trim();
          if (matchedCity === 'dallas' && st === 'texas') {
            return createMockChain({ area_code: '214' });
          }
          return createMockChain(null);
        });
        return innerChain;
      });
      return chain;
    }

    if (table === 'us_state_area_codes') {
      const chain = createMockChain(null);
      chain.eq = vi.fn((_col: string, val: string) => {
        if (val === 'texas') return createMockChain({ area_code: '214' });
        return createMockChain(null);
      });
      return chain;
    }

    if (table === 'analytics') {
      return createMockChain(null);
    }

    if (table === 'landing_pages') {
      return createMockChain(null);
    }

    return createMockChain(null);
  });

  const rpcFn = vi.fn(() => Promise.resolve({ data: null, error: null }));

  return { from: fromFn, rpc: rpcFn } as unknown as SupabaseClient;
}

function emptyParams(): UrlParams {
  return {
    loc_interest_ms: '', loc_physical_ms: '',
    gclid: '', wbraid: '', gbraid: '', msclkid: '',
    utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '',
    keyword: '', campaign: '', adgroup: '',
    device: '', network: '', matchtype: '', creative: '', adposition: '',
  };
}

const BASE_URL = 'https://ads.example.com/';

function makeClientConfig(overrides?: Partial<ClientConfig>): ClientConfig {
  return {
    default_city: 'Austin',
    default_state: 'Texas',
    default_area_code: '512',
    use_adgroup_as_city: false,
    country: 'US',
    ...overrides,
  };
}

// ============================================================
// TEST GROUP 1: areaCodes.ts
// ============================================================

describe('getAreaCode', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('AU - returns state-based code for NSW', async () => {
    expect(await getAreaCode('Sydney', 'New South Wales', 'AU', supabase)).toBe('02');
  });

  it('AU - returns state-based code for VIC', async () => {
    expect(await getAreaCode('Melbourne', 'Victoria', 'AU', supabase)).toBe('03');
  });

  it('AU - returns state-based code for QLD', async () => {
    expect(await getAreaCode('Brisbane', 'Queensland', 'AU', supabase)).toBe('07');
  });

  it('AU - returns state-based code for WA', async () => {
    expect(await getAreaCode('Perth', 'Western Australia', 'AU', supabase)).toBe('08');
  });

  it('AU - returns state-based code for ACT', async () => {
    expect(await getAreaCode('Canberra', 'Australian Capital Territory', 'AU', supabase)).toBe('02');
  });

  it('AU - unknown state returns empty string', async () => {
    expect(await getAreaCode('Unknown', 'Unknown State', 'AU', supabase)).toBe('');
  });

  it('US - exact city match returns code', async () => {
    expect(await getAreaCode('Dallas', 'Texas', 'US', supabase)).toBe('214');
  });

  it('US - unknown city falls back to state', async () => {
    expect(await getAreaCode('Tiny Town', 'Texas', 'US', supabase)).toBe('214');
  });

  it('US - unknown city AND state returns empty', async () => {
    expect(await getAreaCode('Unknown', 'Unknown State', 'US', supabase)).toBe('');
  });

  it('returns empty on Supabase error', async () => {
    const errorSupabase = createMockSupabase({ throwOnTable: 'us_area_codes' });
    expect(await getAreaCode('Dallas', 'Texas', 'US', errorSupabase)).toBe('');
  });
});

describe('isTollFreeAreaCode', () => {
  it('US 800 → true', () => expect(isTollFreeAreaCode('800', 'US')).toBe(true));
  it('US 888 → true', () => expect(isTollFreeAreaCode('888', 'US')).toBe(true));
  it('US 877 → true', () => expect(isTollFreeAreaCode('877', 'US')).toBe(true));
  it('US 866 → true', () => expect(isTollFreeAreaCode('866', 'US')).toBe(true));
  it('US 855 → true', () => expect(isTollFreeAreaCode('855', 'US')).toBe(true));
  it('US 844 → true', () => expect(isTollFreeAreaCode('844', 'US')).toBe(true));
  it('US 833 → true', () => expect(isTollFreeAreaCode('833', 'US')).toBe(true));
  it('US 214 → false', () => expect(isTollFreeAreaCode('214', 'US')).toBe(false));
  it('US 212 → false', () => expect(isTollFreeAreaCode('212', 'US')).toBe(false));
  it('AU 1800 → true', () => expect(isTollFreeAreaCode('1800', 'AU')).toBe(true));
  it('AU 1300 → true', () => expect(isTollFreeAreaCode('1300', 'AU')).toBe(true));
  it('AU 02 → false', () => expect(isTollFreeAreaCode('02', 'AU')).toBe(false));
  it('AU 03 → false', () => expect(isTollFreeAreaCode('03', 'AU')).toBe(false));
  it('empty string → false', () => expect(isTollFreeAreaCode('', 'US')).toBe(false));
});

// ============================================================
// TEST GROUP 2: readUrlParams()
// ============================================================

describe('readUrlParams', () => {
  it('reads Google click ID correctly', () => {
    const p = readUrlParams(BASE_URL + '?gclid=Cj0KCQjw');
    expect(p.gclid).toBe('Cj0KCQjw');
    expect(p.msclkid).toBe('');
  });

  it('reads Bing click ID correctly', () => {
    const p = readUrlParams(BASE_URL + '?msclkid=abc123def456');
    expect(p.msclkid).toBe('abc123def456');
    expect(p.gclid).toBe('');
  });

  it('reads wbraid correctly', () => {
    const p = readUrlParams(BASE_URL + '?wbraid=WKgCij-iOS');
    expect(p.wbraid).toBe('WKgCij-iOS');
  });

  it('reads gbraid correctly', () => {
    const p = readUrlParams(BASE_URL + '?gbraid=0AAAAADn7ij');
    expect(p.gbraid).toBe('0AAAAADn7ij');
  });

  it('reads loc_interest_ms correctly', () => {
    const p = readUrlParams(BASE_URL + '?loc_interest_ms=1026339&gclid=abc');
    expect(p.loc_interest_ms).toBe('1026339');
  });

  it('reads loc_physical_ms correctly', () => {
    const p = readUrlParams(BASE_URL + '?loc_physical_ms=1026339&gclid=abc');
    expect(p.loc_physical_ms).toBe('1026339');
  });

  it('reads all UTM parameters', () => {
    const p = readUrlParams(BASE_URL + '?utm_source=google&utm_medium=cpc&utm_campaign=garage-door&utm_term=repair&utm_content=dallas-ag');
    expect(p.utm_source).toBe('google');
    expect(p.utm_medium).toBe('cpc');
    expect(p.utm_campaign).toBe('garage-door');
    expect(p.utm_term).toBe('repair');
    expect(p.utm_content).toBe('dallas-ag');
  });

  it('reads keyword, campaign, adgroup', () => {
    const p = readUrlParams(BASE_URL + '?keyword=garage+door+repair&campaign=gd-texas&adgroup=Dallas');
    expect(p.keyword).toBe('garage door repair');
    expect(p.campaign).toBe('gd-texas');
    expect(p.adgroup).toBe('Dallas');
  });

  it('keyword falls back to utm_term', () => {
    const p = readUrlParams(BASE_URL + '?utm_term=chimney+sweep&gclid=abc');
    expect(p.keyword).toBe('chimney sweep');
  });

  it('adgroup falls back to utm_content', () => {
    const p = readUrlParams(BASE_URL + '?utm_content=dallas-spring&gclid=abc');
    expect(p.adgroup).toBe('dallas-spring');
  });

  it('keyword NOT overridden when present', () => {
    const p = readUrlParams(BASE_URL + '?keyword=garage+door&utm_term=other+term&gclid=abc');
    expect(p.keyword).toBe('garage door');
  });

  it('reads device parameter', () => {
    const p = readUrlParams(BASE_URL + '?device=m&gclid=abc');
    expect(p.device).toBe('m');
  });

  it('returns empty string for all missing params', () => {
    const p = readUrlParams(BASE_URL + '?gclid=abc');
    expect(p.loc_interest_ms).toBe('');
    expect(p.loc_physical_ms).toBe('');
    expect(p.wbraid).toBe('');
    expect(p.gbraid).toBe('');
    expect(p.msclkid).toBe('');
    expect(p.utm_source).toBe('');
    expect(p.keyword).toBe('');
  });

  it('handles URL with no params gracefully', () => {
    const p = readUrlParams(BASE_URL);
    expect(p.gclid).toBe('');
    expect(p.msclkid).toBe('');
    expect(p.keyword).toBe('');
  });
});

// ============================================================
// TEST GROUP 3: detectAdPlatform()
// ============================================================

describe('detectAdPlatform', () => {
  it('gclid → google', () => {
    expect(detectAdPlatform({ ...emptyParams(), gclid: 'abc123' })).toBe('google');
  });

  it('wbraid → google', () => {
    expect(detectAdPlatform({ ...emptyParams(), wbraid: 'WKgC123' })).toBe('google');
  });

  it('gbraid → google', () => {
    expect(detectAdPlatform({ ...emptyParams(), gbraid: '0AAAA123' })).toBe('google');
  });

  it('msclkid → bing', () => {
    expect(detectAdPlatform({ ...emptyParams(), msclkid: 'abc123' })).toBe('bing');
  });

  it('utm_source=google → google', () => {
    expect(detectAdPlatform({ ...emptyParams(), utm_source: 'google' })).toBe('google');
  });

  it('utm_source=GOOGLE → google (case insensitive)', () => {
    expect(detectAdPlatform({ ...emptyParams(), utm_source: 'GOOGLE' })).toBe('google');
  });

  it('utm_source=Google → google (mixed case)', () => {
    expect(detectAdPlatform({ ...emptyParams(), utm_source: 'Google' })).toBe('google');
  });

  it('utm_source=bing → bing', () => {
    expect(detectAdPlatform({ ...emptyParams(), utm_source: 'bing' })).toBe('bing');
  });

  it('utm_source=microsoft → bing', () => {
    expect(detectAdPlatform({ ...emptyParams(), utm_source: 'microsoft' })).toBe('bing');
  });

  it('no signals → direct', () => {
    expect(detectAdPlatform(emptyParams())).toBe('direct');
  });

  it('gclid takes priority over utm_source=bing', () => {
    expect(detectAdPlatform({ ...emptyParams(), gclid: 'abc', utm_source: 'bing' })).toBe('google');
  });

  it('wbraid takes priority over msclkid', () => {
    expect(detectAdPlatform({ ...emptyParams(), wbraid: 'abc', msclkid: 'def' })).toBe('google');
  });

  it('utm_source=google takes priority over msclkid', () => {
    expect(detectAdPlatform({ ...emptyParams(), utm_source: 'google', msclkid: 'abc' })).toBe('google');
  });
});

// ============================================================
// TEST GROUP 4: Lookup Functions
// ============================================================

describe('lookupByGoogleId', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('returns GeoEntry for known US city', async () => {
    const result = await lookupByGoogleId('1026339', supabase);
    expect(result).toEqual({ city: 'Dallas', state: 'Texas', state_abbr: 'TX', country: 'US', area_code: '214' });
  });

  it('returns GeoEntry for known AU city', async () => {
    const result = await lookupByGoogleId('1000286', supabase);
    expect(result).toEqual({ city: 'Sydney', state: 'New South Wales', state_abbr: 'NSW', country: 'AU', area_code: '02' });
  });

  it('returns null for unknown ID', async () => {
    expect(await lookupByGoogleId('9999999', supabase)).toBeNull();
  });

  it('returns null on Supabase error', async () => {
    const errSb = createMockSupabase({ throwOnTable: 'google_geo_lookup' });
    expect(await lookupByGoogleId('1026339', errSb)).toBeNull();
  });
});

describe('lookupByBingId', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('returns GeoEntry for known US city', async () => {
    const result = await lookupByBingId('65300', supabase);
    expect(result).toEqual({ city: 'Dallas', state: 'Texas', state_abbr: 'TX', country: 'US', area_code: '214' });
  });

  it('returns GeoEntry for known AU city', async () => {
    const result = await lookupByBingId('112413', supabase);
    expect(result).toEqual({ city: 'Melbourne', state: 'Victoria', state_abbr: 'VIC', country: 'AU', area_code: '03' });
  });

  it('returns null for unknown ID', async () => {
    expect(await lookupByBingId('9999999', supabase)).toBeNull();
  });

  it('returns null on Supabase error', async () => {
    const errSb = createMockSupabase({ throwOnTable: 'bing_geo_lookup' });
    expect(await lookupByBingId('65300', errSb)).toBeNull();
  });
});

describe('lookupByAdGroupName', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('finds city by exact adgroup name - google', async () => {
    const result = await lookupByAdGroupName('Houston', 'google', 'US', supabase);
    expect(result).toEqual({ city: 'Houston', state: 'Texas', state_abbr: 'TX', country: 'US', area_code: '713' });
  });

  it('case insensitive match', async () => {
    const result = await lookupByAdGroupName('HOUSTON', 'google', 'US', supabase);
    expect(result).toEqual(expect.objectContaining({ city: 'Houston' }));
  });

  it('whitespace trimmed', async () => {
    const result = await lookupByAdGroupName('  Houston  ', 'google', 'US', supabase);
    expect(result).toEqual(expect.objectContaining({ city: 'Houston' }));
  });

  it('returns null for no match', async () => {
    expect(await lookupByAdGroupName('NotACity', 'google', 'US', supabase)).toBeNull();
  });

  it('direct platform tries google first', async () => {
    const result = await lookupByAdGroupName('Houston', 'direct', 'US', supabase);
    expect(result).toEqual(expect.objectContaining({ city: 'Houston' }));
  });

  it('returns null on Supabase error', async () => {
    const errSb = createMockSupabase({ throwOnTable: 'google_geo_lookup' });
    expect(await lookupByAdGroupName('Houston', 'google', 'US', errSb)).toBeNull();
  });
});

// ============================================================
// TEST GROUP 5: resolveLocation()
// ============================================================

describe('resolveLocation - Layer 1', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('resolves via loc_interest_ms - Google', async () => {
    const result = await resolveLocation(
      BASE_URL + '?loc_interest_ms=1026339&gclid=abc',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.city).toBe('Dallas');
    expect(result.state).toBe('Texas');
    expect(result.state_abbr).toBe('TX');
    expect(result.area_code).toBe('214');
    expect(result.adPlatform).toBe('google');
    expect(result.resolutionSource).toBe('location_interest');
  });

  it('resolves via loc_interest_ms - Bing', async () => {
    const result = await resolveLocation(
      BASE_URL + '?loc_interest_ms=65300&msclkid=abc',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.city).toBe('Dallas');
    expect(result.resolutionSource).toBe('location_interest');
    expect(result.adPlatform).toBe('bing');
  });

  it('resolves AU city - Google', async () => {
    const result = await resolveLocation(
      BASE_URL + '?loc_interest_ms=1000286&gclid=abc',
      makeClientConfig({ country: 'AU' }),
      [],
      supabase
    );
    expect(result.city).toBe('Sydney');
    expect(result.state_abbr).toBe('NSW');
    expect(result.area_code).toBe('02');
  });
});

describe('resolveLocation - Layer 2', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('falls to Layer 2 when Layer 1 unknown ID', async () => {
    const result = await resolveLocation(
      BASE_URL + '?loc_interest_ms=9999999&loc_physical_ms=1026339&gclid=abc',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.city).toBe('Dallas');
    expect(result.resolutionSource).toBe('physical_location');
  });

  it('logs unknown geo ID from Layer 1', async () => {
    await resolveLocation(
      BASE_URL + '?loc_interest_ms=9999999&gclid=abc',
      makeClientConfig(),
      [],
      supabase
    );
    // logUnknownGeoId is fire-and-forget, verify rpc was called
    expect(supabase.rpc).toHaveBeenCalled();
  });
});

describe('resolveLocation - Layer 2.5', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('resolves via adgroup when enabled', async () => {
    const result = await resolveLocation(
      BASE_URL + '?adgroup=Houston&gclid=abc',
      makeClientConfig({ use_adgroup_as_city: true }),
      [],
      supabase
    );
    expect(result.city).toBe('Houston');
    expect(result.resolutionSource).toBe('adgroup_name');
  });

  it('returns no_location when adgroup enabled but no city match', async () => {
    const result = await resolveLocation(
      BASE_URL + '?adgroup=NotACity&gclid=abc',
      makeClientConfig({ use_adgroup_as_city: true }),
      [],
      supabase
    );
    expect(result.resolutionSource).toBe('no_location');
    expect(result.city).toBeNull();
  });

  it('skips Layer 2.5 when disabled', async () => {
    const result = await resolveLocation(
      BASE_URL + '?adgroup=Houston&gclid=abc',
      makeClientConfig({ use_adgroup_as_city: false }),
      [],
      supabase
    );
    expect(result.resolutionSource).toBe('company_default');
  });
});

describe('resolveLocation - Layer 3', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('returns company default when all layers fail', async () => {
    const result = await resolveLocation(
      BASE_URL + '?gclid=abc',
      makeClientConfig({ default_city: 'Austin', default_state: 'Texas', default_area_code: '512' }),
      [],
      supabase
    );
    expect(result.city).toBe('Austin');
    expect(result.state).toBe('Texas');
    expect(result.area_code).toBe('512');
    expect(result.resolutionSource).toBe('company_default');
  });

  it('returns company_default for direct traffic with no location signals', async () => {
    const result = await resolveLocation(
      BASE_URL + '?utm_medium=email',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.resolutionSource).toBe('company_default');
  });
});

describe('resolveLocation - result completeness', () => {
  let supabase: SupabaseClient;
  beforeEach(() => { supabase = createMockSupabase(); });

  it('keyword included in result', async () => {
    const result = await resolveLocation(
      BASE_URL + '?loc_interest_ms=1026339&gclid=abc&keyword=garage+door+repair',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.keyword).toBe('garage door repair');
  });

  it('campaign included in result', async () => {
    const result = await resolveLocation(
      BASE_URL + '?campaign=gd-dallas&gclid=abc&loc_interest_ms=1026339',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.campaign).toBe('gd-dallas');
  });

  it('device included in result', async () => {
    const result = await resolveLocation(
      BASE_URL + '?device=m&gclid=abc&loc_interest_ms=1026339',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.device).toBe('m');
  });

  it('adPlatform included in result', async () => {
    const result = await resolveLocation(
      BASE_URL + '?gclid=abc&loc_interest_ms=1026339',
      makeClientConfig(),
      [],
      supabase
    );
    expect(result.adPlatform).toBe('google');
  });
});

// ============================================================
// TEST GROUP 6: injectDynamicContent()
// ============================================================

describe('injectDynamicContent', () => {
  const mockGeoResult: GeoResult = {
    city: 'Dallas',
    state: 'Texas',
    state_abbr: 'TX',
    area_code: '214',
    keyword: 'garage door repair',
    adgroup: 'spring-repair',
    campaign: 'gd-texas',
    device: 'mobile',
    network: 's',
    matchtype: 'e',
    adPlatform: 'google',
    resolutionSource: 'location_interest',
    resolvedPhone: '(214) 555-0100',
    phoneMatchType: 'exact_area_code',
    country: 'US',
  };

  it('replaces {city}', () => {
    expect(injectDynamicContent('Garage Door Repair in {city}', mockGeoResult)).toBe('Garage Door Repair in Dallas');
  });

  it('replaces {state}', () => {
    expect(injectDynamicContent('Serving {state}', mockGeoResult)).toBe('Serving Texas');
  });

  it('replaces {state_abbr}', () => {
    expect(injectDynamicContent('{city}, {state_abbr}', mockGeoResult)).toBe('Dallas, TX');
  });

  it('replaces {area_code}', () => {
    expect(injectDynamicContent('Call ({area_code}) today', mockGeoResult)).toBe('Call (214) today');
  });

  it('replaces {keyword}', () => {
    expect(injectDynamicContent('Search: {keyword}', mockGeoResult)).toBe('Search: garage door repair');
  });

  it('replaces {business_name} from extras', () => {
    expect(injectDynamicContent('Welcome to {business_name}', mockGeoResult, { business_name: 'DFW Pros' })).toBe('Welcome to DFW Pros');
  });

  it('replaces {phone} from extras', () => {
    expect(injectDynamicContent('Call {phone} now', mockGeoResult, { phone: '(214) 555-0100' })).toBe('Call (214) 555-0100 now');
  });

  it('replaces multiple variables in one string', () => {
    const result = injectDynamicContent('{service} in {city}, {state_abbr} — Call ({area_code})', mockGeoResult, { service: 'Garage Door' });
    expect(result).toBe('Garage Door in Dallas, TX — Call (214)');
  });

  it('replaces ALL occurrences not just first', () => {
    expect(injectDynamicContent('{city} is great. Visit {city} today.', mockGeoResult)).toBe('Dallas is great. Visit Dallas today.');
  });

  it('case insensitive — {CITY} works', () => {
    expect(injectDynamicContent('Welcome to {CITY}', mockGeoResult)).toBe('Welcome to Dallas');
  });

  it('missing variable → empty string not undefined', () => {
    expect(injectDynamicContent('Hello {nonexistent}', mockGeoResult)).toBe('Hello ');
  });

  it('null city → empty string in template', () => {
    const nullCityResult: GeoResult = { ...mockGeoResult, city: null };
    expect(injectDynamicContent('Repair in {city}', nullCityResult)).toBe('Repair in ');
  });

  it('does not mutate original template', () => {
    const original = 'Repair in {city}';
    injectDynamicContent(original, mockGeoResult);
    expect(original).toBe('Repair in {city}');
  });

  it('works on HTML strings', () => {
    expect(injectDynamicContent('<h1>Repair in <span>{city}</span></h1>', mockGeoResult)).toBe('<h1>Repair in <span>Dallas</span></h1>');
  });
});

// ============================================================
// TEST GROUP 7: logVisit()
// ============================================================

describe('logVisit', () => {
  const mockResult: GeoResult = {
    city: 'Dallas', state: 'Texas', state_abbr: 'TX',
    area_code: '214', country: 'US',
    keyword: 'garage door', adgroup: 'dallas-ag',
    campaign: 'gd-texas', device: 'mobile',
    network: 's', matchtype: 'e',
    adPlatform: 'google', resolutionSource: 'location_interest',
    resolvedPhone: '(214) 555-0100', phoneMatchType: 'exact_area_code',
  };

  it('inserts row to analytics table', async () => {
    const supabase = createMockSupabase();
    await logVisit('page-123', mockResult, supabase);
    expect(supabase.from).toHaveBeenCalledWith('analytics');
  });

  it('increments page_views on landing_pages via RPC', async () => {
    const supabase = createMockSupabase();
    await logVisit('page-123', mockResult, supabase);
    expect(supabase.rpc).toHaveBeenCalledWith('increment_page_views', { _landing_page_id: 'page-123' });
  });

  it('does not throw on Supabase error', async () => {
    const supabase = createMockSupabase({ throwOnTable: 'analytics' });
    await expect(logVisit('page-123', mockResult, supabase)).resolves.toBeUndefined();
  });
});

// ============================================================
// TEST GROUP 8: logUnknownGeoId()
// ============================================================

describe('logUnknownGeoId', () => {
  it('calls RPC with correct params', async () => {
    const supabase = createMockSupabase();
    await logUnknownGeoId('9999999', 'google', supabase);
    expect(supabase.rpc).toHaveBeenCalledWith('log_unknown_geo_id', { _geo_id: '9999999', _ad_platform: 'google' });
  });

  it('does not throw on Supabase error', async () => {
    const supabase = { rpc: vi.fn(() => { throw new Error('fail'); }) } as unknown as SupabaseClient;
    await expect(logUnknownGeoId('9999999', 'google', supabase)).resolves.toBeUndefined();
  });
});
