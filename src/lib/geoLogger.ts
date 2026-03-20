/**
 * Geo Logger — Unknown Geo ID Tracking
 * Logs unrecognised geo IDs to unknown_geo_ids table
 * so admins can expand lookup coverage over time.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Logs an unknown geo ID via the log_unknown_geo_id RPC.
 * On first encounter: inserts a new row.
 * On repeat: increments count and updates last_seen.
 *
 * Fire-and-forget — never awaited in the render path.
 * Never throws.
 */
export async function logUnknownGeoId(
  geoId: string,
  platform: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.rpc('log_unknown_geo_id', {
      _geo_id: geoId,
      _ad_platform: platform,
    });
  } catch {
    // Silently swallow — logging must never affect page load
    console.warn(`[geoLogger] Failed to log unknown geo ID: ${geoId}`);
  }
}
