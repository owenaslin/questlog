# Supabase Performance Optimization Guide

## Issues Addressed

Based on Supabase database linter output, this optimization addresses:

1. **Unindexed Foreign Key** (1 issue)
2. **Unused Indexes** (17 issues)

---

## Migration Files

### `013_performance_indexes.sql` (REQUIRED)

**Always run this migration.** It adds the missing index on the foreign key that was identified as a performance risk.

**What it does:**
- Adds `idx_pinned_quests_quest_id` on `pinned_quests(quest_id)`
- Creates `index_usage_stats` view for monitoring
- Comments out optional cleanup (safe to ignore initially)

**How to run:**
```sql
-- In Supabase SQL Editor or via CLI:
-- psql $DATABASE_URL -f 013_performance_indexes.sql
```

### `013a_optional_index_cleanup.sql` (OPTIONAL)

**Only run after monitoring for 1-2 weeks.** This drops indexes flagged as "unused" by the linter.

**Pre-run checklist:**
```sql
-- Check actual usage statistics
SELECT * FROM index_usage_stats 
WHERE indexname LIKE 'idx_badges_%'
   OR indexname LIKE 'idx_questlines_%'
   OR indexname LIKE 'idx_user_badges_%'
   OR indexname LIKE 'idx_user_questline_%';

-- Or query the raw pg_stat_user_indexes directly:
-- SELECT schemaname, relname AS tablename, indexrelname AS indexname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;
```

Only proceed if `times_used = 0` for all listed indexes.

---

## Index Decisions Explained

### Foreign Key Index (ADDED)

| Table | Column | Action | Reason |
|-------|--------|--------|--------|
| `pinned_quests` | `quest_id` | **ADD index** | Required for FK performance. Was converted to UUID in migration 012 without an index. |

### "Unused" Indexes - Kept (Functionally Required)

These indexes were flagged as unused but are essential for core features:

| Index | Table | Why Keep? |
|-------|-------|-----------|
| `idx_user_quests_user_id` | `user_quests` | Every user dashboard query filters by user_id |
| `idx_user_quests_updated_at` | `user_quests` | "Recent activity" sorting |
| `idx_questline_steps_questline_id` | `questline_steps` | Loading questline steps |
| `idx_questline_steps_parent` | `questline_steps` | Tree traversal for skill trees |
| `idx_quests_questline_id` | `quests` | Questline member quests |
| `idx_habits_user_active` | `habits` | Dashboard active habits filter |
| `idx_habit_completions_habit_id` | `habit_completions` | Streak calculations |
| `idx_habit_completions_user_date` | `habit_completions` | Daily completion checks |
| `idx_habit_streaks_habit_id` | `habit_streaks` | Habit streak lookups |
| `idx_habit_streaks_user_id` | `habit_streaks` | User streak summary |
| `idx_quests_user_id` | `quests` | User's created quests |
| `idx_questline_steps_quest_id` | `questline_steps` | Quest→step lookup |

### "Unused" Indexes - Candidates for Removal

These can likely be removed after verification:

| Index | Table | Why Remove? |
|-------|-------|-------------|
| `idx_badges_rarity` | `badges` | Low cardinality (4 values), rarely filtered alone |
| `idx_badges_requirement_type` | `badges` | Rare filter pattern |
| `idx_questlines_type` | `questlines` | Low cardinality (2 values: linear/skill_tree) |
| `idx_questlines_badge_reward_id` | `questlines` | Rare reverse lookup |
| `idx_user_badges_badge_id` | `user_badges` | Rare "who has this badge" query |
| `idx_user_questline_progress_current_step_id` | `user_questline_progress` | Rare reverse lookup |
| `idx_user_questline_progress_questline_id` | `user_questline_progress` | PK already covers (user_id, questline_id) |

---

## Monitoring

### Check Index Usage

```sql
-- View all indexes ordered by usage (least used first)
SELECT * FROM index_usage_stats;

-- Focus on specific tables
SELECT * FROM index_usage_stats 
WHERE tablename = 'badges';
```

### Reset Statistics (for fresh monitoring)

```sql
-- Run this after the app has been exercised with typical workloads
SELECT pg_stat_reset();
```

---

## Rollback

If you need to rollback the optional cleanup:

```sql
-- Recreate removed indexes
CREATE INDEX idx_badges_rarity ON public.badges(rarity);
CREATE INDEX idx_badges_requirement_type ON public.badges(requirement_type);
CREATE INDEX idx_questlines_type ON public.questlines(type);
CREATE INDEX idx_questlines_badge_reward_id ON public.questlines(badge_reward_id);
CREATE INDEX idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX idx_user_questline_progress_current_step_id ON public.user_questline_progress(current_step_id);
CREATE INDEX idx_user_questline_progress_questline_id ON public.user_questline_progress(questline_id);
```

---

## Expected Impact

| Metric | Expected Change |
|--------|-----------------|
| `pinned_quests` JOIN performance | **+50-100% improvement** on quest lookups |
| Storage (if cleanup run) | ~50-100MB reduction (depending on table sizes) |
| Write performance | Slight improvement (fewer indexes to maintain) |
| Read performance | Unchanged or slightly better |

---

## When to Re-index

Run `REINDEX` after significant cleanup:

```sql
REINDEX INDEX CONCURRENTLY idx_user_quests_user_id;
-- etc for other active indexes
```
