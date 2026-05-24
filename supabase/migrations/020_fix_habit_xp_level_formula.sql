-- Fix habit XP triggers to use the correct linear level formula.
--
-- The original award_habit_xp / revoke_habit_xp triggers used a square-root
-- progression:
--
--   FLOOR(SQRT(xp / 100)) + 1
--
-- The rest of the codebase — both the TypeScript calculateLevel() helper and the
-- complete_quest_atomic RPC — uses the linear 500-XP-per-level formula:
--
--   FLOOR(xp / 500) + 1
--
-- This caused the stored `profiles.level` to disagree with the level shown by
-- the XPBar component on the homepage whenever a habit was completed or un-done,
-- making the Navbar and the home XPBar show different level numbers for the same
-- user.
--
-- Additional fixes (code-review findings):
--   • Restore GREATEST(1, ...) floor so level can never be written as 0 or
--     negative even if xp_total is somehow negative.
--   • Add CHECK (xp_awarded >= 0) constraint on habit_completions to close the
--     direct-API exploit: an authenticated user could POST a negative xp_awarded
--     value, driving xp_total and level to 0 / negative via the trigger.
--     Added with NOT VALID + idempotency guard because schema.sql already defines
--     an anonymous inline CHECK on the column, so the live DB may already have
--     the constraint and a duplicate ADD CONSTRAINT would error.
--   • Wrap all statements in an explicit transaction so a mid-run failure can't
--     leave the functions replaced but the level column partially updated.
--   • SET LOCAL lock_timeout to fail loudly rather than silently blocking
--     production writes if a lock cannot be acquired within 30 s.
--
-- Everything is wrapped in a single transaction.

BEGIN;

-- 0. Guard: cap the lock wait so a contended back-fill fails loudly rather than
--    silently blocking production writes.
SET LOCAL lock_timeout = '30s';

-- 1. Add non-negative constraint on habit_completions.xp_awarded ---------------
--    Prevents a direct-API insert with a negative value from driving profiles
--    into a negative xp_total / zero level state.
--
--    The table was originally bootstrapped from schema.sql which already has an
--    anonymous inline CHECK (xp_awarded >= 0). On a live DB created that way the
--    constraint is already present, so we must guard for idempotency. If it is
--    missing (fresh migration-only setup) we add it with NOT VALID to skip the
--    full-table validation scan — existing rows were already protected by the
--    inline check or by app-level validation, and a blocking ACCESS EXCLUSIVE
--    scan over a table that may already have the constraint would be wasteful.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'public.habit_completions'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) LIKE '%xp_awarded >= 0%'
  ) THEN
    ALTER TABLE public.habit_completions
      ADD CONSTRAINT habit_completions_xp_awarded_non_negative
      CHECK (xp_awarded >= 0) NOT VALID;
  END IF;
END;
$$;

-- 2. Fix award_habit_xp -------------------------------------------------------
--    Formula: GREATEST(1, FLOOR(new_xp_total / 500) + 1)
--    xp_total on the RHS is the pre-update value (PostgreSQL evaluates all SET
--    expressions against the old row), so (xp_total + NEW.xp_awarded) equals
--    the correct new total.
--    GREATEST(1, ...) restores the minimum-level floor that the old code had.
CREATE OR REPLACE FUNCTION public.award_habit_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp_total = xp_total + NEW.xp_awarded,
      level    = GREATEST(1, FLOOR((xp_total + NEW.xp_awarded) / 500) + 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- 3. Fix revoke_habit_xp ------------------------------------------------------
--    GREATEST(0, ...) clamps the effective new xp_total before dividing so
--    integer division is always non-negative.
--    GREATEST(1, ...) keeps level >= 1.
CREATE OR REPLACE FUNCTION public.revoke_habit_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp_total = GREATEST(0, xp_total - OLD.xp_awarded),
      level    = GREATEST(1, FLOOR(GREATEST(0, xp_total - OLD.xp_awarded) / 500) + 1)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

-- 4. Back-fill: re-derive level from xp_total for every profile ---------------
--    Uses the same formula as calculateLevel() in TypeScript.
--    GREATEST(1, ...) ensures no row ends up with level < 1 even if xp_total
--    contains a stale negative value from a prior bug.
UPDATE public.profiles
SET level = GREATEST(1, FLOOR(xp_total / 500) + 1);

COMMIT;
