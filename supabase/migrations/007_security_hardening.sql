-- ============================================
-- SECURITY HARDENING
-- ============================================

-- 1) Prevent public exposure of sensitive profile columns.
REVOKE SELECT (email) ON TABLE public.profiles FROM anon, authenticated;

-- Remove broad public table read access; public hero reads should use RPC.
DROP POLICY IF EXISTS "Public profiles are viewable by all" ON public.profiles;

-- 2) Public-safe profile lookup RPC.
CREATE OR REPLACE FUNCTION public.get_profile_by_handle(p_handle TEXT)
RETURNS TABLE (
  id             UUID,
  display_name   TEXT,
  handle         TEXT,
  avatar_sprite  TEXT,
  is_public      BOOLEAN,
  title          TEXT,
  xp_total       INTEGER,
  level          INTEGER,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    display_name,
    handle,
    avatar_sprite,
    is_public,
    title,
    xp_total,
    level,
    created_at
  FROM public.profiles
  WHERE handle = lower(trim(p_handle))
    AND is_public = true
  LIMIT 1;
$$;

-- 3) Handle availability RPC for authenticated users.
CREATE OR REPLACE FUNCTION public.is_handle_available(p_handle TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  v_normalized := lower(trim(p_handle));

  IF v_normalized = '' OR v_normalized !~ '^[a-z0-9][a-z0-9\-]{1,18}[a-z0-9]$' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.handle = v_normalized
      AND p.id <> auth.uid()
  );
END;
$$;

-- 4) Authorize user-targeted SECURITY DEFINER badge RPC.
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id UUID, badge_name TEXT) AS $$
DECLARE
  v_badge RECORD;
  v_requirement_met BOOLEAN;
  v_category_count INTEGER;
  v_total_quests INTEGER;
  v_questline_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to award badges for this user.' USING ERRCODE = '42501';
  END IF;

  FOR v_badge IN
    SELECT b.*
    FROM public.badges b
    WHERE b.id NOT IN (
      SELECT badge_id FROM public.user_badges WHERE user_id = p_user_id
    )
  LOOP
    v_requirement_met := false;

    CASE v_badge.requirement_type
      WHEN 'category_count' THEN
        SELECT COUNT(*) INTO v_category_count
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_category, q.category) = v_badge.requirement_category;
        v_requirement_met := v_category_count >= v_badge.requirement_value;

      WHEN 'total_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests
        WHERE user_id = p_user_id AND status = 'completed';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;

      WHEN 'questline_complete' THEN
        SELECT COUNT(*) INTO v_questline_count
        FROM public.user_questline_progress
        WHERE user_id = p_user_id AND is_completed = true;
        v_requirement_met := v_questline_count >= v_badge.requirement_value;

      WHEN 'level_reached' THEN
        SELECT (level >= v_badge.requirement_value) INTO v_requirement_met
        FROM public.profiles
        WHERE id = p_user_id;

      WHEN 'side_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_type, q.type) = 'side';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;

      WHEN 'main_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_type, q.type) = 'main';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;

      WHEN 'unique_categories' THEN
        SELECT COUNT(DISTINCT COALESCE(uq.quest_category, q.category)) INTO v_category_count
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_category, q.category) IS NOT NULL;
        v_requirement_met := v_category_count >= v_badge.requirement_value;

      WHEN 'weekend_warrior' THEN
        v_requirement_met := false;

      WHEN 'streak_days' THEN
        v_requirement_met := false;

      WHEN 'all_questlines' THEN
        SELECT COUNT(DISTINCT ql.category) INTO v_questline_count
        FROM public.user_questline_progress uqp
        JOIN public.questlines ql ON ql.id = uqp.questline_id
        WHERE uqp.user_id = p_user_id AND uqp.is_completed = true;

        v_requirement_met := v_questline_count >= (
          SELECT COUNT(DISTINCT category) FROM public.questlines WHERE is_active = true
        );
    END CASE;

    IF v_requirement_met THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;

      RETURN QUERY SELECT v_badge.id, v_badge.name;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Authorize streak and recap RPCs.
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
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to update streak for this user.' USING ERRCODE = '42501';
  END IF;

  SELECT
    current_streak,
    longest_streak,
    last_activity_date
  INTO v_current_streak, v_longest_streak, v_last_activity
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  IF v_current_streak IS NULL THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, streak_started_at)
    VALUES (p_user_id, 1, 1, p_completion_date, now());

    RETURN QUERY SELECT 1, false, true;
    RETURN;
  END IF;

  v_days_diff := p_completion_date - v_last_activity;

  IF v_days_diff = 0 THEN
    RETURN QUERY SELECT v_current_streak, false, false;
    RETURN;
  END IF;

  IF v_days_diff = 1 THEN
    v_current_streak := v_current_streak + 1;
    v_streak_broken := false;

    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
      v_is_new_longest := true;
    END IF;
  ELSE
    v_current_streak := 1;
    v_streak_broken := true;
    v_is_new_longest := false;
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_weekly_activity(p_user_id UUID, p_xp INTEGER, p_category TEXT)
RETURNS void AS $$
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to update weekly activity for this user.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.weekly_activity
  SET
    quests_completed = quests_completed + 1,
    xp_earned = xp_earned + p_xp,
    categories = CASE
      WHEN categories @> to_jsonb(p_category) THEN categories
      ELSE categories || to_jsonb(p_category)
    END
  WHERE user_id = p_user_id AND week_start = v_week_start;

  IF NOT FOUND THEN
    INSERT INTO public.weekly_activity (user_id, week_start, quests_completed, xp_earned, categories)
    VALUES (p_user_id, v_week_start, 1, p_xp, to_jsonb(ARRAY[p_category]));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6) Explicit function execution boundaries.
REVOKE ALL ON FUNCTION public.check_and_award_badges(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_streak(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_weekly_activity(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profile_by_handle(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_handle_available(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_and_award_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_streak(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_weekly_activity(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_handle(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_handle_available(TEXT) TO authenticated;
