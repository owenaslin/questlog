-- Quest step progress: tracks which steps a user has completed for active quests.
-- Steps are keyed by the stable step.id from the quest definition, not a FK,
-- since predefined quests live in application code rather than the quests table.

CREATE TABLE IF NOT EXISTS user_quest_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id, step_id)
);

ALTER TABLE user_quest_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quest steps"
  ON user_quest_steps
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_quest_steps_lookup ON user_quest_steps(user_id, quest_id);
