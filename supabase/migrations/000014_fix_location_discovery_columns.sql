-- ============================================
-- FIX: Add missing columns to quest_discoveries table
-- ============================================

-- Check if columns exist before adding (idempotent)
DO $$
BEGIN
  -- Add discovery_location_lat if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quest_discoveries' 
    AND column_name = 'discovery_location_lat'
  ) THEN
    ALTER TABLE public.quest_discoveries ADD COLUMN discovery_location_lat DECIMAL(10,8);
  END IF;

  -- Add discovery_location_lng if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quest_discoveries' 
    AND column_name = 'discovery_location_lng'
  ) THEN
    ALTER TABLE public.quest_discoveries ADD COLUMN discovery_location_lng DECIMAL(11,8);
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_lat ON public.quest_discoveries (discovery_location_lat);
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_lng ON public.quest_discoveries (discovery_location_lng);
