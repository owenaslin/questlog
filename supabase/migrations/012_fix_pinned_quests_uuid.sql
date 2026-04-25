-- Migration: Fix pinned_quests.quest_id column type
--
-- quest_id was defined as TEXT in 006_hero_sharing.sql.
-- Every other quest-reference column in the schema uses UUID.
-- Casting to UUID enforces valid UUID syntax at the Postgres level and
-- avoids implicit casts in any future joins against quests.id.
--
-- NOTE: No FK constraint is added because predefined quests (~160 entries)
-- are generated in-memory from src/lib/quests/*.ts and are NOT stored in the
-- DB quests table. A FK would silently reject all pinned predefined quests.
-- Revisit once predefined quests are either seeded into the DB or the pin
-- logic separates predefined vs user-created IDs.

ALTER TABLE public.pinned_quests
  ALTER COLUMN quest_id TYPE UUID USING quest_id::uuid;
