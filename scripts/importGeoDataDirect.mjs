/**
 * Direct geo data import from pre-processed CSVs.
 * CSVs already have: criteria_id/location_id, city, state, state_abbr, country, area_code
 *
 * Usage:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/importGeoDataDirect.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BATCH_SIZE = 500;
const DATA_DIR = resolve(__dirname, 'data');

function parseCSV(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

async function batchUpsert(table, records, conflictColumn) {
  const total = records.length;
  const totalBatches = Math.ceil(total / BATCH_SIZE);
  let imported = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  [${table}] batch ${batchNum}/${totalBatches} (${imported}/${total})\r`);

    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false });

    if (error) {
      console.error(`\n  Error in ${table} batch ${batchNum}:`, error.message);
      throw error;
    }
    imported += batch.length;
  }
  console.log(`  [${table}] done — ${imported} rows                              `);
}

async function main() {
  console.log('=== Geo Data Direct Import ===\n');

  // --- Google ---
  console.log('Parsing google-geotargets.csv...');
  const googleRows = parseCSV(resolve(DATA_DIR, 'google-geotargets.csv'));
  const googleRecords = googleRows
    .filter(r => r.criteria_id && r.city && (r.country === 'US' || r.country === 'AU'))
    .map(r => ({
      criteria_id: parseInt(r.criteria_id, 10),
      city: r.city,
      state: r.state,
      state_abbr: r.state_abbr,
      country: r.country,
      area_code: r.area_code || '',
    }));
  console.log(`  ${googleRecords.length} records (US + AU)`);

  // --- Bing ---
  console.log('Parsing bing-geolocations.csv...');
  const bingRows = parseCSV(resolve(DATA_DIR, 'bing-geolocations.csv'));
  const bingRecords = bingRows
    .filter(r => r.location_id && r.city && (r.country === 'US' || r.country === 'AU'))
    .map(r => ({
      location_id: r.location_id,
      city: r.city,
      state: r.state,
      state_abbr: r.state_abbr || '',
      country: r.country,
      area_code: r.area_code || '',
      google_criteria_id: r.adwords_location_id || '',
    }));
  console.log(`  ${bingRecords.length} records (US + AU)`);

  // --- Import ---
  console.log('\nImporting to Supabase...');
  await batchUpsert('google_geo_lookup', googleRecords, 'criteria_id');
  await batchUpsert('bing_geo_lookup', bingRecords, 'location_id');

  // --- Verify ---
  console.log('\nVerifying...');
  const { count: gCount } = await supabase.from('google_geo_lookup').select('*', { count: 'exact', head: true });
  const { count: bCount } = await supabase.from('bing_geo_lookup').select('*', { count: 'exact', head: true });
  console.log(`  google_geo_lookup: ${gCount} rows`);
  console.log(`  bing_geo_lookup:   ${bCount} rows`);

  // Spot check: LA = 1012873
  const { data: la } = await supabase.from('google_geo_lookup').select('city,state,state_abbr').eq('criteria_id', 1012873).maybeSingle();
  console.log(`  criteria_id 1012873: ${la ? `${la.city}, ${la.state_abbr}` : 'NOT FOUND'}`);

  console.log('\nImport complete.');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
