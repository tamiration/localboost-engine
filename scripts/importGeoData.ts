import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// CONFIG
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BATCH_SIZE = 500;
const DATA_DIR = resolve(__dirname, 'data');

// ============================================================
// STATE ABBREVIATION MAPS
// ============================================================

const US_STATE_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
  'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
  'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
};

const AU_STATE_ABBR: Record<string, string> = {
  'New South Wales': 'NSW', 'Victoria': 'VIC', 'Queensland': 'QLD',
  'Western Australia': 'WA', 'South Australia': 'SA', 'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT', 'Northern Territory': 'NT',
};

const AU_AREA_CODES: Record<string, string> = {
  'new south wales': '02', 'australian capital territory': '02',
  'victoria': '03', 'tasmania': '03',
  'queensland': '07', 'western australia': '08',
  'south australia': '08', 'northern territory': '08',
};

function getStateAbbr(state: string, country: string): string {
  const trimmed = state.trim();
  if (country === 'AU') return AU_STATE_ABBR[trimmed] ?? '';
  return US_STATE_ABBR[trimmed] ?? '';
}

// ============================================================
// STEP 1 — PARSE AREA CODE CSV
// ============================================================

interface AreaCodeRow {
  city: string;
  state: string;
  area_code: string;
}

function parseAreaCodes(): {
  cityRecords: AreaCodeRow[];
  usCityCodes: Map<string, string>;
  usStatePrimary: Map<string, string>;
} {
  console.log('\n=== STEP 1: Parsing us-area-codes.csv ===');
  const raw = readFileSync(resolve(DATA_DIR, 'us-area-codes.csv'), 'utf-8');
  const rows: string[][] = parse(raw, { relax_column_count: true });

  const usCityCodes = new Map<string, string>();
  const cityRecords: AreaCodeRow[] = [];
  const stateCodeCounts = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (row.length < 4) continue;
    const [areaCode, city, state, country] = row.map((s) => s.trim());
    if (country !== 'US') continue;

    const key = `${city.toLowerCase()}|${state.toLowerCase()}`;

    // Track ALL rows for state frequency counting
    const sl = state.toLowerCase();
    if (!stateCodeCounts.has(sl)) stateCodeCounts.set(sl, new Map());
    const counts = stateCodeCounts.get(sl)!;
    counts.set(areaCode, (counts.get(areaCode) ?? 0) + 1);

    // For city records and city lookup: first occurrence only
    if (!usCityCodes.has(key)) {
      usCityCodes.set(key, areaCode);
      cityRecords.push({ city, state, area_code: areaCode });
    }
  }

  // Build state primary codes (most frequent area code per state)
  const usStatePrimary = new Map<string, string>();
  for (const [state, counts] of stateCodeCounts) {
    let bestCode = '';
    let bestCount = 0;
    for (const [code, count] of counts) {
      if (count > bestCount) {
        bestCode = code;
        bestCount = count;
      }
    }
    usStatePrimary.set(state, bestCode);
  }

  console.log(`  City records: ${cityRecords.length}`);
  console.log(`  State primary codes: ${usStatePrimary.size}`);
  return { cityRecords, usCityCodes, usStatePrimary };
}

// ============================================================
// AREA CODE RESOLVER (used during Google/Bing import)
// ============================================================

function getAreaCode(
  city: string,
  state: string,
  country: string,
  usCityCodes: Map<string, string>,
  usStatePrimary: Map<string, string>
): string {
  if (country === 'AU') {
    return AU_AREA_CODES[state.toLowerCase().trim()] ?? '';
  }
  const key = `${city.toLowerCase().trim()}|${state.toLowerCase().trim()}`;
  const cityCode = usCityCodes.get(key);
  if (cityCode) return cityCode;
  return usStatePrimary.get(state.toLowerCase().trim()) ?? '';
}

// ============================================================
// STEP 2 — PARSE GOOGLE CSV
// ============================================================

interface GoogleRecord {
  criteria_id: string;
  city: string;
  state: string;
  state_abbr: string;
  country: string;
  area_code: string;
}

