-- quest_id was defined as TEXT in 006_hero_sharing.sql.
-- Cast to UUID to match every other quest-reference column in the schema.
-- No FK added: predefined quests are not stored in the quests table.
ALTER TABLE public.pinned_quests
  ALTER COLUMN quest_id TYPE UUID USING quest_id::uuid;
