-- ============================================
-- STREAK TRACKING + WEEKLY RECAP
-- ============================================

-- User streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly recap tracking
CREATE TABLE IF NOT EXISTS public.weekly_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  quests_completed INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  categories JSONB DEFAULT '[]'::jsonb,
  UNIQUE(user_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_activity_user_week ON public.weekly_activity(user_id, week_start);

-- RLS policies
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own weekly activity" ON public.weekly_activity
  FOR SELECT USING (auth.uid() = user_id);

-- Function to update streak on quest completion
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID, p_completion_date DATE)
RETURNS TABLE(
  new_streak INTEGER,
  streak_broken BOOLEAN,
  is_new_longest BOOLEAN
) AS $$
DECLARE
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_activity DATE;
  v_days_diff INTEGER;
  v_is_new_longest BOOLEAN := false;
  v_streak_broken BOOLEAN := false;
BEGIN
  -- Get existing streak data
  SELECT 
    current_streak, 
    longest_streak, 
    last_activity_date 
  INTO v_current_streak, v_longest_streak, v_last_activity
  FROM public.user_streaks
  WHERE user_id = p_user_id;
  
  -- No existing record - create with streak = 1
  IF v_current_streak IS NULL THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, streak_started_at)
    VALUES (p_user_id, 1, 1, p_completion_date, now());
    
    RETURN QUERY SELECT 1, false, true;
    RETURN;
  END IF;
  
  -- Calculate days since last activity
  v_days_diff := p_completion_date - v_last_activity;
  
  -- Same day - no streak change
  IF v_days_diff = 0 THEN
    RETURN QUERY SELECT v_current_streak, false, false;
    RETURN;
  END IF;
  
  -- Consecutive day - increment streak
  IF v_days_diff = 1 THEN
    v_current_streak := v_current_streak + 1;
    v_streak_broken := false;
    
    -- Check if new longest streak
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
      v_is_new_longest := true;
    END IF;
  -- Gap of more than 1 day - streak broken, reset to 1
  ELSE
    v_current_streak := 1;
    v_streak_broken := true;
    v_is_new_longest := false;
  END IF;
  
  -- Update streak record
  UPDATE public.user_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = p_completion_date,
    updated_at = now(),
    streak_started_at = CASE WHEN v_streak_broken THEN now() ELSE streak_started_at END
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT v_current_streak, v_streak_broken, v_is_new_longest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update weekly activity
CREATE OR REPLACE FUNCTION public.update_weekly_activity(p_user_id UUID, p_xp INTEGER, p_category TEXT)
RETURNS void AS $$
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_existing_categories JSONB;
BEGIN
  -- Try to update existing weekly record
  UPDATE public.weekly_activity
  SET 
    quests_completed = quests_completed + 1,
    xp_earned = xp_earned + p_xp,
    categories = CASE 
      WHEN categories @> to_jsonb(p_category) THEN categories
      ELSE categories || to_jsonb(p_category)
    END
  WHERE user_id = p_user_id AND week_start = v_week_start;
  
  -- If no rows updated, insert new record
  IF NOT FOUND THEN
    INSERT INTO public.weekly_activity (user_id, week_start, quests_completed, xp_earned, categories)
    VALUES (p_user_id, v_week_start, 1, p_xp, to_jsonb(ARRAY[p_category]));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update streaks and weekly activity on quest completion
CREATE OR REPLACE FUNCTION public.on_quest_completion_tracking()
RETURNS trigger AS $$
DECLARE
  v_category TEXT;
BEGIN
  -- Only process if quest was just completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get quest category
    SELECT category INTO v_category
    FROM public.quests
    WHERE id = NEW.quest_id;
    
    -- Update streak
    PERFORM public.update_user_streak(NEW.user_id, CURRENT_DATE);
    
    -- Update weekly activity (will need quest XP from the quests table)
    -- This is simplified - full implementation would join with quests table
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Apply this trigger after the quest table has the proper structure
-- CREATE TRIGGER trg_quest_completion_tracking
--   AFTER UPDATE OF status ON public.user_quests
--   FOR EACH ROW
--   EXECUTE FUNCTION public.on_quest_completion_tracking();
