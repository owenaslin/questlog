export type QuestType = "main" | "side";
export type QuestSource = "predefined" | "user" | "ai";
export type QuestStatus = "available" | "active" | "completed";
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
  const base = type === "main" ? 200 : 50;
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
