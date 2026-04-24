-- Consolidated user dashboard snapshot RPC
-- Reduces repeated client round-trips for profile/progress/streak/badge reads.

CREATE OR REPLACE FUNCTION public.get_user_dashboard_snapshot()
RETURNS TABLE (
  profile_xp_total INTEGER,
  profile_level INTEGER,
  profile_created_at TIMESTAMPTZ,
  completed_count BIGINT,
  active_count BIGINT,
  streak_current INTEGER,
  streak_longest INTEGER,
  streak_last_activity_date DATE,
  recent_completed_ids UUID[],
  badge_ids UUID[],
  progress_rows JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT p.xp_total FROM public.profiles p WHERE p.id = v_user_id), 0) AS profile_xp_total,
    COALESCE((SELECT p.level FROM public.profiles p WHERE p.id = v_user_id), 1) AS profile_level,
    (SELECT p.created_at FROM public.profiles p WHERE p.id = v_user_id) AS profile_created_at,
    COALESCE((SELECT COUNT(*) FROM public.user_quests uq WHERE uq.user_id = v_user_id AND uq.status = 'completed'), 0) AS completed_count,
    COALESCE((SELECT COUNT(*) FROM public.user_quests uq WHERE uq.user_id = v_user_id AND uq.status = 'active'), 0) AS active_count,
    COALESCE((SELECT us.current_streak FROM public.user_streaks us WHERE us.user_id = v_user_id), 0) AS streak_current,
    COALESCE((SELECT us.longest_streak FROM public.user_streaks us WHERE us.user_id = v_user_id), 0) AS streak_longest,
    (SELECT us.last_activity_date FROM public.user_streaks us WHERE us.user_id = v_user_id) AS streak_last_activity_date,
    COALESCE((
      SELECT ARRAY(
        SELECT uq.quest_id
        FROM public.user_quests uq
        WHERE uq.user_id = v_user_id
          AND uq.status = 'completed'
        ORDER BY uq.completed_at DESC NULLS LAST
        LIMIT 12
      )
    ), ARRAY[]::UUID[]) AS recent_completed_ids,
    COALESCE((
      SELECT array_agg(ub.badge_id)
      FROM public.user_badges ub
      WHERE ub.user_id = v_user_id
    ), ARRAY[]::UUID[]) AS badge_ids,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'quest_id', uq.quest_id,
          'status', uq.status,
          'accepted_at', uq.accepted_at,
          'completed_at', uq.completed_at,
          'updated_at', uq.updated_at
        )
      )
      FROM public.user_quests uq
      WHERE uq.user_id = v_user_id
    ), '[]'::jsonb) AS progress_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_dashboard_snapshot() TO authenticated;
