-- ============================================
-- SECURITY HARDENING — ROUND 2
-- ============================================
-- Addresses findings from the May 2026 security/pentest review:
--   H2 — Public RPCs in 000014 lack auth.uid() checks
--   M1 — SECURITY DEFINER functions missing `SET search_path`
-- ============================================

-- 1) Discovery quota RPC: require caller == p_user_id, lock search_path.
CREATE OR REPLACE FUNCTION public.check_and_increment_discovery_count(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_max_daily INTEGER;
  v_current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to modify discovery count for this user.' USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE((discovery_preferences->>'max_discovery_cost_daily')::INTEGER, 5)
  INTO v_max_daily
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT
    CASE
      WHEN last_discovery_at < CURRENT_DATE THEN 0
      ELSE discovery_count_today
    END
  INTO v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_current_count >= v_max_daily THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET discovery_count_today = v_current_count + 1,
      last_discovery_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- 2) Cron-only RPCs: restrict to service_role.
CREATE OR REPLACE FUNCTION public.reset_daily_discovery_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET discovery_count_today = 0,
      last_discovery_at = NULL
  WHERE last_discovery_at < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_discoveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.quest_discoveries
  WHERE expires_at < now() - INTERVAL '7 days';
  RETURN NULL;
END;
$$;

-- 3) Lock execute on the discovery RPCs.
REVOKE ALL ON FUNCTION public.check_and_increment_discovery_count(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_daily_discovery_counts()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_discoveries()            FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_and_increment_discovery_count(UUID) TO authenticated;
-- reset_daily_discovery_counts and cleanup_expired_discoveries are service_role only — no grant needed.

-- 4) Lock search_path on remaining SECURITY DEFINER functions defined before 007.
-- These were originally created without `SET search_path`, which lets a session
-- pre-pend a schema and shadow expected objects (Supabase advisor: function_search_path_mutable).

ALTER FUNCTION public.handle_new_user()                   SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_habit_xp()                    SET search_path = public, pg_catalog;
ALTER FUNCTION public.revoke_habit_xp()                   SET search_path = public, pg_catalog;
ALTER FUNCTION public.complete_quest_atomic(UUID, UUID, INTEGER, TEXT, TEXT)
                                                          SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_questline_progress()         SET search_path = public, pg_catalog;
