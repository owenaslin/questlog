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
  difficulty: "beginner" | "intermediate" | "advanced";
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

// ============================================
// HABITS SYSTEM TYPES
// ============================================

export type HabitRecurrenceType = "daily" | "weekdays" | "interval" | "weekly";

export interface HabitRecurrenceData {
  // For 'weekdays': array of day indices (0=Sun, 1=Mon, etc.)
  days?: number[];
  // For 'interval': number of days between occurrences
  intervalDays?: number;
  // For 'weekly': day of week (0-6)
  dayOfWeek?: number;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  recurrence_type: HabitRecurrenceType;
  recurrence_data: HabitRecurrenceData;
  xp_reward: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  xp_awarded: number;
  completion_date: string;
  created_at: string;
}

export interface HabitStreak {
  id: string;
  habit_id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  updated_at: string;
}

// Extended habit with computed fields for UI
export interface HabitWithStatus extends Habit {
  streak: HabitStreak | null;
  is_completed_today: boolean;
  completions_this_week: number;
}

