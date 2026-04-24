-- Consolidated habits RPCs
-- Reduces round-trips for habits list and habits summary reads.

CREATE OR REPLACE FUNCTION public.get_user_habits_snapshot(
  p_today DATE,
  p_week_start DATE,
  p_active_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  icon TEXT,
  color TEXT,
  recurrence_type TEXT,
  recurrence_data JSONB,
  xp_reward INTEGER,
  is_active BOOLEAN,
  sort_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  streak_id UUID,
  streak_current INTEGER,
  streak_longest INTEGER,
  streak_last_completed_date DATE,
  streak_updated_at TIMESTAMPTZ,
  is_completed_today BOOLEAN,
  completions_this_week INTEGER
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
  WITH base_habits AS (
    SELECT h.*
    FROM public.habits h
    WHERE h.user_id = v_user_id
      AND (NOT p_active_only OR h.is_active = true)
  ),
  today_completions AS (
    SELECT hc.habit_id, true AS is_completed_today
    FROM public.habit_completions hc
    WHERE hc.user_id = v_user_id
      AND hc.completion_date = p_today
    GROUP BY hc.habit_id
  ),
  week_counts AS (
    SELECT hc.habit_id, COUNT(*)::INTEGER AS completions_this_week
    FROM public.habit_completions hc
    WHERE hc.user_id = v_user_id
      AND hc.completion_date >= p_week_start
    GROUP BY hc.habit_id
  )
  SELECT
    b.id,
    b.user_id,
    b.title,
    b.description,
    b.icon,
    b.color,
    b.recurrence_type,
    b.recurrence_data,
    b.xp_reward,
    b.is_active,
    b.sort_order,
    b.created_at,
    b.updated_at,
    hs.id AS streak_id,
    hs.current_streak AS streak_current,
    hs.longest_streak AS streak_longest,
    hs.last_completed_date AS streak_last_completed_date,
    hs.updated_at AS streak_updated_at,
    COALESCE(tc.is_completed_today, false) AS is_completed_today,
    COALESCE(wc.completions_this_week, 0) AS completions_this_week
  FROM base_habits b
  LEFT JOIN public.habit_streaks hs
    ON hs.habit_id = b.id
   AND hs.user_id = v_user_id
  LEFT JOIN today_completions tc
    ON tc.habit_id = b.id
  LEFT JOIN week_counts wc
    ON wc.habit_id = b.id
  ORDER BY b.sort_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_habits_snapshot(DATE, DATE, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_habits_summary_snapshot(
  p_today DATE,
  p_week_start DATE
)
RETURNS TABLE (
  total_habits INTEGER,
  active_habits INTEGER,
  completed_today INTEGER,
  total_completions_this_week INTEGER,
  current_streaks INTEGER,
  longest_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.habits h WHERE h.user_id = v_user_id), 0) AS total_habits,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.habits h WHERE h.user_id = v_user_id AND h.is_active = true), 0) AS active_habits,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.habit_completions hc WHERE hc.user_id = v_user_id AND hc.completion_date = p_today), 0) AS completed_today,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.habit_completions hc WHERE hc.user_id = v_user_id AND hc.completion_date >= p_week_start), 0) AS total_completions_this_week,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.habit_streaks hs WHERE hs.user_id = v_user_id AND hs.current_streak > 0), 0) AS current_streaks,
    COALESCE((SELECT MAX(hs.longest_streak) FROM public.habit_streaks hs WHERE hs.user_id = v_user_id), 0)::INTEGER AS longest_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_habits_summary_snapshot(DATE, DATE) TO authenticated;