function parseGoogle(
  usCityCodes: Map<string, string>,
  usStatePrimary: Map<string, string>
): GoogleRecord[] {
  console.log('\n=== STEP 2: Parsing google-geotargets.csv ===');
  const raw = readFileSync(resolve(DATA_DIR, 'google-geotargets.csv'), 'utf-8');
  const rows: string[][] = parse(raw, { relax_column_count: true });

  const records: GoogleRecord[] = [];
  let skippedHeader = false;

  for (const row of rows) {
    if (!skippedHeader) { skippedHeader = true; continue; }
    if (row.length < 7) continue;

    const [criteriaId, , canonicalName, , countryCode, targetType, status] =
      row.map((s) => s.trim());

    if (status !== 'Active') continue;
    if (targetType !== 'City') continue;
    if (countryCode !== 'US' && countryCode !== 'AU') continue;

    // Parse canonical name: "City, State, Country"
    const parts = canonicalName.split(',').map((s) => s.trim());
    if (parts.length < 2) continue;
    const city = parts[0];
    const state = parts[1];

    records.push({
      criteria_id: criteriaId,
      city,
      state,
      state_abbr: getStateAbbr(state, countryCode),
      country: countryCode,
      area_code: getAreaCode(city, state, countryCode, usCityCodes, usStatePrimary),
    });
  }

  console.log(`  Google records: ${records.length}`);
  return records;
}

// ============================================================
// STEP 3 — PARSE BING CSV
// ============================================================

interface BingRecord {
  location_id: string;
  city: string;
  state: string;
  state_abbr: string;
  country: string;
  area_code: string;
  google_criteria_id: string;
}

function parseBing(
  usCityCodes: Map<string, string>,
  usStatePrimary: Map<string, string>
): BingRecord[] {
  console.log('\n=== STEP 3: Parsing bing-geolocations.csv ===');
  const raw = readFileSync(resolve(DATA_DIR, 'bing-geolocations.csv'), 'utf-8');
  const rows: string[][] = parse(raw, { relax_column_count: true });

  const records: BingRecord[] = [];
  let skippedHeader = false;

  for (const row of rows) {
    if (!skippedHeader) { skippedHeader = true; continue; }
    if (row.length < 6) continue;

    const [locationId, displayName, locationType, , status, adWordsId] =
      row.map((s) => s.trim());

    if (status !== 'Active') continue;
    if (locationType !== 'City') continue;
    if (!displayName.includes('United States') && !displayName.includes('Australia')) continue;

    // Bing Display Name uses comma-separated: "City, State, Country"
    // Some entries may also use pipe: "City|State|Country"
    const separator = displayName.includes('|') ? '|' : ',';
    const parts = displayName.split(separator).map((s) => s.trim());
    if (parts.length < 3) continue;

    const city = parts[0];
    const state = parts[1];
    const countryStr = parts[parts.length - 1];

    let country: string;
    if (countryStr === 'United States' || countryStr.includes('United States')) {
      country = 'US';
    } else if (countryStr === 'Australia' || countryStr.includes('Australia')) {
      country = 'AU';
    } else {
      continue;
    }

    records.push({
      location_id: locationId,
      city,
      state,
      state_abbr: getStateAbbr(state, country),
      country,
      area_code: getAreaCode(city, state, country, usCityCodes, usStatePrimary),
      google_criteria_id: adWordsId ?? '',
    });
  }

  console.log(`  Bing records: ${records.length}`);
  return records;
}

// ============================================================
// STEP 5 — BATCH UPSERT TO SUPABASE
// ============================================================

async function batchUpsert<T extends Record<string, unknown>>(
  table: string,
  records: T[],
  conflictColumn: string
): Promise<void> {
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  let imported = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Importing ${table} batch ${batchNum}/${totalBatches}...\r`);

    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false });

    if (error) {
      console.error(`\n  Error in ${table} batch ${batchNum}:`, error.message);
      throw error;
    }
    imported += batch.length;
  }

  console.log(`  ${table}: ${imported} rows imported                    `);
}

/**
 * For us_area_codes: the unique constraint is on LOWER(city)+LOWER(state)
 * which can't be used with JS client upsert. Use delete-then-insert approach.
 */
async function batchInsertAreaCodes(records: AreaCodeRow[]): Promise<void> {
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  let imported = 0;

  // Clear existing data first (safe since we're repopulating)
  const { error: deleteError } = await supabase
    .from('us_area_codes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('  Error clearing us_area_codes:', deleteError.message);
    throw deleteError;
  }

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Importing us_area_codes batch ${batchNum}/${totalBatches}...\r`);

    const { error } = await supabase.from('us_area_codes').insert(batch);

    if (error) {
      console.error(`\n  Error in us_area_codes batch ${batchNum}:`, error.message);
      throw error;
    }
    imported += batch.length;
  }

  console.log(`  us_area_codes: ${imported} rows imported                    `);
}

// ============================================================
// STEP 6 — VERIFY
// ============================================================

