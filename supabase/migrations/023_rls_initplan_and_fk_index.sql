-- Performance optimization: resolve Supabase database linter findings on the
-- location-discovery, quest-step, settings and daily-adventure tables.
--
-- These tables were added after the earlier RLS init-plan cleanup, so their
-- policies still re-evaluate auth.uid() once per row. This migration:
--   1. Adds the missing covering index for the quest_discoveries -> quests FK.
--   2. Wraps auth.uid() in (select auth.uid()) so it is evaluated once per
--      query (init-plan) instead of once per row.
--   3. Collapses the redundant overlapping policies on user_quest_steps into a
--      single FOR ALL policy, eliminating the "multiple permissive policies"
--      overhead (each permissive policy is otherwise executed for every row).
--
-- Semantics are unchanged: every policy still restricts rows to the owning user.

-- ============================================================
-- 1. Unindexed foreign key: quest_discoveries.quest_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quest_discoveries_quest_id
  ON public.quest_discoveries (quest_id);

-- ============================================================
-- 2. quest_discoveries RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own discoveries" ON public.quest_discoveries;
CREATE POLICY "Users can view own discoveries" ON public.quest_discoveries
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own discoveries" ON public.quest_discoveries;
CREATE POLICY "Users can update own discoveries" ON public.quest_discoveries
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own discoveries" ON public.quest_discoveries;
CREATE POLICY "Users can delete own discoveries" ON public.quest_discoveries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================
-- 3. user_settings RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================================
-- 4. daily_adventures RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own daily adventures" ON public.daily_adventures;
CREATE POLICY "Users can view own daily adventures" ON public.daily_adventures
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own daily adventures" ON public.daily_adventures;
CREATE POLICY "Users can insert own daily adventures" ON public.daily_adventures
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own daily adventures" ON public.daily_adventures;
CREATE POLICY "Users can update own daily adventures" ON public.daily_adventures
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================================
-- 5. user_quest_steps: collapse redundant policies into one FOR ALL policy.
--    The granular SELECT/INSERT/UPDATE policies fully overlap the existing
--    FOR ALL policy (which also covers DELETE), so each query was running
--    two permissive policies for the same action. Keep only the FOR ALL one.
-- ============================================================
DROP POLICY IF EXISTS "Users can view own quest step progress" ON public.user_quest_steps;
DROP POLICY IF EXISTS "Users can insert own quest step progress" ON public.user_quest_steps;
DROP POLICY IF EXISTS "Users can update own quest step progress" ON public.user_quest_steps;
DROP POLICY IF EXISTS "Users manage own quest steps" ON public.user_quest_steps;
CREATE POLICY "Users manage own quest steps" ON public.user_quest_steps
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
