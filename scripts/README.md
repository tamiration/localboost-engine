# LocalAds Geo Data Import

Run ONCE to populate all geo reference tables.

## Setup
1. Copy `.env.example` to `.env`
2. Fill `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (Supabase dashboard → Settings → API)
3. Create `scripts/data/` folder
4. Place three CSV files in `scripts/data/`:
   - `google-geotargets.csv`
   - `bing-geolocations.csv`
   - `us-area-codes.csv`
5. `npm install`
6. `npm run import`

## Expected Output
```
us_area_codes: ~1,874 rows imported
us_state_area_codes: 51 rows imported
google_geo_lookup: ~20,646 rows imported
bing_geo_lookup: ~25,292 rows imported
All verification checks: PASS
```

## Notes
- Safe to run multiple times (uses upsert)
- Takes ~3-5 minutes total
- Requires Node.js 18+
