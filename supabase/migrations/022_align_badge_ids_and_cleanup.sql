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
--
-- The target IDs below are precomputed UUID v5 values (uuid v5 of
-- 'badge-' || key under the namespace above); they are byte-identical to what
-- the JS uuid library produces. Computing them in SQL would require the
-- uuid-ossp extension, which was deliberately removed (see the
-- remove_uuid_ossp_extension migration / extension_in_public advisor), so we use
-- literals here instead.
--
-- NOTE for future badge changes: any new badge row MUST be inserted with its
-- stable id = uuid v5 of 'badge-' || key, not the gen_random_uuid() column
-- default, or it will be invisible in the UI for the same reason fixed here.

BEGIN;

CREATE TEMP TABLE _badge_id_map (key TEXT PRIMARY KEY, new_id UUID) ON COMMIT DROP;
INSERT INTO _badge_id_map (key, new_id) VALUES
  ('first_steps', 'c03275db-8bc0-53f2-ad06-42bd9cc3adb2'),
  ('jack_of_all_trades', '180aa19f-284e-54de-942e-9332d239f91a'),
  ('weekend_warrior', 'ab808aeb-8a01-53af-acfc-7ed4c509637b'),
  ('side_quest_explorer', '58c88ce9-a661-5773-8ce7-deabfa1df474'),
  ('getting_started', '584f0fdc-ba06-5fbd-ad3f-ef43177355e2'),
  ('fitness_fanatic', '28340b73-59b1-5e45-b949-964c99034838'),
  ('bookworm', '25c82d0b-a32d-5137-b496-5d734bacad03'),
  ('creative_soul', '80dcad5a-9913-5472-b665-552390a0a631'),
  ('tech_enthusiast', '643875ba-7bd4-52b8-adac-d94e62b200b9'),
  ('social_butterfly', 'c8276ae4-7751-5630-b958-1520e19baac6'),
  ('nature_lover', 'b16aa880-c8c3-592f-bbb3-e5da5357dd09'),
  ('mindful_practitioner', '1ed32d4f-1d5b-5c81-ad3c-8471bd52e440'),
  ('foodie', '78e49009-916e-510d-858e-2b715d230065'),
  ('main_quest_hero', 'd23f4b21-222b-5e68-b5b0-57d3e1b6b1c5'),
  ('level_5', '69f78b07-ae96-54cb-bdc1-1070f4e24208'),
  ('quest_collector', 'e55f9cad-1b9a-5dd7-8387-83700ae17d6b'),
  ('marathoner', 'cfbdaa55-ad42-547c-827e-61e4ea94fa01'),
  ('questline_master', 'bd4f46d9-dff7-588f-a4d9-978351419255'),
  ('renaissance', '9dc61bc4-1f2e-5f81-a6bb-68ef8c6c63b5'),
  ('category_master_fitness', '5f41deee-50ec-5ea3-aaef-8b772fc65453'),
  ('category_master_creative', '0a47f843-1bf5-53c7-ac29-c9547af00a49'),
  ('category_master_tech', '87140463-6ba3-54c5-8ccf-c61bacd394f8'),
  ('level_10', '0b82ba74-d333-51a0-908f-7184692c2c83'),
  ('dedicated', 'db05a4da-4a30-51f5-a8e2-6530ed1fca5f'),
  ('completionist', 'e8438e39-aacd-5e1f-935b-2380a651e612'),
  ('legend_of_the_board', '0367457a-aa7e-58b5-9b37-f90eddf3bdb8'),
  ('master_of_all', '65b1fd33-bfcf-52c9-a847-c3baa92fad75'),
  ('true_hero', '34e3faf8-c6ce-5658-9aa8-91e58ebeb485'),
  ('unstoppable', '06838117-1a96-5b20-aead-403f51bd8cfb');

-- Re-key badge primary keys. The FKs are not ON UPDATE CASCADE, so drop them,
-- update children (joined to their badge via the current id) then the parent,
-- and restore them. Idempotent: re-running maps each row to the same id.
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_id_fkey;
ALTER TABLE public.questlines  DROP CONSTRAINT IF EXISTS questlines_badge_reward_id_fkey;

UPDATE public.user_badges ub
SET badge_id = m.new_id
FROM public.badges b
JOIN _badge_id_map m ON m.key = b.key
WHERE ub.badge_id = b.id;

UPDATE public.questlines q
SET badge_reward_id = m.new_id
FROM public.badges b
JOIN _badge_id_map m ON m.key = b.key
WHERE q.badge_reward_id = b.id;

UPDATE public.badges b
SET id = m.new_id
FROM _badge_id_map m
WHERE m.key = b.key;

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

COMMIT;
