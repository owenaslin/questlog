-- ============================================
-- SERVER-AUTHORITATIVE XP ON COMPLETION (ZERO-DOWNTIME)
-- ============================================
-- Closes the H3 residual: complete_quest_atomic and update_weekly_activity
-- previously accepted XP as a client-supplied parameter, so an attacker
-- could call them directly via PostgREST and mint arbitrary XP without
-- ever touching /api/quests/save. Both functions now look the XP up from
-- public.quests.xp_reward, which the save route already writes
-- authoritatively (see /api/quests/save and the HMAC quest token).
--
-- ZERO-DOWNTIME STRATEGY (Option B):
-- The old 5-arg complete_quest_atomic(UUID, UUID, INTEGER, TEXT, TEXT) and
-- 3-arg update_weekly_activity(UUID, INTEGER, TEXT) are NOT dropped here.
-- Postgres resolves overloads by argument list, so the currently-deployed
-- production code continues to hit the old signatures while new code
-- targets the new signatures. Run migration 022 to drop the old signatures
-- once all deployments are confirmed on the new code.
-- ============================================

-- New 4-arg complete_quest_atomic: XP looked up server-side from quests.xp_reward.
-- Coexists with old 5-arg signature until 022 drops it.
CREATE FUNCTION public.complete_quest_atomic(
  p_user_id UUID,
  p_quest_id UUID,
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
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing_status TEXT;
  v_next_xp INTEGER;
  v_next_level INTEGER;
  v_award_xp INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to complete quest for this user.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(xp_reward, 0) INTO v_award_xp
  FROM public.quests
  WHERE id = p_quest_id;

  -- Quest not found: treat as 0 XP rather than erroring, so a missing quest
  -- row doesn't block the completion flow.
  IF v_award_xp IS NULL THEN
    v_award_xp := 0;
  END IF;

  SELECT status
  INTO v_existing_status
  FROM public.user_quests
  WHERE user_id = p_user_id
    AND quest_id = p_quest_id
  FOR UPDATE;

  IF v_existing_status = 'completed' THEN
    RETURN QUERY SELECT false, true, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_existing_status IS NULL THEN
    INSERT INTO public.user_quests (
      user_id,
      quest_id,
      quest_type,
      quest_category,
      status,
      accepted_at,
      completed_at
    ) VALUES (
      p_user_id,
      p_quest_id,
      p_quest_type,
      p_quest_category,
      'completed',
      now(),
      now()
    );
  ELSE
    UPDATE public.user_quests
    SET
      quest_type = COALESCE(quest_type, p_quest_type),
      quest_category = COALESCE(quest_category, p_quest_category),
      status = 'completed',
      accepted_at = COALESCE(accepted_at, now()),
      completed_at = now()
    WHERE user_id = p_user_id
      AND quest_id = p_quest_id;
  END IF;

  UPDATE public.profiles
  SET
    xp_total = COALESCE(xp_total, 0) + v_award_xp,
    level = FLOOR((COALESCE(xp_total, 0) + v_award_xp) / 500) + 1
  WHERE id = p_user_id
  RETURNING xp_total, level INTO v_next_xp, v_next_level;

  IF v_next_xp IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, false, v_next_xp, v_next_level;
END;
$$;

-- New 3-arg update_weekly_activity: second param is p_quest_id (UUID), not p_xp (INTEGER).
-- Coexists with old (UUID, INTEGER, TEXT) signature until 022 drops it.
CREATE FUNCTION public.update_weekly_activity(
  p_user_id UUID,
  p_quest_id UUID,
  p_category TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_award_xp INTEGER;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to update weekly activity for this user.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(xp_reward, 0) INTO v_award_xp
  FROM public.quests
  WHERE id = p_quest_id;

  IF v_award_xp IS NULL THEN
    v_award_xp := 0;
  END IF;

  UPDATE public.weekly_activity
  SET
    quests_completed = quests_completed + 1,
    xp_earned = xp_earned + v_award_xp,
    categories = CASE
      WHEN categories @> to_jsonb(p_category) THEN categories
      ELSE categories || to_jsonb(p_category)
    END
  WHERE user_id = p_user_id AND week_start = v_week_start;

  IF NOT FOUND THEN
    INSERT INTO public.weekly_activity (user_id, week_start, quests_completed, xp_earned, categories)
    VALUES (p_user_id, v_week_start, 1, v_award_xp, to_jsonb(ARRAY[p_category]));
  END IF;
END;
$$;

-- Grant execute on new signatures. Old signatures retain their existing grants.
REVOKE ALL ON FUNCTION public.complete_quest_atomic(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_weekly_activity(UUID, UUID, TEXT)      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.complete_quest_atomic(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_weekly_activity(UUID, UUID, TEXT)      TO authenticated;
