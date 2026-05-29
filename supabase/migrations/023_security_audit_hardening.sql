-- ============================================================================
-- 023_security_audit_hardening.sql
-- ============================================================================
-- Remediation for findings in SECURITY_AUDIT_2026-05.md (database layer).
--
-- ⚠️  REVIEW BEFORE APPLYING. This migration was authored during a security
--     audit and has NOT been applied to the live project. Apply it through your
--     normal Supabase migration workflow after reviewing in a branch/staging DB.
--
-- Covers:
--   1. IDOR in SECURITY DEFINER RPCs that took p_user_id without an auth.uid()
--      check (get_hero_dashboard, check_and_increment_discovery_count).
--   2. Trigger-only SECURITY DEFINER functions left EXECUTE-able by anon /
--      authenticated via PostgREST RPC.
--   3. Functions with a mutable search_path (Supabase linter 0011).
-- ============================================================================

-- ── 1. Add owner-only authorization guards to RLS-bypassing RPCs ─────────────
-- These run as SECURITY DEFINER (bypass RLS). They are intended to operate only
-- on the caller's own data. The guard allows service-role calls (auth.uid() IS
-- NULL) and the owner, and rejects authenticated/anon callers passing another
-- user's id.

CREATE OR REPLACE FUNCTION public.get_hero_dashboard(p_user_id uuid)
 RETURNS TABLE(pinned_quests jsonb, badge_ids uuid[], completed_count bigint, longest_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH
    pinned AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'quest_id', quest_id,
                'quest_title', quest_title,
                'quest_type', quest_type,
                'quest_xp_reward', quest_xp_reward,
                'position', position,
                'pinned_at', pinned_at
            ) ORDER BY position
        ) as data
        FROM public.pinned_quests
        WHERE user_id = p_user_id
        LIMIT 5
    ),
    badges AS (
        SELECT array_agg(badge_id) as data
        FROM public.user_badges
        WHERE user_id = p_user_id
    ),
    completed AS (
        SELECT COUNT(*) as cnt
        FROM public.user_quests
        WHERE user_id = p_user_id AND status = 'completed'
    ),
    streak AS (
        SELECT longest_streak
        FROM public.user_streaks
        WHERE user_id = p_user_id
        LIMIT 1
    )
    SELECT
        COALESCE(pinned.data, '[]'::jsonb) as pinned_quests,
        COALESCE(badges.data, ARRAY[]::UUID[]) as badge_ids,
        COALESCE(completed.cnt, 0) as completed_count,
        COALESCE(streak.longest_streak, 0) as longest_streak
    FROM pinned, badges, completed, streak;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_increment_discovery_count(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_daily INTEGER;
  v_current_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Get user's max daily limit from preferences
  SELECT
    COALESCE((discovery_preferences->>'max_discovery_cost_daily')::INTEGER, 5)
  INTO v_max_daily
  FROM public.profiles
  WHERE id = p_user_id;

  -- Get current count, reset if it's a new day
  SELECT
    CASE
      WHEN last_discovery_at < CURRENT_DATE THEN 0
      ELSE discovery_count_today
    END
  INTO v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

  -- Check if under limit
  IF v_current_count >= v_max_daily THEN
    RETURN false;
  END IF;

  -- Increment count
  UPDATE public.profiles
  SET discovery_count_today = v_current_count + 1,
      last_discovery_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$function$;

-- ── 2. Revoke EXECUTE on trigger-only functions ─────────────────────────────
-- These functions return `trigger` and are invoked by table triggers (which run
-- as the table owner irrespective of EXECUTE grants). Exposing them as PostgREST
-- RPC endpoints to anon/authenticated serves no purpose. Revoking is safe and
-- does not affect trigger execution.

REVOKE EXECUTE ON FUNCTION public.award_habit_xp()              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_discoveries() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_habit()            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_settings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_quest_completion_tracking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_habit_xp()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_habit_streak()         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_questline_progress()   FROM anon, authenticated;

-- reset_daily_discovery_counts() is an operational/cron routine, not a client
-- RPC. Restrict it from public roles as well.
REVOKE EXECUTE ON FUNCTION public.reset_daily_discovery_counts() FROM anon, authenticated;

-- ── 3. Pin search_path on functions flagged as mutable (linter 0011) ─────────
-- These timestamp triggers do not set an explicit search_path.
ALTER FUNCTION public.update_daily_adventures_timestamp() SET search_path = public;
ALTER FUNCTION public.update_user_settings_timestamp()    SET search_path = public;

-- ============================================================================
-- NOT INCLUDED (require product decisions — see audit report):
--   * public.spatial_ref_sys has RLS disabled. It is a PostGIS system reference
--     table; enabling RLS without policies can break PostGIS. Decide explicitly.
--       ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
--   * PostGIS extension is installed in the `public` schema (linter 0014).
--     Moving it is invasive; evaluate separately.
--   * Enable "Leaked password protection" (HaveIBeenPwned) in Supabase Auth
--     settings — this is a dashboard toggle, not SQL.
-- ============================================================================
