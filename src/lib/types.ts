import { BASE_MAIN_QUEST_XP, BASE_SIDE_QUEST_XP } from "@/lib/constants";

export type QuestType = "main" | "side";
export type QuestSource = "predefined" | "user" | "ai";
export type QuestStatus = "available" | "active" | "completed";

export const QUEST_CATEGORIES = [
  "Fitness", "Education", "Creative", "Tech", "Food", "Outdoors",
  "Social", "Wellness", "Community", "Career", "Business", "Culture", "Productivity",
] as const;
export type QuestCategory = typeof QUEST_CATEGORIES[number];
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";
export type QuestlineType = "linear" | "skill_tree";
export type QuestDifficulty = "beginner" | "intermediate" | "advanced";

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  source: QuestSource;
  difficulty: number; // 1-5
  xp_reward: number;
  duration_label: string;
  category: string;
  location: string | null;
  status: QuestStatus;
  user_id: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  xp_total: number;
  level: number;
  created_at: string;
}

export interface HeroProfile {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_sprite: string;
  is_public: boolean;
  title: string | null;
  xp_total: number;
  level: number;
  created_at: string;
}

export interface PinnedQuest {
  id: string;
  quest_id: string;
  quest_title: string;
  quest_type: QuestType;
  quest_xp_reward: number;
  position: number;
  pinned_at: string;
}

export const AVATAR_PORTRAITS = {
  wizard:  { label: "Wizard",   emoji: "🧙", bg: "#5d275d" },
  warrior: { label: "Warrior",  emoji: "⚔",  bg: "#b13e53" },
  rogue:   { label: "Rogue",    emoji: "🗡",  bg: "#333c57" },
  ranger:  { label: "Ranger",   emoji: "🏹",  bg: "#257179" },
  bard:    { label: "Bard",     emoji: "🎵",  bg: "#29366f" },
  paladin: { label: "Paladin",  emoji: "🛡",  bg: "#8b5a2b" },
  druid:   { label: "Druid",    emoji: "🌿",  bg: "#38b764" },
  cleric:  { label: "Cleric",   emoji: "✨",  bg: "#3b5dc9" },
} as const;

export type AvatarKey = keyof typeof AVATAR_PORTRAITS;

export function deriveTitle(topCategory: string | null, level: number): string {
  const ranks = ["Initiate", "Adept", "Expert", "Master", "Legend"];
  const rank = ranks[Math.min(Math.floor(level / 5), ranks.length - 1)];
  if (!topCategory) return `${rank} Adventurer`;
  const guild = topCategory.charAt(0).toUpperCase() + topCategory.slice(1);
  return `${rank} of the ${guild} Guild`;
}

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  requirement_type: string;
  requirement_value: number;
  requirement_category?: string;
  earned_at?: string;
}

export interface QuestlineStep {
  id: string;
  questline_id?: string;
  quest_id: string;
  quest?: Quest;
  step_number?: number;
  parent_step_id?: string;
  branch_name?: string;
  unlock_requirement?: string;
  is_starting_step: boolean;
  is_unlocked: boolean;
  is_completed: boolean;
}

export interface Questline {
  id: string;
  title: string;
  description: string;
  type: QuestlineType;
  category: string;
  difficulty: QuestDifficulty;
  total_xp: number;
  badge_reward?: Badge;
  steps: QuestlineStep[];
  is_active?: boolean;
  progress?: {
    completed_steps: number;
    total_steps: number;
    is_completed: boolean;
    current_step_id?: string;
  };
}

export interface Category {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  quest_count: number;
}

export function calculateXP(type: QuestType, difficulty: number): number {
  const base = type === "main" ? BASE_MAIN_QUEST_XP : BASE_SIDE_QUEST_XP;
  return difficulty * base;
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function xpForNextLevel(currentXP: number): {
  current: number;
  needed: number;
} {
  const level = calculateLevel(currentXP);
  const xpForCurrentLevel = (level - 1) * 500;
  return {
    current: currentXP - xpForCurrentLevel,
    needed: 500,
  };
}
