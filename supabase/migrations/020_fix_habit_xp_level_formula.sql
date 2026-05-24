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
-- Fix: rewrite both trigger functions to use FLOOR(xp / 500) + 1, then
-- back-fill every profile row so the stored level matches the formula.

-- 1. Fix award_habit_xp -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_habit_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp_total = xp_total + NEW.xp_awarded,
      level    = FLOOR((xp_total + NEW.xp_awarded) / 500) + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- 2. Fix revoke_habit_xp ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_habit_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp_total = GREATEST(0, xp_total - OLD.xp_awarded),
      level    = FLOOR(GREATEST(0, xp_total - OLD.xp_awarded) / 500) + 1
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

-- 3. Back-fill: re-derive level from xp_total for every profile ---------------
--    Uses the same formula as calculateLevel() in TypeScript.
UPDATE public.profiles
SET level = FLOOR(xp_total / 500) + 1;
