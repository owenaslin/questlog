import { ALL_QUESTS } from "@/lib/quests";
import { EnergyLevel, Quest } from "@/lib/types";

export type QuestVibe = "productive" | "adventurous" | "social" | "cozy" | "creative" | "healthy" | "chaotic_good";

export const TIME_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "Half day" },
] as const;

export const ENERGY_OPTIONS: Array<{ value: EnergyLevel; label: string; hint: string }> = [
  { value: "low", label: "Low", hint: "Gentle, low-friction quests" },
  { value: "normal", label: "Normal", hint: "Balanced daily adventures" },
  { value: "high", label: "High", hint: "Bigger challenges and outings" },
];

export interface QuestPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  categories: string[];
  vibes: QuestVibe[];
  maxDifficulty?: number;
  sideOnly?: boolean;
  durationMinutesMax?: number;
}

export const QUEST_PACKS: QuestPack[] = [
  {
    id: "rainy-day",
    title: "Rainy Day Quests",
    description: "Cozy indoor quests for low-friction progress.",
    icon: "🌧",
    categories: ["Creative", "Education", "Wellness", "Productivity", "Food"],
    vibes: ["cozy", "creative", "productive"],
    maxDifficulty: 3,
    durationMinutesMax: 120,
  },
  {
    id: "low-energy-reset",
    title: "Low Energy Reset",
    description: "Gentle quests for days when you want momentum without burnout.",
    icon: "🕯",
    categories: ["Wellness", "Food", "Productivity"],
    vibes: ["cozy", "healthy"],
    maxDifficulty: 2,
    durationMinutesMax: 60,
  },
  {
    id: "get-out-of-the-house",
    title: "Get Out of the House",
    description: "Small adventures that break routine and get you moving.",
    icon: "🚪",
    categories: ["Outdoors", "Culture", "Food", "Social"],
    vibes: ["adventurous", "social"],
    sideOnly: true,
  },
  {
    id: "become-more-social",
    title: "Become More Social",
    description: "Quests for connection, community, and low-stakes courage.",
    icon: "🤝",
    categories: ["Social", "Community", "Culture"],
    vibes: ["social", "chaotic_good"],
  },
  {
    id: "weekend-adventure",
    title: "Weekend Adventure",
    description: "Bigger side quests and outings for open-ended days.",
    icon: "🗺",
    categories: ["Outdoors", "Culture", "Food", "Creative"],
    vibes: ["adventurous", "creative"],
    sideOnly: true,
  },
  {
    id: "skill-builder",
    title: "Skill Builder",
    description: "Learn something useful and stack long-term capability.",
    icon: "🛠",
    categories: ["Education", "Tech", "Career", "Business"],
    vibes: ["productive"],
  },
  {
    id: "cheap-free-fun",
    title: "Cheap/Free Fun",
    description: "Novelty and enjoyment without requiring a big budget.",
    icon: "🪙",
    categories: ["Outdoors", "Creative", "Social", "Culture", "Wellness"],
    vibes: ["adventurous", "cozy", "creative"],
    sideOnly: true,
    maxDifficulty: 3,
  },
  {
    id: "touch-grass",
    title: "Touch Grass Mode",
    description: "A direct intervention for screen-heavy days.",
    icon: "🌿",
    categories: ["Outdoors", "Fitness", "Wellness"],
    vibes: ["healthy", "adventurous"],
    sideOnly: true,
  },
  {
    id: "creative-spark",
    title: "Creative Spark",
    description: "Make, write, cook, shoot, sketch, or experiment.",
    icon: "✨",
    categories: ["Creative", "Food", "Culture"],
    vibes: ["creative", "cozy"],
  },
  {
    id: "life-admin-cleanup",
    title: "Life Admin Cleanup",
    description: "Practical quests that make future-you breathe easier.",
    icon: "📋",
    categories: ["Productivity", "Lifestyle", "Career"],
    vibes: ["productive"],
    maxDifficulty: 3,
  },
];

export function getQuestPackById(id: string): QuestPack | undefined {
  return QUEST_PACKS.find((pack) => pack.id === id);
}

export function getQuestsForPack(pack: QuestPack, excludeQuestIds: string[] = []): Quest[] {
  const excluded = new Set(excludeQuestIds);
  return ALL_QUESTS.filter((quest) => {
    if (excluded.has(quest.id)) return false;
    if (pack.sideOnly && quest.type !== "side") return false;
    if (pack.maxDifficulty && quest.difficulty > pack.maxDifficulty) return false;
    if (pack.durationMinutesMax && (quest.duration_minutes ?? 9999) > pack.durationMinutesMax) return false;
    return pack.categories.includes(quest.category);
  }).slice(0, 12);
}

export function drawQuestsByMood(input: {
  availableTimeMinutes: number;
  energyLevel: "low" | "normal" | "high";
  vibe: QuestVibe;
  excludeQuestIds?: string[];
  preferredCategories?: string[];
}): Quest[] {
  const excluded = new Set(input.excludeQuestIds ?? []);
  const preferredCategories = new Set(input.preferredCategories ?? []);
  const matchingPacks = QUEST_PACKS.filter((pack) => pack.vibes.includes(input.vibe));
  const matchingCategories = new Set(matchingPacks.flatMap((pack) => pack.categories));
  const maxDifficulty = input.energyLevel === "low" ? 2 : input.energyLevel === "normal" ? 3 : 5;

  const candidates = ALL_QUESTS.filter((quest) => {
    if (excluded.has(quest.id)) return false;
    if (!matchingCategories.has(quest.category)) return false;
    if (quest.difficulty > maxDifficulty) return false;
    if ((quest.duration_minutes ?? 9999) > input.availableTimeMinutes * 2) return false;
    return true;
  });

  // If user has preferred categories, boost quests from those categories
  if (preferredCategories.size > 0) {
    candidates.sort((a, b) => {
      const aPreferred = preferredCategories.has(a.category) ? 1 : 0;
      const bPreferred = preferredCategories.has(b.category) ? 1 : 0;
      if (bPreferred !== aPreferred) return bPreferred - aPreferred;
      return a.difficulty - b.difficulty || b.xp_reward - a.xp_reward;
    });
  } else {
    candidates.sort((a, b) => a.difficulty - b.difficulty || b.xp_reward - a.xp_reward);
  }

  return candidates.slice(0, 3);
}
