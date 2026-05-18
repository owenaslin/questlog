import { durationLabelToMinutes, calcQuestXP } from "@/lib/xp";
import { Quest } from "@/lib/types";

type QuestInput = {
  title: string;
  description: string;
  type: "main" | "side";
  difficulty: number;
  duration_label: string;
  category: string;
  xp_reward?: number;
};

export function defineQuest(input: QuestInput): Omit<Quest, "id" | "created_at" | "user_id"> {
  const duration_minutes = durationLabelToMinutes(input.duration_label);
  return {
    ...input,
    source: "predefined",
    location: null,
    status: "available",
    duration_minutes,
    xp_reward: input.xp_reward ?? calcQuestXP(input.type, duration_minutes, input.difficulty),
  };
}
