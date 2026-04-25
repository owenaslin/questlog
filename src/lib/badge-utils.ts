import { Badge } from "./types";

// Requirement hint generators by type
const requirementFormatters: Record<string, (b: Badge) => string> = {
  total_quests: (b) => `Complete ${b.requirement_value} quests`,
  category_count: (b) => `Complete ${b.requirement_value} ${b.requirement_category || ""} quests`.trim(),
  main_quests: (b) => `Complete ${b.requirement_value} main quest${b.requirement_value > 1 ? "s" : ""}`,
  questlines_completed: (b) => `Complete ${b.requirement_value} questline${b.requirement_value > 1 ? "s" : ""}`,
  level_reached: (b) => `Reach Level ${b.requirement_value}`,
  unique_categories: (b) => `Try quests from ${b.requirement_value} different categories`,
  side_quests: (b) => `Complete ${b.requirement_value} side quest${b.requirement_value > 1 ? "s" : ""}`,
  weekend_warrior: () => "Complete 3 quests during a weekend",
  streak_days: (b) => `Maintain a ${b.requirement_value}-day quest streak`,
  all_questlines: () => "Complete questlines in every category",
};

export function getRequirementHint(badge: Badge): string {
  return requirementFormatters[badge.requirement_type]?.(badge) ?? "Keep completing quests to unlock!";
}

// Background color by rarity (for showcase)
export const rarityBgClasses: Record<Badge["rarity"], string> = {
  common: "bg-retro-gray",
  rare: "bg-retro-blue",
  epic: "bg-retro-purple",
  legendary: "bg-gradient-to-br from-retro-yellow to-retro-orange",
};
