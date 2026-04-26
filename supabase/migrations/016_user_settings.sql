-- User settings for app preferences and habit week tracking.

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_day INTEGER NOT NULL DEFAULT 0 CHECK (week_start_day >= 0 AND week_start_day <= 6),
  theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  notification_preferences JSONB NOT NULL DEFAULT '{"habit_reminders": true, "quest_alerts": true, "weekly_recap": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

CREATE OR REPLACE FUNCTION public.update_user_settings_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_settings_set_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_settings_timestamp();

CREATE OR REPLACE FUNCTION public.handle_new_profile_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_user_settings ON public.profiles;
CREATE TRIGGER on_profile_created_user_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_settings();

INSERT INTO public.user_settings (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.user_settings s ON s.user_id = p.id
WHERE s.user_id IS NULL;
