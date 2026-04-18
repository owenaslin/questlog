import { Badge } from "@/lib/types";
import { generateStableId } from "@/lib/seed-quests";

// Badge definitions with requirements
export const BADGE_DEFINITIONS: Omit<Badge, "id" | "earned_at">[] = [
  // ============================================
  // COMMON BADGES (Easy to get, encourage participation)
  // ============================================
  {
    key: "first_steps",
    name: "First Steps",
    description: "Complete your first quest and begin your journey",
    icon: "🥾",
    rarity: "common",
    requirement_type: "total_quests",
    requirement_value: 1,
  },
  {
    key: "jack_of_all_trades",
    name: "Jack of All Trades",
    description: "Complete quests in 5 different categories",
    icon: "🎭",
    rarity: "common",
    requirement_type: "unique_categories",
    requirement_value: 5,
  },
  {
    key: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Complete 3 quests in one weekend",
    icon: "🏃",
    rarity: "common",
    requirement_type: "weekend_quests",
    requirement_value: 3,
  },
  {
    key: "side_quest_explorer",
    name: "Side Quest Explorer",
    description: "Complete 10 side quests",
    icon: "🗡",
    rarity: "common",
    requirement_type: "side_quests",
    requirement_value: 10,
  },
  {
    key: "getting_started",
    name: "Getting Started",
    description: "Reach Level 2",
    icon: "⭐",
    rarity: "common",
    requirement_type: "level_reached",
    requirement_value: 2,
  },

  // ============================================
  // RARE BADGES (Moderate effort required)
  // ============================================
  {
    key: "fitness_fanatic",
    name: "Fitness Fanatic",
    description: "Complete 10 fitness quests",
    icon: "💪",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 10,
    requirement_category: "Fitness",
  },
  {
    key: "bookworm",
    name: "Bookworm",
    description: "Complete 5 education quests",
    icon: "📚",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 5,
    requirement_category: "Education",
  },
  {
    key: "creative_soul",
    name: "Creative Soul",
    description: "Complete 10 creative quests",
    icon: "🎨",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 10,
    requirement_category: "Creative",
  },
  {
    key: "tech_enthusiast",
    name: "Tech Enthusiast",
    description: "Complete 10 tech quests",
    icon: "💻",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 10,
    requirement_category: "Tech",
  },
  {
    key: "social_butterfly",
    name: "Social Butterfly",
    description: "Complete 5 social quests",
    icon: "🦋",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 5,
    requirement_category: "Social",
  },
  {
    key: "nature_lover",
    name: "Nature Lover",
    description: "Complete 5 outdoors quests",
    icon: "🌲",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 5,
    requirement_category: "Outdoors",
  },
  {
    key: "mindful_practitioner",
    name: "Mindful Practitioner",
    description: "Complete 5 wellness quests",
    icon: "🧘",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 5,
    requirement_category: "Wellness",
  },
  {
    key: "foodie",
    name: "Foodie",
    description: "Complete 5 food quests",
    icon: "🍳",
    rarity: "rare",
    requirement_type: "category_count",
    requirement_value: 5,
    requirement_category: "Food",
  },
  {
    key: "main_quest_hero",
    name: "Main Quest Hero",
    description: "Complete your first main quest",
    icon: "⚔️",
    rarity: "rare",
    requirement_type: "main_quests",
    requirement_value: 1,
  },
  {
    key: "level_5",
    name: "Rising Star",
    description: "Reach Level 5",
    icon: "🌟",
    rarity: "rare",
    requirement_type: "level_reached",
    requirement_value: 5,
  },
  {
    key: "quest_collector",
    name: "Quest Collector",
    description: "Complete 25 quests of any type",
    icon: "📜",
    rarity: "rare",
    requirement_type: "total_quests",
    requirement_value: 25,
  },

  // ============================================
  // EPIC BADGES (Significant commitment)
  // ============================================
  {
    key: "marathoner",
    name: "Marathoner",
    description: "Complete 5 main quests",
    icon: "🏆",
    rarity: "epic",
    requirement_type: "main_quests",
    requirement_value: 5,
  },
  {
    key: "questline_master",
    name: "Questline Master",
    description: "Complete 3 full questlines",
    icon: "🗺️",
    rarity: "epic",
    requirement_type: "questlines_completed",
    requirement_value: 3,
  },
  {
    key: "renaissance",
    name: "Renaissance",
    description: "Complete quests in 10 different categories",
    icon: "👑",
    rarity: "epic",
    requirement_type: "unique_categories",
    requirement_value: 10,
  },
  {
    key: "category_master_fitness",
    name: "Fitness Master",
    description: "Complete 20 fitness quests",
    icon: "🏋️",
    rarity: "epic",
    requirement_type: "category_count",
    requirement_value: 20,
    requirement_category: "Fitness",
  },
  {
    key: "category_master_creative",
    name: "Creative Master",
    description: "Complete 20 creative quests",
    icon: "🎭",
    rarity: "epic",
    requirement_type: "category_count",
    requirement_value: 20,
    requirement_category: "Creative",
  },
  {
    key: "category_master_tech",
    name: "Tech Master",
    description: "Complete 20 tech quests",
    icon: "🚀",
    rarity: "epic",
    requirement_type: "category_count",
    requirement_value: 20,
    requirement_category: "Tech",
  },
  {
    key: "level_10",
    name: "Seasoned Adventurer",
    description: "Reach Level 10",
    icon: "💎",
    rarity: "epic",
    requirement_type: "level_reached",
    requirement_value: 10,
  },
  {
    key: "dedicated",
    name: "Dedicated",
    description: "Complete 50 quests total",
    icon: "🔥",
    rarity: "epic",
    requirement_type: "total_quests",
    requirement_value: 50,
  },

  // ============================================
  // LEGENDARY BADGES (Exceptional dedication)
  // ============================================
  {
    key: "completionist",
    name: "Completionist",
    description: "Complete 100 quests of any type",
    icon: "👑",
    rarity: "legendary",
    requirement_type: "total_quests",
    requirement_value: 100,
  },
  {
    key: "legend_of_the_board",
    name: "Legend of the Board",
    description: "Reach Level 20",
    icon: "⚔️",
    rarity: "legendary",
    requirement_type: "level_reached",
    requirement_value: 20,
  },
  {
    key: "master_of_all",
    name: "Master of All",
    description: "Complete questlines in all categories",
    icon: "🏅",
    rarity: "legendary",
    requirement_type: "all_questlines",
    requirement_value: 1,
  },
  {
    key: "true_hero",
    name: "True Hero",
    description: "Complete 25 main quests",
    icon: "🦸",
    rarity: "legendary",
    requirement_type: "main_quests",
    requirement_value: 25,
  },
  {
    key: "unstoppable",
    name: "Unstoppable",
    description: "Maintain a 30-day streak of completing at least one quest",
    icon: "🌠",
    rarity: "legendary",
    requirement_type: "streak_days",
    requirement_value: 30,
  },
];

