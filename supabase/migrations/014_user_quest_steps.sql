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
  p_quest_type TEXT DEFAULT NULL,
  p_quest_category TEXT DEFAULT NULL
)
RETURNS TABLE(
  applied BOOLEAN,
  already_completed BOOLEAN,
  applied_xp INTEGER,
  next_xp INTEGER,
  next_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_step_id UUID;
  v_existing_step_xp INTEGER;
  v_calculated_step_xp INTEGER := 0;
  v_quest_xp INTEGER;
  v_steps JSONB;
  v_required_count INTEGER;
  v_required_index INTEGER;
  v_remainder INTEGER;
  v_next_xp INTEGER;
  v_next_level INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to complete quest step for this user.' USING ERRCODE = '42501';
  END IF;

  IF p_step_id IS NULL OR btrim(p_step_id) = '' THEN
    RAISE EXCEPTION 'Step id is required.' USING ERRCODE = '22023';
  END IF;

  SELECT q.xp_reward, q.steps
  INTO v_quest_xp, v_steps
  FROM public.quests q
  WHERE q.id = p_quest_id;

  IF v_quest_xp IS NULL THEN
    RAISE EXCEPTION 'Quest steps can only be persisted for quests stored in database.' USING ERRCODE = '22023';
  END IF;

  IF v_steps IS NULL OR jsonb_typeof(v_steps) <> 'array' OR jsonb_array_length(v_steps) = 0 THEN
    RAISE EXCEPTION 'Quest has no persisted step definitions.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_steps) AS s(step)
    WHERE s.step ->> 'id' = p_step_id
  ) THEN
    RAISE EXCEPTION 'Step does not belong to this quest.' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*)
  INTO v_required_count
  FROM jsonb_array_elements(v_steps) AS s(step)
  WHERE COALESCE((s.step ->> 'optional')::BOOLEAN, false) = false;

  IF v_required_count < 1 THEN
    v_calculated_step_xp := 0;
  ELSE
    SELECT req.required_index
    INTO v_required_index
    FROM (
      SELECT
        s.step ->> 'id' AS step_id,
        ROW_NUMBER() OVER (ORDER BY s.ord) AS required_index
      FROM jsonb_array_elements(v_steps) WITH ORDINALITY AS s(step, ord)
      WHERE COALESCE((s.step ->> 'optional')::BOOLEAN, false) = false
    ) AS req
    WHERE req.step_id = p_step_id;

    IF v_required_index IS NULL THEN
      v_calculated_step_xp := 0;
    ELSE
      v_remainder := MOD(v_quest_xp, v_required_count);
      v_calculated_step_xp := FLOOR(v_quest_xp::NUMERIC / v_required_count)::INTEGER
        + CASE WHEN v_required_index <= v_remainder THEN 1 ELSE 0 END;
    END IF;
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
    v_calculated_step_xp
  )
  ON CONFLICT (user_id, quest_id, step_id)
  DO NOTHING
  RETURNING id INTO v_inserted_step_id;

  IF v_inserted_step_id IS NULL THEN
    SELECT uqs.xp_awarded
    INTO v_existing_step_xp
    FROM public.user_quest_steps uqs
    WHERE uqs.user_id = p_user_id
      AND uqs.quest_id = p_quest_id
      AND uqs.step_id = p_step_id;

    RETURN QUERY SELECT false, true, COALESCE(v_existing_step_xp, 0), NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    xp_total = COALESCE(xp_total, 0) + v_calculated_step_xp,
    level = FLOOR((COALESCE(xp_total, 0) + v_calculated_step_xp) / 500) + 1
  WHERE id = p_user_id
  RETURNING xp_total, level INTO v_next_xp, v_next_level;

  IF v_next_xp IS NULL THEN
    RETURN QUERY SELECT false, false, v_calculated_step_xp, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, false, v_calculated_step_xp, v_next_xp, v_next_level;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_quest_step_atomic(UUID, UUID, TEXT, TEXT, TEXT)
TO authenticated;