async function verify(): Promise<void> {
  console.log('\n=== STEP 6: Verification ===');
  let allPass = true;

  const check = async (label: string, query: Promise<{ count: number | null }>) => {
    const { count } = await query;
    console.log(`  ${label}: ${count}`);
    return count;
  };

  const countQ = (table: string, filter?: { col: string; val: string }) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = q.eq(filter.col, filter.val);
    return q;
  };

  await check('google_geo_lookup total', countQ('google_geo_lookup'));
  await check('google_geo_lookup US', countQ('google_geo_lookup', { col: 'country', val: 'US' }));
  await check('google_geo_lookup AU', countQ('google_geo_lookup', { col: 'country', val: 'AU' }));
  await check('bing_geo_lookup total', countQ('bing_geo_lookup'));
  await check('bing_geo_lookup US', countQ('bing_geo_lookup', { col: 'country', val: 'US' }));
  await check('bing_geo_lookup AU', countQ('bing_geo_lookup', { col: 'country', val: 'AU' }));
  await check('us_area_codes total', countQ('us_area_codes'));
  await check('us_state_area_codes total', countQ('us_state_area_codes'));

  // Spot checks
  const spotCheck = async (
    label: string,
    table: string,
    filter: Record<string, string>,
    expected: Record<string, string>
  ) => {
    let q = supabase.from(table).select('*');
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { data, error } = await q.limit(1).maybeSingle();

    if (error || !data) {
      console.log(`  ${label}: FAIL (not found)`);
      allPass = false;
      return;
    }

    const mismatches: string[] = [];
    for (const [k, v] of Object.entries(expected)) {
      if ((data as Record<string, unknown>)[k] !== v) {
        mismatches.push(`${k}: expected '${v}', got '${(data as Record<string, unknown>)[k]}'`);
      }
    }

    if (mismatches.length > 0) {
      console.log(`  ${label}: FAIL (${mismatches.join(', ')})`);
      allPass = false;
    } else {
      console.log(`  ${label}: PASS`);
    }
  };

  await spotCheck(
    'Google NY 1023191',
    'google_geo_lookup',
    { criteria_id: '1023191' },
    { city: 'New York', state: 'New York', state_abbr: 'NY', country: 'US' }
  );
  await spotCheck(
    'Google Sydney 1000286',
    'google_geo_lookup',
    { criteria_id: '1000286' },
    { city: 'Sydney', state: 'New South Wales', state_abbr: 'NSW', country: 'AU' }
  );
  await spotCheck(
    'Bing Dallas 65300',
    'bing_geo_lookup',
    { location_id: '65300' },
    { city: 'Dallas', state: 'Texas', state_abbr: 'TX', country: 'US' }
  );
  await spotCheck(
    'Bing Melbourne 112413',
    'bing_geo_lookup',
    { location_id: '112413' },
    { city: 'Melbourne', state: 'Victoria', state_abbr: 'VIC', country: 'AU' }
  );
  await spotCheck(
    'US area code Dallas',
    'us_area_codes',
    { city: 'Dallas', state: 'Texas' },
    { area_code: '214' }
  );
  await spotCheck(
    'US state code Texas',
    'us_state_area_codes',
    { state: 'texas' },
    { area_code: '214' }
  );

  console.log(`\n${allPass ? '✅ All verification checks PASSED' : '❌ Some checks FAILED'}`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log('LocalAds Geo Data Import');
  console.log('========================');

  // Step 1
  const { cityRecords, usCityCodes, usStatePrimary } = parseAreaCodes();

  // Step 2
  const googleRecords = parseGoogle(usCityCodes, usStatePrimary);

  // Step 3
  const bingRecords = parseBing(usCityCodes, usStatePrimary);

  // Step 4 — build state area code records
  console.log('\n=== STEP 4: Building area code table records ===');
  const stateRecords = Array.from(usStatePrimary.entries()).map(([state, area_code]) => ({
    state,
    area_code,
  }));
  console.log(`  us_area_codes records: ${cityRecords.length}`);
  console.log(`  us_state_area_codes records: ${stateRecords.length}`);

  // Step 5 — import to Supabase
  console.log('\n=== STEP 5: Importing to Supabase ===');
  await batchUpsert('us_area_codes', cityRecords, 'id');
  await batchUpsert('us_state_area_codes', stateRecords, 'state');
  await batchUpsert('google_geo_lookup', googleRecords, 'criteria_id');
  await batchUpsert('bing_geo_lookup', bingRecords, 'location_id');

  // Step 6
  await verify();

  console.log('\nImport complete.');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
