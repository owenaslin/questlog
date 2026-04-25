// Quest Library - Organized by Category
// Total: 160+ quests across 14 categories

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
import { BUSINESS_QUESTS_WITH_IDS } from "./business";
import { COMMUNITY_QUESTS_WITH_IDS } from "./community";
import { CULTURE_QUESTS_WITH_IDS } from "./culture";
import { PRODUCTIVITY_QUESTS_WITH_IDS } from "./productivity";

export { CATEGORIES, getCategoryByKey, getCategoryColor } from "./categories";

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
  ...BUSINESS_QUESTS_WITH_IDS,
  ...COMMUNITY_QUESTS_WITH_IDS,
  ...CULTURE_QUESTS_WITH_IDS,
  ...PRODUCTIVITY_QUESTS_WITH_IDS,
];

// Get main quests only
export function getMainQuests(): Quest[] {
  return ALL_QUESTS.filter((q) => q.type === "main");
}

// Get side quests only
export function getSideQuests(): Quest[] {
  return ALL_QUESTS.filter((q) => q.type === "side");
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

/**
 * Get 3 random quests for "Draw Again" feature.
 * Uses timestamp-based randomization to ensure different results each time.
 * Excludes the currently shown quest IDs.
 */
export function getRandomQuests(excludeIds: string[] = []): Quest[] {
  const timestamp = Date.now();
  const rand = (i: number) => {
    const x = Math.sin(i + timestamp) * 10000;
    return x - Math.floor(x);
  };

  const excluded = new Set(excludeIds);
  const eligible = ALL_QUESTS.filter((q) => !excluded.has(q.id));
  const shuffled = [...eligible]
    .map((q, i) => ({ q, sort: rand(i) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ q }) => q);

  // Aim for variety: one main flanked by two sides
  const mains = shuffled.filter((q) => q.type === "main").slice(0, 1);
  const sides = shuffled.filter((q) => q.type === "side").slice(0, 2);
  if (mains.length && sides.length >= 2) return [sides[0], mains[0], sides[1]];
  return shuffled.slice(0, 3);
}

