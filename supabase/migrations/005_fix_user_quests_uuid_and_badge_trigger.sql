-- ============================================
-- FIXES: user_quests.quest_id UUID + badge award trigger behavior
-- ============================================

-- 1) Ensure quest_id uses UUID type for consistent joins/comparisons
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_quests'
      AND column_name = 'quest_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.user_quests
      ALTER COLUMN quest_id TYPE UUID
      USING quest_id::uuid;
  END IF;
END $$;

-- 2) Do not enforce quest_id foreign key to public.quests.
-- The app supports stable seed quest UUIDs that may not be persisted as rows in public.quests.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_quests_quest_id_fkey'
  ) THEN
    ALTER TABLE public.user_quests
      DROP CONSTRAINT user_quests_quest_id_fkey;
  END IF;
END $$;

-- 3) Update trigger function to always award badges on completion
CREATE OR REPLACE FUNCTION public.update_questline_progress()
RETURNS trigger AS $$
DECLARE
  v_questline_id UUID;
  v_step_id UUID;
  v_next_step RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Award badges for any completed quest
    PERFORM public.check_and_award_badges(NEW.user_id);

    -- Questline progression logic
    SELECT qs.questline_id, qs.id INTO v_questline_id, v_step_id
    FROM public.questline_steps qs
    WHERE qs.quest_id = NEW.quest_id::uuid
    LIMIT 1;

    IF v_questline_id IS NOT NULL THEN
      SELECT * INTO v_next_step
      FROM public.questline_steps
      WHERE questline_id = v_questline_id
        AND step_number = (
          SELECT step_number + 1
          FROM public.questline_steps
          WHERE id = v_step_id
        )
      LIMIT 1;

      UPDATE public.user_questline_progress
      SET current_step_id = COALESCE(v_next_step.id, v_step_id),
          is_completed = (v_next_step.id IS NULL),
          completed_at = CASE WHEN v_next_step.id IS NULL THEN now() ELSE null END
      WHERE user_id = NEW.user_id
        AND questline_id = v_questline_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Recreate trigger to guarantee latest function behavior
DROP TRIGGER IF EXISTS on_quest_completed ON public.user_quests;
CREATE TRIGGER on_quest_completed
  AFTER UPDATE OF status ON public.user_quests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_questline_progress();

-- 5) Backfill badges for existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.check_and_award_badges(r.id);
  END LOOP;
END $$;
