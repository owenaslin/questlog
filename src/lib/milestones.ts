import { Quest } from "@/lib/types";

export interface Milestone {
  type: "streak" | "category_mastery" | "level_up" | "first_quest" | "total_quests";
  value: number;
  category?: string;
  title: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const STREAK_MILESTONES = [7, 30, 100, 365];
const CATEGORY_MASTERY_THRESHOLD = 10;
const TOTAL_QUEST_MILESTONES = [10, 25, 50, 100];

export function detectMilestones({
  questJustCompleted,
  newStreak,
  oldStreak,
  newLevel,
  oldLevel,
  totalCompleted,
  completedByCategory,
  isFirstQuest,
}: {
  questJustCompleted: Quest;
  newStreak: number;
  oldStreak: number;
  newLevel: number;
  oldLevel: number;
  totalCompleted: number;
  completedByCategory: Record<string, number>;
  isFirstQuest: boolean;
}): Milestone[] {
  const milestones: Milestone[] = [];

  // First quest milestone
  if (isFirstQuest) {
    milestones.push({
      type: "first_quest",
      value: 1,
      title: "First Blood",
      description: "You completed your first quest. The legend begins!",
      rarity: "rare",
    });
  }

  // Streak milestones (only if we hit an exact milestone number)
  if (STREAK_MILESTONES.includes(newStreak) && newStreak > oldStreak) {
    const rarity = newStreak >= 100 ? "legendary" : newStreak >= 30 ? "epic" : "rare";
    milestones.push({
      type: "streak",
      value: newStreak,
      title: `${newStreak}-Day Streak!`,
      description: `Incredible dedication. ${newStreak} days of consecutive victories!`,
      rarity,
    });
  }

  // Level up milestone
  if (newLevel > oldLevel) {
    milestones.push({
      type: "level_up",
      value: newLevel,
      title: `Level ${newLevel} Reached!`,
      description: `You have grown stronger. Welcome to level ${newLevel}!`,
      rarity: newLevel >= 20 ? "legendary" : newLevel >= 10 ? "epic" : "rare",
    });
  }

  // Category mastery
  const category = questJustCompleted.category;
  const categoryCount = completedByCategory[category] || 0;
  if (categoryCount === CATEGORY_MASTERY_THRESHOLD) {
    milestones.push({
      type: "category_mastery",
      value: categoryCount,
      category,
      title: `${category} Master!`,
      description: `You have completed ${categoryCount} ${category} quests. True mastery achieved!`,
      rarity: "epic",
    });
  }

  // Total quest milestones
  if (TOTAL_QUEST_MILESTONES.includes(totalCompleted)) {
    const rarity = totalCompleted >= 100 ? "legendary" : totalCompleted >= 50 ? "epic" : "rare";
    milestones.push({
      type: "total_quests",
      value: totalCompleted,
      title: `${totalCompleted} Quests Complete!`,
      description: `A true hero. You have completed ${totalCompleted} quests!`,
      rarity,
    });
  }

  return milestones;
}

export function getMilestoneColor(rarity: Milestone["rarity"]): string {
  switch (rarity) {
    case "legendary":
      return "#fbbf24"; // gold
    case "epic":
      return "#a855f7"; // purple
    case "rare":
      return "#3b82f6"; // blue
    default:
      return "#22c55e"; // green
  }
}

export function getMilestoneAnimation(rarity: Milestone["rarity"]): string {
  switch (rarity) {
    case "legendary":
      return "shake-gold";
    case "epic":
      return "pulse-purple";
    case "rare":
      return "pulse-blue";
    default:
      return "pulse";
  }
}
