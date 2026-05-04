-- ============================================
-- FIX GEO INDEXES: Replace separate lat/lng B-tree indexes
-- with PostGIS geography columns + single GiST index.
--
-- Keeps existing lat/lng columns intact (app code still
-- reads profiles.location_lat / location_lng). Old columns
-- can be dropped in a follow-up migration once the app
-- switches to the new geo column.
--
-- NOTE: Run VACUUM ANALYZE public.profiles; separately via
-- the Supabase SQL editor to reclaim dead tuple space.
-- VACUUM cannot run inside a transaction block.
-- ============================================

-- ── 1. Enable PostGIS (idempotent, safe on Supabase) ────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 2. profiles: add geography column + backfill ───────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_geo geography(POINT, 4326);

UPDATE public.profiles
SET location_geo = ST_SetSRID(
  ST_MakePoint(location_lng::double precision, location_lat::double precision),
  4326
)::geography
WHERE location_geo IS NULL
  AND location_lat IS NOT NULL
  AND location_lng IS NOT NULL;

-- Single GiST index replaces idx_profiles_location_lat + lng
CREATE INDEX IF NOT EXISTS idx_profiles_location_geo
  ON public.profiles USING GIST (location_geo);

-- Drop the obsolete separate B-tree indexes
DROP INDEX IF EXISTS idx_profiles_location_lat;
DROP INDEX IF EXISTS idx_profiles_location_lng;

-- ── 3. quest_discoveries: add geography column + backfill ──
ALTER TABLE public.quest_discoveries
  ADD COLUMN IF NOT EXISTS discovery_geo geography(POINT, 4326);

UPDATE public.quest_discoveries
SET discovery_geo = ST_SetSRID(
  ST_MakePoint(
    discovery_location_lng::double precision,
    discovery_location_lat::double precision
  ),
  4326
)::geography
WHERE discovery_geo IS NULL
  AND discovery_location_lat IS NOT NULL
  AND discovery_location_lng IS NOT NULL;

-- Single GiST index replaces idx_quest_discoveries_lat + lng
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_geo
  ON public.quest_discoveries USING GIST (discovery_geo);

-- Drop the obsolete separate B-tree indexes
DROP INDEX IF EXISTS idx_quest_discoveries_lat;
DROP INDEX IF EXISTS idx_quest_discoveries_lng;
