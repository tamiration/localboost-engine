/**
 * Backfills target_type (and parent_city where applicable) 
 * from the google-geotargets.csv into the google_geo_lookup table.
 */
import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CSV_PATH = join(__dirname, 'data', 'google-geotargets.csv');
const BATCH_SIZE = 500;

async function run() {
  console.log('Reading CSV...');
  const rl = createInterface({ input: createReadStream(CSV_PATH) });

  let headers = null;
  let batch = [];
  let total = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = line.split(',');
      continue;
    }

    const cols = line.split(',');
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = (cols[i] ?? '').trim());

    const targetType = row['target_type'] || 'City';

    // Only update rows where target_type differs from the default 'City'
    // (City is already the default, no need to update those)
    if (targetType === 'City') {
      skipped++;
      continue;
    }

    batch.push({
      criteria_id: parseInt(row['criteria_id'], 10),
      target_type: targetType,
    });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      total += batch.length;
      console.log(`Updated ${total} non-City rows...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(batch);
    total += batch.length;
  }

  console.log(`Done. Updated ${total} non-City rows. Skipped ${skipped} City rows (already default).`);
}

async function flushBatch(batch) {
  // Update each row individually since upsert needs all columns
  const promises = batch.map(({ criteria_id, target_type }) =>
    supabase
      .from('google_geo_lookup')
      .update({ target_type })
      .eq('criteria_id', criteria_id)
  );
  await Promise.all(promises);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