// Add IDs to badges
export const BADGES: Badge[] = BADGE_DEFINITIONS.map((b) => ({
  ...b,
  id: generateStableId(`badge-${b.key}`),
}));

// Get badge by key
export function getBadgeByKey(key: string): Badge | undefined {
  return BADGES.find((b) => b.key === key);
}

// Get badges by rarity
export function getBadgesByRarity(rarity: Badge["rarity"]): Badge[] {
  return BADGES.filter((b) => b.rarity === rarity);
}

// Badge rarity colors (for UI)
export const BADGE_RARITY_COLORS = {
  common: {
    bg: "bg-retro-gray",
    border: "border-retro-darkgray",
    text: "text-retro-lightgray",
    glow: "shadow-pixel",
  },
  rare: {
    bg: "bg-retro-blue",
    border: "border-retro-darkblue",
    text: "text-retro-white",
    glow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]",
  },
  epic: {
    bg: "bg-retro-purple",
    border: "border-retro-darkpurple",
    text: "text-retro-white",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.6)]",
  },
  legendary: {
    bg: "bg-gradient-to-br from-retro-yellow via-retro-orange to-retro-red",
    border: "border-retro-yellow",
    text: "text-retro-black",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.8)]",
  },
};

// Badge rarity labels
export const BADGE_RARITY_LABELS = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};
