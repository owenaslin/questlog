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

