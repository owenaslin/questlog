-- Daily Adventure Loop foundation: stable daily plans and recommendation preferences.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_available_time_minutes INTEGER NOT NULL DEFAULT 30 CHECK (default_available_time_minutes IN (15, 30, 60, 240)),
  ADD COLUMN IF NOT EXISTS default_energy_level TEXT NOT NULL DEFAULT 'normal' CHECK (default_energy_level IN ('low', 'normal', 'high')),
  ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS discovery_preferences TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS home_location_label TEXT;

CREATE TABLE IF NOT EXISTS public.daily_adventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  adventure_date DATE NOT NULL,
  main_quest_id TEXT,
  side_quest_id TEXT,
  generated_prompt TEXT NOT NULL,
  reflection_answer TEXT,
  side_quest_rerolls_used INTEGER NOT NULL DEFAULT 0 CHECK (side_quest_rerolls_used >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, adventure_date)
);

ALTER TABLE public.daily_adventures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily adventures" ON public.daily_adventures;
CREATE POLICY "Users can view own daily adventures"
  ON public.daily_adventures FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily adventures" ON public.daily_adventures;
CREATE POLICY "Users can insert own daily adventures"
  ON public.daily_adventures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily adventures" ON public.daily_adventures;
CREATE POLICY "Users can update own daily adventures"
  ON public.daily_adventures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_adventures_user_date ON public.daily_adventures(user_id, adventure_date DESC);

CREATE OR REPLACE FUNCTION public.update_daily_adventures_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_adventures_set_updated_at ON public.daily_adventures;
CREATE TRIGGER daily_adventures_set_updated_at
  BEFORE UPDATE ON public.daily_adventures
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_adventures_timestamp();
