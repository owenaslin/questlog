import { Category } from "@/lib/types";

export const CATEGORIES: Category[] = [
  {
    key: "fitness",
    name: "Fitness",
    description: "Physical challenges to build strength, endurance, and healthy habits",
    icon: "💪",
    color: "#ef4444",
    quest_count: 15,
  },
  {
    key: "creative",
    name: "Creative",
    description: "Express yourself through art, music, writing, and crafts",
    icon: "🎨",
    color: "#a855f7",
    quest_count: 15,
  },
  {
    key: "tech",
    name: "Tech",
    description: "Learn coding, build projects, and master digital skills",
    icon: "💻",
    color: "#3b82f6",
    quest_count: 15,
  },
  {
    key: "education",
    name: "Education",
    description: "Expand your knowledge through reading, languages, and learning",
    icon: "📚",
    color: "#f59e0b",
    quest_count: 15,
  },
  {
    key: "social",
    name: "Social",
    description: "Connect with others through events, volunteering, and networking",
    icon: "🤝",
    color: "#ec4899",
    quest_count: 10,
  },
  {
    key: "outdoors",
    name: "Outdoors",
    description: "Explore nature, hike trails, and embrace adventure",
    icon: "🌲",
    color: "#22c55e",
    quest_count: 10,
  },
  {
    key: "wellness",
    name: "Wellness",
    description: "Care for your mind and body through meditation and self-care",
    icon: "🧘",
    color: "#14b8a6",
    quest_count: 10,
  },
  {
    key: "food",
    name: "Food",
    description: "Cook, bake, and explore culinary adventures",
    icon: "🍳",
    color: "#f97316",
    quest_count: 10,
  },
  {
    key: "career",
    name: "Career",
    description: "Advance professionally through skills, networking, and certifications",
    icon: "💼",
    color: "#6366f1",
    quest_count: 10,
  },
  {
    key: "lifestyle",
    name: "Lifestyle",
    description: "Improve daily habits, organization, and personal productivity",
    icon: "✨",
    color: "#8b5cf6",
    quest_count: 10,
  },
];

export function getCategoryByKey(key: string): Category | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export function getCategoryColor(key: string): string {
  return getCategoryByKey(key)?.color || "#6b7280";
}
