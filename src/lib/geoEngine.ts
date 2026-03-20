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
