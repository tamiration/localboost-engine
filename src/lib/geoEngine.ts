/**
 * Geolocation Engine — Part 1
 * URL parameter reading and ad platform detection.
 */

export interface UrlParams {
  loc_interest_ms: string;
  loc_physical_ms: string;
  gclid: string;
  wbraid: string;
  gbraid: string;
  msclkid: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  keyword: string;
  campaign: string;
  adgroup: string;
  device: string;
  network: string;
  matchtype: string;
  creative: string;
  adposition: string;
}

const URL_PARAM_KEYS: ReadonlyArray<keyof UrlParams> = [
  'loc_interest_ms', 'loc_physical_ms',
  'gclid', 'wbraid', 'gbraid', 'msclkid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'keyword', 'campaign', 'adgroup',
  'device', 'network', 'matchtype', 'creative', 'adposition',
];

/**
 * Reads all UrlParams fields from a URL query string.
 * Returns '' for any missing parameter.
 * Applies keyword/adgroup fallbacks from utm_term/utm_content.
 */
export function readUrlParams(url: string): UrlParams {
  const params: UrlParams = {
    loc_interest_ms: '', loc_physical_ms: '',
    gclid: '', wbraid: '', gbraid: '', msclkid: '',
    utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '',
    keyword: '', campaign: '', adgroup: '',
    device: '', network: '', matchtype: '', creative: '', adposition: '',
  };

  try {
    const searchParams = new URL(url).searchParams;
    for (const key of URL_PARAM_KEYS) {
      params[key] = searchParams.get(key) ?? '';
    }
  } catch {
    return params;
  }

  // Keyword fallback: utm_term → keyword
  if (params.keyword === '' && params.utm_term !== '') {
    params.keyword = params.utm_term;
  }

  // Adgroup fallback: utm_content → adgroup
  if (params.adgroup === '' && params.utm_content !== '') {
    params.adgroup = params.utm_content;
  }

  return params;
}

/**
 * Detects the ad platform from URL parameters.
 * Priority: Google (gclid/wbraid/gbraid/utm_source) → Bing (msclkid/utm_source) → direct.
 */
export function detectAdPlatform(
  params: UrlParams
): 'google' | 'bing' | 'direct' {
  // Google — check first
  if (params.gclid !== '') return 'google';
  if (params.wbraid !== '') return 'google';
  if (params.gbraid !== '') return 'google';
  if (params.utm_source.toLowerCase() === 'google') return 'google';

  // Bing — check second
  if (params.msclkid !== '') return 'bing';
  const src = params.utm_source.toLowerCase();
  if (src === 'bing' || src === 'microsoft') return 'bing';

  // Fallback
  return 'direct';
}

// =============================================
// Part 2 — Geo Lookup & Resolution
// =============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAreaCode } from '@/lib/areaCodes';
import { resolvePhoneNumber, type PhoneNumber } from '@/lib/phoneResolver';
import { logUnknownGeoId } from '@/lib/geoLogger';

export interface GeoEntry {
  city: string;
  state: string;
  state_abbr: string;
  country: 'US' | 'AU';
  area_code: string;
}

export interface ClientConfig {
  default_city: string;
  default_state: string;
  default_area_code: string;
  use_adgroup_as_city: boolean;
  country: 'US' | 'AU';
}

export interface GeoResult {
  city: string | null;
  state: string | null;
  state_abbr: string | null;
  area_code: string | null;
  country: 'US' | 'AU' | null;
  keyword: string;
  campaign: string;
  adgroup: string;
  device: string;
  network: string;
  matchtype: string;
  adPlatform: 'google' | 'bing' | 'direct';
  resolutionSource:
    | 'location_interest'
    | 'physical_location'
    | 'adgroup_name'
    | 'company_default'
    | 'unknown_geo_id'
    | 'no_location';
  resolvedPhone: string;
  phoneMatchType: string;
}

// ---- Lookup helpers (not exported) ----

export async function lookupByGoogleId(
  criteriaId: string,
  supabase: SupabaseClient
): Promise<GeoEntry | null> {
  try {
    const { data } = await supabase
      .from('google_geo_lookup')
      .select('city, state, state_abbr, country, area_code')
      .eq('criteria_id', criteriaId)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      city: data.city,
      state: data.state,
      state_abbr: data.state_abbr,
      country: data.country as 'US' | 'AU',
      area_code: data.area_code,
    };
  } catch {
    return null;
  }
}

export async function lookupByBingId(
  locationId: string,
  supabase: SupabaseClient
): Promise<GeoEntry | null> {
  try {
    const { data } = await supabase
      .from('bing_geo_lookup')
      .select('city, state, state_abbr, country, area_code')
      .eq('location_id', locationId)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      city: data.city,
      state: data.state,
      state_abbr: data.state_abbr,
      country: data.country as 'US' | 'AU',
      area_code: data.area_code,
    };
  } catch {
    return null;
  }
}

