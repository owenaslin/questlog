-- ============================================
-- USER QUEST PROGRESS + XP PROGRESSION
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed')),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON public.user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_user_status ON public.user_quests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_quests_updated_at ON public.user_quests(updated_at DESC);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quest progress" ON public.user_quests;
CREATE POLICY "Users can view own quest progress" ON public.user_quests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quest progress" ON public.user_quests;
CREATE POLICY "Users can insert own quest progress" ON public.user_quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quest progress" ON public.user_quests;
CREATE POLICY "Users can update own quest progress" ON public.user_quests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_quests_updated ON public.user_quests;
CREATE TRIGGER on_user_quests_updated
  BEFORE UPDATE ON public.user_quests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
