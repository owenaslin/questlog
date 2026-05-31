// Quest Library - Organized by Category
// Total: 244 quests across 14 categories

import { Quest } from "@/lib/types";

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

export { CATEGORIES, getCategoryByKey } from "./categories";

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

/**
 * Returns three quests for "Tonight's Hand", seeded by today's date so the
 * same three appear all day and rotate at midnight (UTC — users in other
 * timezones will see the new set at their local equivalent of UTC midnight).
 * Completed quests are excluded so returning users always see fresh options.
 */
export function getDailyQuests(excludeCompletedIds: string[] = []): Quest[] {
  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-04-21" (UTC)
  const seed  = today.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
  // Deterministic pseudo-random value per (seed, index) pair
  const rand  = (i: number) => { const x = Math.sin(i + seed) * 10000; return x - Math.floor(x); };

  const excluded = new Set(excludeCompletedIds);
  return ALL_QUESTS
    .filter((q) => !excluded.has(q.id))
    .map((q, i) => ({ q, sort: rand(i) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ q }) => q)
    .slice(0, 3);
}

/**
 * Returns random quests for "Draw Again" re-roll, excluding currently
 * displayed quests to ensure variety.
 */
export function getRandomQuests(excludeIds: string[] = []): Quest[] {
  const timestamp = Date.now();
  const rand = (i: number) => {
    const x = Math.sin(i + timestamp) * 10000;
    return x - Math.floor(x);
  };

  const excluded = new Set(excludeIds);
  return ALL_QUESTS
    .filter((q) => !excluded.has(q.id))
    .map((q, i) => ({ q, sort: rand(i) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ q }) => q)
    .slice(0, 3);
}

