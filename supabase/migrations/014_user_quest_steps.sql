-- ============================================
-- USER QUEST STEPS + ATOMIC STEP XP AWARD
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_quest_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_user_quest_steps_user_quest
  ON public.user_quest_steps(user_id, quest_id);

CREATE INDEX IF NOT EXISTS idx_user_quest_steps_user_completed
  ON public.user_quest_steps(user_id, completed_at DESC);

ALTER TABLE public.user_quest_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quest step progress" ON public.user_quest_steps;
CREATE POLICY "Users can view own quest step progress" ON public.user_quest_steps
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quest step progress" ON public.user_quest_steps;
CREATE POLICY "Users can insert own quest step progress" ON public.user_quest_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quest step progress" ON public.user_quest_steps;
CREATE POLICY "Users can update own quest step progress" ON public.user_quest_steps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.complete_quest_step_atomic(
  p_user_id UUID,
  p_quest_id UUID,
  p_step_id TEXT,
  p_step_xp INTEGER,
  p_quest_type TEXT DEFAULT NULL,
  p_quest_category TEXT DEFAULT NULL
)
RETURNS TABLE(
  applied BOOLEAN,
  already_completed BOOLEAN,
  next_xp INTEGER,
  next_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_step_id UUID;
  v_next_xp INTEGER;
  v_next_level INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to complete quest step for this user.' USING ERRCODE = '42501';
  END IF;

  IF p_step_xp < 0 THEN
    RAISE EXCEPTION 'Step XP reward must be non-negative.' USING ERRCODE = '22023';
  END IF;

  IF p_step_id IS NULL OR btrim(p_step_id) = '' THEN
    RAISE EXCEPTION 'Step id is required.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_quests (
    user_id,
    quest_id,
    quest_type,
    quest_category,
    status,
    accepted_at
  ) VALUES (
    p_user_id,
    p_quest_id,
    p_quest_type,
    p_quest_category,
    'active',
    now()
  )
  ON CONFLICT (user_id, quest_id)
  DO UPDATE
    SET
      quest_type = COALESCE(public.user_quests.quest_type, EXCLUDED.quest_type),
      quest_category = COALESCE(public.user_quests.quest_category, EXCLUDED.quest_category),
      status = CASE
        WHEN public.user_quests.status = 'completed' THEN public.user_quests.status
        ELSE 'active'
      END,
      accepted_at = COALESCE(public.user_quests.accepted_at, EXCLUDED.accepted_at);

  INSERT INTO public.user_quest_steps (
    user_id,
    quest_id,
    step_id,
    xp_awarded
  ) VALUES (
    p_user_id,
    p_quest_id,
    p_step_id,
    p_step_xp
  )
  ON CONFLICT (user_id, quest_id, step_id)
  DO NOTHING
  RETURNING id INTO v_inserted_step_id;

  IF v_inserted_step_id IS NULL THEN
    RETURN QUERY SELECT false, true, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    xp_total = COALESCE(xp_total, 0) + p_step_xp,
    level = FLOOR((COALESCE(xp_total, 0) + p_step_xp) / 500) + 1
  WHERE id = p_user_id
  RETURNING xp_total, level INTO v_next_xp, v_next_level;

  IF v_next_xp IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, false, v_next_xp, v_next_level;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_quest_step_atomic(UUID, UUID, TEXT, INTEGER, TEXT, TEXT)
TO authenticated;