async function lookupByAdGroupName(
  adgroupName: string,
  platform: 'google' | 'bing' | 'direct',
  country: 'US' | 'AU',
  supabase: SupabaseClient
): Promise<GeoEntry | null> {
  const queryTable = async (table: 'google_geo_lookup' | 'bing_geo_lookup'): Promise<GeoEntry | null> => {
    try {
      const { data } = await supabase
        .from(table)
        .select('city, state, state_abbr, country, area_code')
        .ilike('city', adgroupName.trim())
        .eq('country', country)
        .limit(1)
        .maybeSingle();

      if (!data) return null;
      return {
        city: data.city,
        state: data.state,
        state_abbr: data.state_abbr,
        country: data.country as 'US' | 'AU',
        area_code: data.area_code,
      };
    } catch {
      return null;
    }
  };

  if (platform === 'google') return queryTable('google_geo_lookup');
  if (platform === 'bing') return queryTable('bing_geo_lookup');

  // direct — try google first, then bing
  const googleResult = await queryTable('google_geo_lookup');
  if (googleResult) return googleResult;
  return queryTable('bing_geo_lookup');
}

// logUnknownGeoId is now imported from @/lib/geoLogger

// ---- Geo ID lookup by platform ----

async function lookupGeoId(
  geoId: string,
  platform: 'google' | 'bing' | 'direct',
  supabase: SupabaseClient
): Promise<GeoEntry | null> {
  if (platform === 'google') return lookupByGoogleId(geoId, supabase);
  if (platform === 'bing') return lookupByBingId(geoId, supabase);

  // direct — try both
  const entry = await lookupByGoogleId(geoId, supabase);
  if (entry) return entry;
  return lookupByBingId(geoId, supabase);
}

// ---- Enrich area code if missing ----

async function enrichAreaCode(
  entry: GeoEntry,
  supabase: SupabaseClient
): Promise<GeoEntry> {
  if (entry.area_code === '') {
    const resolved = await getAreaCode(entry.city, entry.state, entry.country, supabase);
    return { ...entry, area_code: resolved };
  }
  return entry;
}

// ---- Build GeoResult from parts ----

function buildGeoResult(
  entry: GeoEntry | null,
  params: UrlParams,
  platform: 'google' | 'bing' | 'direct',
  source: GeoResult['resolutionSource'],
  phoneDisplay: string,
  phoneMatchType: string
): GeoResult {
  return {
    city: entry?.city ?? null,
    state: entry?.state ?? null,
    state_abbr: entry?.state_abbr ?? null,
    area_code: entry?.area_code ?? null,
    country: entry?.country ?? null,
    keyword: params.keyword,
    campaign: params.campaign,
    adgroup: params.adgroup,
    device: params.device,
    network: params.network,
    matchtype: params.matchtype,
    adPlatform: platform,
    resolutionSource: source,
    resolvedPhone: phoneDisplay,
    phoneMatchType: phoneMatchType,
  };
}

// =============================================
// Main resolution function
// =============================================

export async function resolveLocation(
  urlString: string,
  clientConfig: ClientConfig,
  clientNumbers: PhoneNumber[],
  supabase: SupabaseClient
): Promise<GeoResult> {
  try {
    // Step 1 — Read URL params
    const params = readUrlParams(urlString);

    // Step 2 — Detect platform
    const platform = detectAdPlatform(params);

    // Helper to finalise a result from a GeoEntry
    const finalise = (
      entry: GeoEntry,
      source: GeoResult['resolutionSource']
    ): GeoResult => {
      const phoneResult = resolvePhoneNumber(clientNumbers, entry.area_code);
      return buildGeoResult(entry, params, platform, source, phoneResult.display_number, phoneResult.match_type);
    };

    // Step 3 — Priority layers

    // Layer 1: Location Interest
    if (params.loc_interest_ms !== '') {
      const entry = await lookupGeoId(params.loc_interest_ms, platform, supabase);
      if (entry) {
        const enriched = await enrichAreaCode(entry, supabase);
        return finalise(enriched, 'location_interest');
      }
      logUnknownGeoId(params.loc_interest_ms, platform, supabase);
    }

    // Layer 2: Physical Location
    if (params.loc_physical_ms !== '') {
      const entry = await lookupGeoId(params.loc_physical_ms, platform, supabase);
      if (entry) {
        const enriched = await enrichAreaCode(entry, supabase);
        return finalise(enriched, 'physical_location');
      }
      logUnknownGeoId(params.loc_physical_ms, platform, supabase);
    }

    // Layer 2.5: Ad Group Name
    if (clientConfig.use_adgroup_as_city && params.adgroup !== '') {
      const entry = await lookupByAdGroupName(
        params.adgroup,
        platform,
        clientConfig.country,
        supabase
      );
      if (entry) {
        const enriched = await enrichAreaCode(entry, supabase);
        return finalise(enriched, 'adgroup_name');
      }
      // Adgroup mode on but no match — return no_location (do NOT fall through)
      console.warn(`[geoEngine] Adgroup lookup failed for: ${params.adgroup}`);
      const phoneResult = resolvePhoneNumber(clientNumbers, '');
      return buildGeoResult(null, params, platform, 'no_location', phoneResult.display_number, phoneResult.match_type);
    }

    // Layer 3: Company Default
    const defaultEntry: GeoEntry = {
      city: clientConfig.default_city,
      state: clientConfig.default_state,
      state_abbr: '',
      country: clientConfig.country,
      area_code: clientConfig.default_area_code,
    };
    return finalise(defaultEntry, 'company_default');
  } catch (err) {
    // Never crash — return a safe empty result
    console.error('[geoEngine] resolveLocation error:', err);
    const params = readUrlParams(urlString);
    const platform = detectAdPlatform(params);
    const phoneResult = resolvePhoneNumber(clientNumbers, '');
    return buildGeoResult(null, params, platform, 'no_location', phoneResult.display_number, phoneResult.match_type);
  }
}
