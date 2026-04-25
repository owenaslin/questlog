-- ============================================================
-- OPTIONAL: Aggressive Index Cleanup
-- 
-- WARNING: Only run this after:
--   1. Running migration 013 and waiting 7-14 days
--   2. Verifying via `SELECT * FROM index_usage_stats` that:
--      - idx_scan = 0 for all listed indexes
--      - Your app's query patterns don't need them
-- 
-- These indexes support query patterns that may not have been
-- exercised yet. Dropping them could cause performance regressions.
-- ============================================================

-- Low-cardinality indexes (may help with specific filters but often unnecessary)
DROP INDEX IF EXISTS idx_badges_rarity;
DROP INDEX IF EXISTS idx_badges_requirement_type;
DROP INDEX IF EXISTS idx_questlines_type;
DROP INDEX IF EXISTS idx_questlines_badge_reward_id;

-- Reverse lookup indexes (FK indexes usually not needed for reverse direction)
DROP INDEX IF EXISTS idx_user_badges_badge_id;
DROP INDEX IF EXISTS idx_user_questline_progress_current_step_id;
DROP INDEX IF EXISTS idx_user_questline_progress_questline_id;
