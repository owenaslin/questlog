-- ============================================================
-- Migration 013: Performance Index Optimization
-- Addresses Supabase linter warnings for:
--   1. Unindexed foreign keys
--   2. Potentially unused indexes (conservative approach)
-- ============================================================

-- ============================================================
-- PART 1: REQUIRED FIX - Add missing index on foreign key
-- ============================================================
-- Issue: unindexed_foreign_keys_public_pinned_quests_pinned_quests_quest_id_fkey
-- The pinned_quests.quest_id foreign key (converted to UUID in 012) lacks an index.
-- This impacts performance when joining with quests or filtering by quest_id.

CREATE INDEX IF NOT EXISTS idx_pinned_quests_quest_id 
  ON public.pinned_quests(quest_id);

COMMENT ON INDEX idx_pinned_quests_quest_id IS 
  'Covers the foreign key relationship for quest lookups. Added in migration 013.';

-- ============================================================
-- PART 2: INDEX CLEANUP (Optional - Review Before Running)
-- ============================================================
-- The following indexes were flagged as "unused" by the Supabase linter.
-- They are COMMENTED OUT because they may be used in edge cases or
-- future features. Uncomment only after verifying they're truly unnecessary.

-- NOTE: Run the SELECT queries below first to verify zero usage,
--       then uncomment the DROP statements if appropriate.

/*
-- Check actual index usage before dropping:
--
-- SELECT schemaname, relname AS tablename, indexrelname AS indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE indexrelname IN (
--   'idx_badges_rarity',
--   'idx_badges_requirement_type', 
--   'idx_questlines_type',
--   'idx_questlines_badge_reward_id',
--   'idx_user_badges_badge_id',
--   'idx_user_questline_progress_current_step_id',
--   'idx_user_questline_progress_questline_id'
-- )
-- ORDER BY idx_scan ASC;
--
-- If idx_scan = 0 for 7+ days, the index can likely be safely removed.
*/

-- Low-value indexes: These filter low-cardinality columns or
-- support rare query patterns. Safe to remove if unused.

-- DROP INDEX IF EXISTS idx_badges_rarity;
-- DROP INDEX IF EXISTS idx_badges_requirement_type;
-- DROP INDEX IF EXISTS idx_questlines_type;
-- DROP INDEX IF EXISTS idx_questlines_badge_reward_id;

-- Reverse lookup indexes: These support rare reverse lookups.
-- Only drop if you're certain the app never queries this way.

-- DROP INDEX IF EXISTS idx_user_badges_badge_id;
-- DROP INDEX IF EXISTS idx_user_questline_progress_current_step_id;
-- DROP INDEX IF EXISTS idx_user_questline_progress_questline_id;

-- ============================================================
-- PART 3: INDEX VERIFICATION VIEW
-- ============================================================
-- Create a helper view to monitor index usage over time

CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT 
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED - Candidate for removal'
    WHEN idx_scan < 10 THEN 'RARELY USED - Monitor'
    ELSE 'ACTIVE'
  END AS usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

COMMENT ON VIEW public.index_usage_stats IS 
  'Monitors index usage to identify candidates for removal. Run periodically to track usage patterns.';

-- ============================================================
-- SUMMARY OF CHANGES
-- ============================================================
-- ADDED:
--   - idx_pinned_quests_quest_id: Covers FK on pinned_quests(quest_id)
--
-- VERIFIED KEEP ( flagged as unused but functionally required):
--   - idx_user_quests_user_id, idx_user_quests_updated_at
--   - idx_questline_steps_questline_id, idx_questline_steps_parent, idx_questline_steps_quest_id
--   - idx_quests_questline_id, idx_quests_user_id
--   - idx_habits_user_active
--   - idx_habit_completions_habit_id, idx_habit_completions_user_date
--   - idx_habit_streaks_habit_id, idx_habit_streaks_user_id
--
-- CANDIDATES FOR REMOVAL (monitor with index_usage_stats view):
--   - idx_badges_rarity, idx_badges_requirement_type
--   - idx_questlines_type, idx_questlines_badge_reward_id
--   - idx_user_badges_badge_id
--   - idx_user_questline_progress_current_step_id, idx_user_questline_progress_questline_id
-- ============================================================
