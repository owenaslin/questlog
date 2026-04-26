-- ============================================
-- LOCATION DISCOVERY ENGINE SCHEMA
-- Privacy-First Location Handling
-- ============================================

-- Add location fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_city VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_coords POINT; -- lat, lng
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discovery_radius_km INTEGER DEFAULT 20 CHECK (discovery_radius_km >= 1 AND discovery_radius_km <= 100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(20) DEFAULT 'approximate' CHECK (privacy_level IN ('exact', 'approximate', 'city-only'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discovery_count_today INTEGER DEFAULT 0;

-- Discovery preferences (JSONB for flexibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discovery_preferences JSONB DEFAULT '{
  "preferred_categories": ["Outdoors", "Food", "Culture", "Fitness"],
  "avoid_chains": false,
  "prefer_high_rated": true,
  "max_discovery_cost_daily": 5
}'::jsonb;

-- Index for proximity queries (if using PostGIS, this would be a GEOGRAPHY index)
CREATE INDEX IF NOT EXISTS idx_profiles_location_coords ON public.profiles USING GIST (location_coords);
CREATE INDEX IF NOT EXISTS idx_profiles_location_city ON public.profiles (location_city);

-- Quest discoveries table - tracks AI-generated location quests
CREATE TABLE IF NOT EXISTS public.quest_discoveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  -- Source information
  provider_source VARCHAR(50) NOT NULL, -- 'google_places', 'alltrails', 'eventbrite', 'mock', etc.
  provider_place_id TEXT,
  -- Location data (normalized for privacy)
  discovery_location_city VARCHAR(100) NOT NULL,
  discovery_location_coords POINT,
  -- AI-generated narrative context
  narrative_context JSONB NOT NULL DEFAULT '{}',
  -- Caching metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  -- User interaction
  was_accepted BOOLEAN DEFAULT false,
  was_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for quest discoveries
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_user_id ON public.quest_discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_expires_at ON public.quest_discoveries(expires_at);
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_location ON public.quest_discoveries (discovery_location_city);
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_user_location ON public.quest_discoveries (user_id, discovery_location_city);

-- RLS Policies for quest_discoveries
ALTER TABLE public.quest_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discoveries" ON public.quest_discoveries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own discoveries" ON public.quest_discoveries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discoveries" ON public.quest_discoveries
  FOR DELETE USING (auth.uid() = user_id);

-- Function to reset daily discovery counts (run via cron or pg_cron)
CREATE OR REPLACE FUNCTION public.reset_daily_discovery_counts()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET discovery_count_today = 0,
      last_discovery_at = NULL
  WHERE last_discovery_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment discovery count with limit check
CREATE OR REPLACE FUNCTION public.check_and_increment_discovery_count(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_daily INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get user's max daily limit from preferences
  SELECT 
    COALESCE((discovery_preferences->>'max_discovery_cost_daily')::INTEGER, 5)
  INTO v_max_daily
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Get current count, reset if it's a new day
  SELECT 
    CASE 
      WHEN last_discovery_at < CURRENT_DATE THEN 0
      ELSE discovery_count_today
    END
  INTO v_current_count
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check if under limit
  IF v_current_count >= v_max_daily THEN
    RETURN false;
  END IF;
  
  -- Increment count
  UPDATE public.profiles
  SET discovery_count_today = v_current_count + 1,
      last_discovery_at = now()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-cleanup expired discoveries
CREATE OR REPLACE FUNCTION public.cleanup_expired_discoveries()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.quest_discoveries
  WHERE expires_at < now() - INTERVAL '7 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run cleanup periodically (could be scheduled via pg_cron or external cron)
-- CREATE TRIGGER cleanup_old_discoveries_trigger
--   AFTER INSERT ON public.quest_discoveries
--   EXECUTE FUNCTION public.cleanup_expired_discoveries();
