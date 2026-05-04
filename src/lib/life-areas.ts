import { Quest } from "@/lib/types";

export type LifeAreaKey = "body" | "mind" | "craft" | "connection" | "adventure" | "discipline";

export interface LifeAreaDefinition {
  key: LifeAreaKey;
  name: string;
  icon: string;
  description: string;
  categories: string[];
}

export interface LifeAreaScore extends LifeAreaDefinition {
  questCount: number;
  xpTotal: number;
  percentage: number;
}

export const LIFE_AREAS: LifeAreaDefinition[] = [
  {
    key: "body",
    name: "Body",
    icon: "💪",
    description: "Health, movement, food, and recovery",
    categories: ["Fitness", "Food", "Wellness"],
  },
  {
    key: "mind",
    name: "Mind",
    icon: "🧠",
    description: "Learning, technical skill, and culture",
    categories: ["Education", "Tech", "Culture"],
  },
  {
    key: "craft",
    name: "Craft",
    icon: "🎨",
    description: "Creative output, career growth, and business building",
    categories: ["Creative", "Business", "Career"],
  },
  {
    key: "connection",
    name: "Connection",
    icon: "🤝",
    description: "Relationships, community, and shared experiences",
    categories: ["Social", "Community"],
  },
  {
    key: "adventure",
    name: "Adventure",
    icon: "🌲",
    description: "Exploration, novelty, and getting out into the world",
    categories: ["Outdoors", "Culture"],
  },
  {
    key: "discipline",
    name: "Discipline",
    icon: "⚡",
    description: "Systems, habits, routines, and follow-through",
    categories: ["Productivity", "Lifestyle"],
  },
];

export function calculateLifeAreaScores(completedQuests: Quest[]): LifeAreaScore[] {
  const maxXp = Math.max(1, ...LIFE_AREAS.map((area) => {
    return completedQuests
      .filter((quest) => area.categories.includes(quest.category) || (area.key === "adventure" && quest.type === "side"))
      .reduce((sum, quest) => sum + quest.xp_reward, 0);
  }));

  return LIFE_AREAS.map((area) => {
    const matchingQuests = completedQuests.filter(
      (quest) => area.categories.includes(quest.category) || (area.key === "adventure" && quest.type === "side")
    );
    const xpTotal = matchingQuests.reduce((sum, quest) => sum + quest.xp_reward, 0);

    return {
      ...area,
      questCount: matchingQuests.length,
      xpTotal,
      percentage: Math.round((xpTotal / maxXp) * 100),
    };
  });
}

export function getStrongestLifeArea(scores: LifeAreaScore[]): LifeAreaScore | null {
  return [...scores].sort((a, b) => b.xpTotal - a.xpTotal)[0] ?? null;
}

export function getNeglectedLifeArea(scores: LifeAreaScore[]): LifeAreaScore | null {
  return [...scores].sort((a, b) => a.xpTotal - b.xpTotal)[0] ?? null;
}
