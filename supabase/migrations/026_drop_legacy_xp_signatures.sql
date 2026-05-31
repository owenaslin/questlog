-- ============================================
-- DROP LEGACY XP FUNCTION SIGNATURES
-- ============================================
-- Completes the zero-downtime migration started in 021. Safe to apply once
-- all production deployments are confirmed on the new code (the 4-arg
-- complete_quest_atomic and the (UUID, UUID, TEXT) update_weekly_activity).
--
-- The old signatures accepted XP as a client-supplied parameter (p_xp),
-- which allowed an authenticated attacker to mint arbitrary XP by calling
-- the RPCs directly via PostgREST. The new signatures look XP up from
-- public.quests.xp_reward server-side.
-- ============================================

DROP FUNCTION IF EXISTS public.complete_quest_atomic(UUID, UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_weekly_activity(UUID, INTEGER, TEXT);
