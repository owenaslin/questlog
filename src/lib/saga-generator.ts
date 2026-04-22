import { Quest } from "@/lib/types";

export interface SagaChapter {
  type: "beginning" | "mastery" | "pivot" | "legend" | "versatile";
  category?: string;
  questCount: number;
  title: string;
  description: string;
  date?: string;
}

export interface PersonalSaga {
  title: string;
  subtitle: string;
  chapters: SagaChapter[];
  stats: {
    totalQuests: number;
    dominantCategory: string;
    categoriesExplored: number;
    longestStreak: number;
    joinedDate: string;
  };
}

interface QuestWithDate extends Quest {
  completed_at: string;
}

const MASTERY_THRESHOLD = 10;
const VERSATILE_THRESHOLD = 5;
const LEGEND_THRESHOLD = 50;

const TEMPLATES = {
  beginning: [
    "Your legend began on {date} when you completed '{quest}'. The tavern regulars still speak of that day...",
    "The chronicles start with '{quest}' on {date}. It was the first step on a grand adventure...",
    "You walked through the tavern doors on {date} and conquered '{quest}'. The quest board has never been the same...",
  ],
  mastery: [
    "You became known as a {category} specialist, completing {count} quests in that realm. '{quest}' stands as your crowning achievement...",
    "The {category} path called to you, and you answered {count} times. '{quest}' proved your mastery...",
    "While others dabbled, you dedicated yourself to {category}. {count} quests later, including '{quest}', they call you master...",
  ],
  versatile: [
    "But one path was never enough. You branched into {categories}, proving your adaptability knows no bounds...",
    "A true hero is versatile. You conquered {categories}, showing mastery across domains...",
    "The tavern bards sing of your range — {categories} all bear your mark...",
  ],
  pivot: [
    "Then came the pivot. After mastering {oldCategory}, you discovered {newCategory} and never looked back...",
    "A hero evolves. You shifted from {oldCategory} to {newCategory}, expanding your legend...",
  ],
  legend: [
    "With {count} quests behind you, your name is etched in the Hall of Heroes. The Quest Giver himself raises a mug to your legend...",
    "{count} quests. Countless victories. You have become the story others aspire to...",
    "The tavern has seen many heroes, but few as accomplished as you. {count} quests complete your legend...",
  ],
};

function pickTemplate(type: keyof typeof TEMPLATES): string {
  const options = TEMPLATES[type];
  return options[Math.floor(Math.random() * options.length)];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function generatePersonalSaga(
  completedQuests: QuestWithDate[],
  longestStreak: number,
  joinedDate: string
): PersonalSaga {
  if (completedQuests.length === 0) {
    return {
      title: "The Story Yet to Begin",
      subtitle: "Your legend awaits its first chapter...",
      chapters: [],
      stats: {
        totalQuests: 0,
        dominantCategory: "None",
        categoriesExplored: 0,
        longestStreak: 0,
        joinedDate,
      },
    };
  }

  const sortedQuests = [...completedQuests].sort(
    (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );

  // Calculate category stats
  const categoryCounts: Record<string, { count: number; quests: QuestWithDate[] }> = {};
  for (const quest of sortedQuests) {
    if (!categoryCounts[quest.category]) {
      categoryCounts[quest.category] = { count: 0, quests: [] };
    }
    categoryCounts[quest.category].count++;
    categoryCounts[quest.category].quests.push(quest);
  }

  const categories = Object.entries(categoryCounts).sort((a, b) => b[1].count - a[1].count);
  const dominantCategory = categories[0][0];
  const dominantCount = categories[0][1].count;
  const categoriesExplored = categories.length;

  const chapters: SagaChapter[] = [];

  // Chapter 1: The Beginning
  const firstQuest = sortedQuests[0];
  chapters.push({
    type: "beginning",
    questCount: 1,
    title: "The First Step",
    description: pickTemplate("beginning")
      .replace("{date}", formatDate(firstQuest.completed_at))
      .replace("{quest}", firstQuest.title),
    date: firstQuest.completed_at,
  });

  // Chapter 2: Mastery (if achieved)
  if (dominantCount >= MASTERY_THRESHOLD) {
    const notableQuest =
      categoryCounts[dominantCategory].quests[Math.floor(dominantCount / 2)];
    chapters.push({
      type: "mastery",
      category: dominantCategory,
      questCount: dominantCount,
      title: `Mastery of ${dominantCategory}`,
      description: pickTemplate("mastery")
        .replace("{category}", dominantCategory)
        .replace("{count}", dominantCount.toString())
        .replace("{quest}", notableQuest.title),
    });
  }

  // Chapter 3: Pivot or Versatile (if multiple categories explored)
  if (categoriesExplored >= 2) {
    if (categoriesExplored >= 4) {
      const categoryNames = categories.slice(0, 3).map(([name]) => name).join(", ");
      chapters.push({
        type: "versatile",
        questCount: sortedQuests.length,
        title: "The Versatile Hero",
        description: pickTemplate("versatile").replace("{categories}", categoryNames),
      });
    } else {
      const secondCategory = categories[1][0];
      chapters.push({
        type: "pivot",
        category: secondCategory,
        questCount: sortedQuests.length,
        title: `Discovering ${secondCategory}`,
        description: pickTemplate("pivot")
          .replace("{oldCategory}", dominantCategory)
          .replace("{newCategory}", secondCategory),
      });
    }
  }

  // Chapter 4: Legend (if achieved)
  if (sortedQuests.length >= LEGEND_THRESHOLD) {
    chapters.push({
      type: "legend",
      questCount: sortedQuests.length,
      title: "Legendary Status",
      description: pickTemplate("legend").replace("{count}", sortedQuests.length.toString()),
    });
  }

  // Generate saga title based on archetype
  let title: string;
  let subtitle: string;

  if (sortedQuests.length >= LEGEND_THRESHOLD) {
    title = "The Legend of the Versatile Hero";
    subtitle = `A saga spanning ${sortedQuests.length} quests across ${categoriesExplored} realms`;
  } else if (dominantCount >= MASTERY_THRESHOLD) {
    title = `The ${dominantCategory} Specialist`;
    subtitle = `A hero defined by mastery and dedication`;
  } else if (categoriesExplored >= 3) {
    title = "The Wandering Adventurer";
    subtitle = "A hero of many paths, master of versatility";
  } else {
    title = "The Rising Hero";
    subtitle = "A legend in the making...";
  }

  return {
    title,
    subtitle,
    chapters,
    stats: {
      totalQuests: sortedQuests.length,
      dominantCategory,
      categoriesExplored,
      longestStreak,
      joinedDate,
    },
  };
}

export function getSagaArchetype(saga: PersonalSaga): string {
  const { totalQuests, categoriesExplored, dominantCategory } = saga.stats;

  if (totalQuests >= LEGEND_THRESHOLD) return "Legend";
  if (totalQuests >= 20 && categoriesExplored >= 4) return "Renaissance Soul";
  if (saga.chapters.some((c) => c.type === "mastery")) return `${dominantCategory} Master`;
  if (categoriesExplored >= 3) return "Versatile Adventurer";
  if (totalQuests >= 5) return "Rising Hero";
  return "Novice";
}
