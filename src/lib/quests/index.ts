// Quest Library - Organized by Category
// Total: 120+ quests across 10 categories

import { Quest, Category } from "@/lib/types";

import { CATEGORIES } from "./categories";
import { FITNESS_QUESTS_WITH_IDS } from "./fitness";
import { CREATIVE_QUESTS_WITH_IDS } from "./creative";
import { TECH_QUESTS_WITH_IDS } from "./tech";
import { EDUCATION_QUESTS_WITH_IDS } from "./education";
import { SOCIAL_QUESTS_WITH_IDS } from "./social";
import { OUTDOORS_QUESTS_WITH_IDS } from "./outdoors";
import { WELLNESS_QUESTS_WITH_IDS } from "./wellness";
import { FOOD_QUESTS_WITH_IDS } from "./food";
import { CAREER_QUESTS_WITH_IDS } from "./career";
import { LIFESTYLE_QUESTS_WITH_IDS } from "./lifestyle";

export { CATEGORIES, getCategoryByKey, getCategoryColor } from "./categories";
export { FITNESS_QUESTS_WITH_IDS as FITNESS_QUESTS } from "./fitness";
export { CREATIVE_QUESTS_WITH_IDS as CREATIVE_QUESTS } from "./creative";
export { TECH_QUESTS_WITH_IDS as TECH_QUESTS } from "./tech";
export { EDUCATION_QUESTS_WITH_IDS as EDUCATION_QUESTS } from "./education";
export { SOCIAL_QUESTS_WITH_IDS as SOCIAL_QUESTS } from "./social";
export { OUTDOORS_QUESTS_WITH_IDS as OUTDOORS_QUESTS } from "./outdoors";
export { WELLNESS_QUESTS_WITH_IDS as WELLNESS_QUESTS } from "./wellness";
export { FOOD_QUESTS_WITH_IDS as FOOD_QUESTS } from "./food";
export { CAREER_QUESTS_WITH_IDS as CAREER_QUESTS } from "./career";
export { LIFESTYLE_QUESTS_WITH_IDS as LIFESTYLE_QUESTS } from "./lifestyle";

// Combined quest library
export const ALL_QUESTS: Quest[] = [
  ...FITNESS_QUESTS_WITH_IDS,
  ...CREATIVE_QUESTS_WITH_IDS,
  ...TECH_QUESTS_WITH_IDS,
  ...EDUCATION_QUESTS_WITH_IDS,
  ...SOCIAL_QUESTS_WITH_IDS,
  ...OUTDOORS_QUESTS_WITH_IDS,
  ...WELLNESS_QUESTS_WITH_IDS,
  ...FOOD_QUESTS_WITH_IDS,
  ...CAREER_QUESTS_WITH_IDS,
  ...LIFESTYLE_QUESTS_WITH_IDS,
];

// Get quests by category
export function getQuestsByCategory(category: string): Quest[] {
  return ALL_QUESTS.filter((q) => q.category.toLowerCase() === category.toLowerCase());
}

// Get main quests only
export function getMainQuests(): Quest[] {
  return ALL_QUESTS.filter((q) => q.type === "main");
}

// Get side quests only
export function getSideQuests(): Quest[] {
  return ALL_QUESTS.filter((q) => q.type === "side");
}

// Get quests by difficulty
export function getQuestsByDifficulty(difficulty: number): Quest[] {
  return ALL_QUESTS.filter((q) => q.difficulty === difficulty);
}

// Get random quest
export function getRandomQuest(): Quest {
  return ALL_QUESTS[Math.floor(Math.random() * ALL_QUESTS.length)];
}

// Quest counts (computed from actual data to prevent drift)
export const QUEST_COUNTS = {
  total: ALL_QUESTS.length,
  main: getMainQuests().length,
  side: getSideQuests().length,
  byCategory: Object.fromEntries(
    CATEGORIES.map((cat) => [
      cat.key,
      ALL_QUESTS.filter((q) => q.category.toLowerCase() === cat.key.toLowerCase()).length,
    ])
  ) as Record<string, number>,
};
