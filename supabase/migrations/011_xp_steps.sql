-- ================================================================
-- 011_xp_steps: Add duration_minutes and steps to quests;
--               relax habits XP constraint.
-- ================================================================

-- 1. Add duration_minutes column to quests (nullable — predefined quests
--    get this value from TypeScript; user/AI quests populated at save time)
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- 2. Add steps JSONB column to quests (default empty array)
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Relax the habits xp_reward constraint from max=25 to max=300
ALTER TABLE public.habits
  DROP CONSTRAINT IF EXISTS habits_xp_reward_check;

ALTER TABLE public.habits
  ADD CONSTRAINT habits_xp_reward_check
    CHECK (xp_reward >= 5 AND xp_reward <= 300);

-- 4. Comment documenting new columns
COMMENT ON COLUMN public.quests.duration_minutes IS
  'Total effort time in minutes. For side quests: active session length.
   For main quests: total effective effort hours × 60 (not calendar time).
   NULL for legacy rows created before this migration.';

COMMENT ON COLUMN public.quests.steps IS
  'Ordered array of QuestStep objects: [{id, title, optional?}].
   Empty array means the quest has no steps. Checked state is stored
   client-side in localStorage keyed by quest id.';
