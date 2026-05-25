-- Align badge IDs with the frontend's deterministic UUID v5 scheme and remove
-- dead award branches.
--
-- The app builds its badge list with generateStableId('badge-' || key) -- a
-- UUID v5 over namespace 6ba7b810-9dad-11d1-80b4-00c04fd430c8 (src/lib/badges.ts,
-- src/lib/stable-id.ts). The DB previously seeded badges with gen_random_uuid()
-- (002_badges_questlines.sql), so earned badge IDs stored in user_badges were
-- random and never matched the deterministic IDs the UI compares against -- every
-- earned badge rendered as locked. Re-key badges.id to the deterministic value,
-- cascading to the two columns that reference it, so DB and frontend agree.
-- uuid_generate_v5 produces the identical value to the JS uuid library for the
-- same namespace and name (verified).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Re-key badge primary keys. The FKs are not ON UPDATE CASCADE, so drop them,
-- update parent + children in lockstep, then restore them.
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_id_fkey;
ALTER TABLE public.questlines  DROP CONSTRAINT IF EXISTS questlines_badge_reward_id_fkey;

UPDATE public.user_badges ub
SET badge_id = uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'badge-' || b.key)
FROM public.badges b
WHERE ub.badge_id = b.id;

UPDATE public.questlines q
SET badge_reward_id = uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'badge-' || b.key)
FROM public.badges b
WHERE q.badge_reward_id = b.id;

UPDATE public.badges
SET id = uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'badge-' || key);

ALTER TABLE public.user_badges
  ADD CONSTRAINT user_badges_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;

ALTER TABLE public.questlines
  ADD CONSTRAINT questlines_badge_reward_id_fkey
  FOREIGN KEY (badge_reward_id) REFERENCES public.badges(id) ON DELETE SET NULL;

-- Recreate the award function without the obsolete side_quests / main_quests
-- branches. quest_type is always NULL since main/side were collapsed (migration
-- 021), so no badge uses those requirement types and the branches were dead.
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id UUID, badge_name TEXT) AS $$
DECLARE
  v_badge RECORD;
  v_requirement_met BOOLEAN;
  v_category_count INTEGER;
  v_total_quests INTEGER;
  v_questline_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to award badges for this user.' USING ERRCODE = '42501';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
