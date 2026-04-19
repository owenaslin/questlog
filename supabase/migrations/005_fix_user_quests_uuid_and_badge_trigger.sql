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

-- 3) Ensure quest metadata columns exist for robust badge logic
ALTER TABLE public.user_quests
  ADD COLUMN IF NOT EXISTS quest_type TEXT CHECK (quest_type IN ('main', 'side'));

ALTER TABLE public.user_quests
  ADD COLUMN IF NOT EXISTS quest_category TEXT;

-- Backfill metadata from persisted quests when available
UPDATE public.user_quests uq
SET
  quest_type = COALESCE(uq.quest_type, q.type),
  quest_category = COALESCE(uq.quest_category, q.category)
FROM public.quests q
WHERE q.id = uq.quest_id
  AND (uq.quest_type IS NULL OR uq.quest_category IS NULL);

-- 4) Replace badge function with joins that tolerate non-persisted quest rows
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id UUID, badge_name TEXT) AS $$
DECLARE
  v_badge RECORD;
  v_requirement_met BOOLEAN;
  v_category_count INTEGER;
  v_total_quests INTEGER;
  v_questline_count INTEGER;
BEGIN
  FOR v_badge IN
    SELECT b.*
    FROM public.badges b
    WHERE b.id NOT IN (
      SELECT badge_id FROM public.user_badges WHERE user_id = p_user_id
    )
  LOOP
    v_requirement_met := false;

    CASE v_badge.requirement_type
      WHEN 'category_count' THEN
        SELECT COUNT(*) INTO v_category_count
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_category, q.category) = v_badge.requirement_category;
        v_requirement_met := v_category_count >= v_badge.requirement_value;

      WHEN 'total_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests
        WHERE user_id = p_user_id AND status = 'completed';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;

      WHEN 'questline_complete' THEN
        SELECT COUNT(*) INTO v_questline_count
        FROM public.user_questline_progress
        WHERE user_id = p_user_id AND is_completed = true;
        v_requirement_met := v_questline_count >= v_badge.requirement_value;

      WHEN 'level_reached' THEN
        SELECT (level >= v_badge.requirement_value) INTO v_requirement_met
        FROM public.profiles
        WHERE id = p_user_id;

      WHEN 'side_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_type, q.type) = 'side';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;

      WHEN 'main_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_type, q.type) = 'main';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;

      WHEN 'unique_categories' THEN
        SELECT COUNT(DISTINCT COALESCE(uq.quest_category, q.category)) INTO v_category_count
        FROM public.user_quests uq
        LEFT JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id
          AND uq.status = 'completed'
          AND COALESCE(uq.quest_category, q.category) IS NOT NULL;
        v_requirement_met := v_category_count >= v_badge.requirement_value;

      WHEN 'weekend_warrior' THEN
        v_requirement_met := false;

      WHEN 'streak_days' THEN
        v_requirement_met := false;

      WHEN 'all_questlines' THEN
        SELECT COUNT(DISTINCT ql.category) INTO v_questline_count
        FROM public.user_questline_progress uqp
        JOIN public.questlines ql ON ql.id = uqp.questline_id
        WHERE uqp.user_id = p_user_id AND uqp.is_completed = true;

        v_requirement_met := v_questline_count >= (
          SELECT COUNT(DISTINCT category) FROM public.questlines WHERE is_active = true
        );
    END CASE;

    IF v_requirement_met THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;

      RETURN QUERY SELECT v_badge.id, v_badge.name;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Add atomic completion RPC to prevent XP double-award races
CREATE OR REPLACE FUNCTION public.complete_quest_atomic(
  p_user_id UUID,
  p_quest_id UUID,
  p_xp INTEGER,
  p_quest_type TEXT DEFAULT NULL,
  p_quest_category TEXT DEFAULT NULL
)
RETURNS TABLE(
  applied BOOLEAN,
  already_completed BOOLEAN,
  next_xp INTEGER,
  next_level INTEGER
) AS $$
DECLARE
  v_existing_status TEXT;
  v_next_xp INTEGER;
  v_next_level INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to complete quest for this user.' USING ERRCODE = '42501';
  END IF;

  IF p_xp < 0 THEN
    RAISE EXCEPTION 'XP reward must be non-negative.' USING ERRCODE = '22023';
  END IF;

  SELECT status
  INTO v_existing_status
  FROM public.user_quests
  WHERE user_id = p_user_id
    AND quest_id = p_quest_id
  FOR UPDATE;

  IF v_existing_status = 'completed' THEN
    RETURN QUERY SELECT false, true, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_existing_status IS NULL THEN
    INSERT INTO public.user_quests (
      user_id,
      quest_id,
      quest_type,
      quest_category,
      status,
      accepted_at,
      completed_at
    ) VALUES (
      p_user_id,
      p_quest_id,
      p_quest_type,
      p_quest_category,
      'completed',
      now(),
      now()
    );
  ELSE
    UPDATE public.user_quests
    SET
      quest_type = COALESCE(quest_type, p_quest_type),
      quest_category = COALESCE(quest_category, p_quest_category),
      status = 'completed',
      accepted_at = COALESCE(accepted_at, now()),
      completed_at = now()
    WHERE user_id = p_user_id
      AND quest_id = p_quest_id;
  END IF;

  UPDATE public.profiles
  SET
    xp_total = COALESCE(xp_total, 0) + p_xp,
    level = FLOOR((COALESCE(xp_total, 0) + p_xp) / 500) + 1
  WHERE id = p_user_id
  RETURNING xp_total, level INTO v_next_xp, v_next_level;

  IF v_next_xp IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, false, v_next_xp, v_next_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Update trigger function to always award badges on completion
CREATE OR REPLACE FUNCTION public.update_questline_progress()
RETURNS trigger AS $$
DECLARE
  v_step RECORD;
  v_next_step RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Award badges for any completed quest
    PERFORM public.check_and_award_badges(NEW.user_id);

    -- A quest can appear in multiple questlines; process all matches.
    FOR v_step IN
      SELECT qs.questline_id, qs.id AS step_id
      FROM public.questline_steps qs
      WHERE qs.quest_id = NEW.quest_id::uuid
    LOOP
      SELECT * INTO v_next_step
      FROM public.questline_steps
      WHERE questline_id = v_step.questline_id
        AND step_number = (
          SELECT step_number + 1
          FROM public.questline_steps
          WHERE id = v_step.step_id
        )
      LIMIT 1;

      INSERT INTO public.user_questline_progress (
        user_id,
        questline_id,
        current_step_id,
        is_completed,
        completed_at
      )
      VALUES (
        NEW.user_id,
        v_step.questline_id,
        COALESCE(v_next_step.id, v_step.step_id),
        (v_next_step.id IS NULL),
        CASE WHEN v_next_step.id IS NULL THEN now() ELSE null END
      )
      ON CONFLICT (user_id, questline_id)
      DO UPDATE
      SET current_step_id = EXCLUDED.current_step_id,
          is_completed = EXCLUDED.is_completed,
          completed_at = EXCLUDED.completed_at;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Recreate trigger to guarantee latest function behavior
DROP TRIGGER IF EXISTS on_quest_completed ON public.user_quests;
CREATE TRIGGER on_quest_completed
  AFTER UPDATE OF status ON public.user_quests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_questline_progress();

-- 8) Backfill badges for existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.check_and_award_badges(r.id);
  END LOOP;
END $$;
