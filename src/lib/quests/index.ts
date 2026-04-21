// Quest Library - Organized by Category
// Total: 120+ quests across 10 categories

import { Quest } from "@/lib/types";

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

// Get random quest (returns undefined if ALL_QUESTS is empty)
export function getRandomQuest(): Quest | undefined {
  return ALL_QUESTS[Math.floor(Math.random() * ALL_QUESTS.length)];
}

/**
 * Returns three quests for "Tonight's Hand", seeded by today's date so the
 * same three appear all day and rotate at midnight (UTC — users in other
 * timezones will see the new set at their local equivalent of UTC midnight).
 * Completed quests are excluded so returning users always see fresh options.
 *
 * Layout: side · main · side (main quest in the centre card).
 */
export function getDailyQuests(excludeCompletedIds: string[] = []): Quest[] {
  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-04-21" (UTC)
  const seed  = today.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
  // Deterministic pseudo-random value per (seed, index) pair
  const rand  = (i: number) => { const x = Math.sin(i + seed) * 10000; return x - Math.floor(x); };

  const excluded = new Set(excludeCompletedIds);
  const eligible = ALL_QUESTS.filter((q) => !excluded.has(q.id));
  const shuffled = [...eligible]
    .map((q, i) => ({ q, sort: rand(i) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ q }) => q);

  // Aim for variety: one main flanked by two sides. Fall back to first 3 if
  // the user has completed too many of one type to satisfy the layout.
  const mains = shuffled.filter((q) => q.type === "main").slice(0, 1);
  const sides = shuffled.filter((q) => q.type === "side").slice(0, 2);
  if (mains.length && sides.length >= 2) return [sides[0], mains[0], sides[1]];
  return shuffled.slice(0, 3);
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
