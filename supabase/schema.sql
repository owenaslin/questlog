-- Users profile table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Adventurer',
  avatar_url TEXT,
  xp_total INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quests table
CREATE TABLE public.quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main', 'side')),
  source TEXT NOT NULL CHECK (source IN ('predefined', 'user', 'ai')),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  xp_reward INTEGER NOT NULL,
  duration_label TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Quests: everyone can read available/predefined quests
CREATE POLICY "Anyone can view available quests" ON public.quests
  FOR SELECT USING (
    source = 'predefined'
    OR user_id = auth.uid()
  );

-- Quests: authenticated users can insert their own quests
CREATE POLICY "Users can create quests" ON public.quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quests: users can update their own quests
CREATE POLICY "Users can update own quests" ON public.quests
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Adventurer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HABITS SYSTEM
-- ============================================

-- Habits table: recurring daily/weekly activities
CREATE TABLE public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '✓',
  color TEXT NOT NULL DEFAULT '#e8b864',
  -- Recurrence pattern
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekdays', 'interval', 'weekly')),
  recurrence_data JSONB NOT NULL DEFAULT '{}',
  -- XP reward (smaller than quests, 5-25)
  xp_reward INTEGER NOT NULL DEFAULT 10 CHECK (xp_reward >= 5 AND xp_reward <= 25),
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habit completions: check-in history
CREATE TABLE public.habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  completion_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habit streaks: current + longest streak per habit
CREATE TABLE public.habit_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for habits system
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_user_active ON public.habits(user_id, is_active);
CREATE INDEX idx_habit_completions_habit_id ON public.habit_completions(habit_id);
CREATE INDEX idx_habit_completions_user_date ON public.habit_completions(user_id, completion_date);
CREATE INDEX idx_habit_streaks_habit_id ON public.habit_streaks(habit_id);

-- RLS Policies for habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_streaks ENABLE ROW LEVEL SECURITY;

-- Habits: users can CRUD their own habits
CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create habits" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- Completions: users can CRUD their own completions
CREATE POLICY "Users can view own completions" ON public.habit_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create completions" ON public.habit_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.habit_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Streaks: users can view/update their own streaks
CREATE POLICY "Users can view own streaks" ON public.habit_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.habit_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to auto-create streak record when habit is created
CREATE OR REPLACE FUNCTION public.handle_new_habit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.habit_streaks (habit_id, user_id)
  VALUES (NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_habit_created
  AFTER INSERT ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_habit();

-- Function to update habit streak on completion
CREATE OR REPLACE FUNCTION public.update_habit_streak()
RETURNS trigger AS $$
DECLARE
  v_streak_record RECORD;
  v_previous_date DATE;
  v_expected_date DATE;
  v_recurrence_type TEXT;
BEGIN
  -- Get the streak record for this habit
  SELECT * INTO v_streak_record
  FROM public.habit_streaks
  WHERE habit_id = NEW.habit_id AND user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    -- Create streak record if missing
    INSERT INTO public.habit_streaks (habit_id, user_id, current_streak, longest_streak, last_completed_date)
    VALUES (NEW.habit_id, NEW.user_id, 1, 1, NEW.completion_date);
    RETURN NEW;
  END IF;
  
  v_previous_date := v_streak_record.last_completed_date;
  
  IF v_previous_date IS NULL THEN
    -- First completion ever
    UPDATE public.habit_streaks
    SET current_streak = 1, longest_streak = 1, last_completed_date = NEW.completion_date, updated_at = now()
    WHERE id = v_streak_record.id;
  ELSIF v_previous_date = NEW.completion_date THEN
    -- Same day completion, don't increment streak (shouldn't happen due to unique constraint)
    NULL;
  ELSIF v_previous_date = NEW.completion_date - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    UPDATE public.habit_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_completed_date = NEW.completion_date,
        updated_at = now()
    WHERE id = v_streak_record.id;
  ELSE
    -- Streak broken, reset to 1
    UPDATE public.habit_streaks
    SET current_streak = 1, last_completed_date = NEW.completion_date, updated_at = now()
    WHERE id = v_streak_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_habit_completion
  AFTER INSERT ON public.habit_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_habit_streak();

-- Unique constraint: one completion per habit per day
CREATE UNIQUE INDEX idx_unique_daily_completion 
  ON public.habit_completions(habit_id, completion_date);

-- Function to award XP on habit completion
CREATE OR REPLACE FUNCTION public.award_habit_xp()
RETURNS trigger AS $$
BEGIN
  -- Update user's total XP
  UPDATE public.profiles
  SET xp_total = xp_total + NEW.xp_awarded,
      level = GREATEST(1, FLOOR(SQRT((xp_total + NEW.xp_awarded) / 100)::INTEGER) + 1)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_habit_completion_xp
  AFTER INSERT ON public.habit_completions
  FOR EACH ROW EXECUTE FUNCTION public.award_habit_xp();
