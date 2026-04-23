import { Quest, QuestType } from "@/lib/types";
import { ALL_QUESTS } from "@/lib/quests";

// O(1) quest lookup by ID — avoids repeated O(n) ALL_QUESTS.find() calls.
const questById = new Map(ALL_QUESTS.map((q) => [q.id, q]));

/** Unbiased Fisher-Yates shuffle (returns a new array). */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
import {
  getUserDashboardSnapshot,
  getQuestlineProgressMap,
  getWeeklyRecap,
} from "@/lib/quest-progress";
import { QUESTLINES } from "@/lib/questlines";

export interface QuestRecommendation {
  quest: Quest;
  reason: string;
  confidence: number; // 0-1
  type: "continue_questline" | "category_balance" | "difficulty_progression" | "quick_win" | "daily_streak";
}

export interface RecommendationContext {
  userLevel: number;
  completedQuestIds: string[];
  activeQuestIds: string[];
  completedCategories: string[];
  questlineProgress: Record<string, { currentStepId: string | null; completedSteps: string[] }>;
  recentXP: number;
  averageDifficulty: number;
}

async function buildContext(): Promise<RecommendationContext | null> {
  const [snapshot, weeklyRecap, questlineMap] = await Promise.all([
    getUserDashboardSnapshot(),
    getWeeklyRecap(0),
    getQuestlineProgressMap(),
  ]);

  const profile = snapshot?.profileSummary ?? null;
  const progressMap = snapshot?.progressMap ?? {};

  if (!profile) {
    return null;
  }

  const completedQuestIds = Object.entries(progressMap)
    .filter(([, progress]) => progress.status === "completed")
    .map(([id]) => id);

  const activeQuestIds = Object.entries(progressMap)
    .filter(([, progress]) => progress.status === "active")
    .map(([id]) => id);

  // Calculate completed categories — use O(1) Map lookups instead of find().
  const categoryCount: Record<string, number> = {};
  let totalDifficulty = 0;
  let difficultyCount = 0;
  for (const id of completedQuestIds) {
    const quest = questById.get(id);
    if (quest) {
      categoryCount[quest.category] = (categoryCount[quest.category] || 0) + 1;
      totalDifficulty += quest.difficulty;
      difficultyCount++;
    }
  }
  const completedCategories = Object.keys(categoryCount);
  const averageDifficulty = difficultyCount > 0 ? totalDifficulty / difficultyCount : 1;

  // Build questline progress
  const questlineProgress: Record<string, { currentStepId: string | null; completedSteps: string[] }> = {};
  QUESTLINES.forEach((ql) => {
    const progress = questlineMap[ql.id];
    const completedSteps = ql.steps
      .filter((step) => {
        const questProgress = progressMap[step.quest_id];
        return questProgress?.status === "completed";
      })
      .map((s) => s.id);
    questlineProgress[ql.id] = {
      currentStepId: progress?.current_step_id || null,
      completedSteps,
    };
  });

  return {
    userLevel: profile.level,
    completedQuestIds,
    activeQuestIds,
    completedCategories,
    questlineProgress,
    recentXP: weeklyRecap?.xp_earned || 0,
    averageDifficulty,
  };
}

function getQuestlineRecommendations(context: RecommendationContext): QuestRecommendation[] {
  const recommendations: QuestRecommendation[] = [];
  const completedQuestIdSet = new Set(context.completedQuestIds);

  QUESTLINES.forEach((questline) => {
    const progress = context.questlineProgress[questline.id];
    if (!progress) return;

    // Recommend the current step if it hasn't been completed yet.
    // currentStep is the step to do next — no need for a second findIndex.
    const currentStep = questline.steps.find((s) => s.id === progress.currentStepId);
    if (currentStep?.quest && !completedQuestIdSet.has(currentStep.quest_id)) {
      recommendations.push({
        quest: currentStep.quest,
        reason: `Continue ${questline.title}`,
        confidence: 0.9,
        type: "continue_questline",
      });
    }
  });

  return recommendations;
}

function getCategoryBalanceRecommendations(context: RecommendationContext): QuestRecommendation[] {
  const recommendations: QuestRecommendation[] = [];
  const completedQuestIdSet = new Set(context.completedQuestIds);
  const activeQuestIdSet = new Set(context.activeQuestIds);

  // Find underrepresented categories.
  const allCategories = Array.from(new Set(ALL_QUESTS.map((q) => q.category)));
  const categoryCount: Record<string, number> = {};
  context.completedCategories.forEach((cat) => {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Math.min() with no args returns Infinity; handle that explicitly.
  const counts = Object.values(categoryCount);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const underrepresented = allCategories.filter((cat) => (categoryCount[cat] || 0) <= minCount);

  underrepresented.slice(0, 3).forEach((category) => {
    // Find an available quest in this category
    const availableQuest = ALL_QUESTS.find(
      (q) =>
        q.category === category &&
        !completedQuestIdSet.has(q.id) &&
        !activeQuestIdSet.has(q.id)
    );

    if (availableQuest) {
      recommendations.push({
        quest: availableQuest,
        reason: `Try ${category} quests`,
        confidence: 0.7,
        type: "category_balance",
      });
    }
  });

  return recommendations;
}

function getDifficultyProgressionRecommendations(context: RecommendationContext): QuestRecommendation[] {
  const recommendations: QuestRecommendation[] = [];
  const completedQuestIdSet = new Set(context.completedQuestIds);
  const activeQuestIdSet = new Set(context.activeQuestIds);

  // Suggest quests slightly above average difficulty
  const targetDifficulty = Math.min(Math.ceil(context.averageDifficulty) + 1, 5);

  const challengingQuests = ALL_QUESTS.filter(
    (q) =>
      q.difficulty === targetDifficulty &&
      !completedQuestIdSet.has(q.id) &&
      !activeQuestIdSet.has(q.id) &&
      q.type === "main" // Prefer main quests for progression
  );

  // Pick 2 random challenging quests (Fisher-Yates ensures uniform distribution).
  const shuffled = shuffleArray(challengingQuests);
  shuffled.slice(0, 2).forEach((quest) => {
    recommendations.push({
      quest,
      reason: `Level up challenge`,
      confidence: 0.6,
      type: "difficulty_progression",
    });
  });

  return recommendations;
}

function getQuickWinRecommendations(context: RecommendationContext): QuestRecommendation[] {
  const recommendations: QuestRecommendation[] = [];
  const completedQuestIdSet = new Set(context.completedQuestIds);
  const activeQuestIdSet = new Set(context.activeQuestIds);

  // Find short, easy side quests for busy days
  const quickQuests = ALL_QUESTS.filter(
    (q) =>
      q.type === "side" &&
      q.difficulty <= 2 &&
      !completedQuestIdSet.has(q.id) &&
      !activeQuestIdSet.has(q.id)
  );

  // Sort by XP reward (descending) to maximize value
  const bestQuickQuests = quickQuests
    .sort((a, b) => b.xp_reward - a.xp_reward)
    .slice(0, 3);

  bestQuickQuests.forEach((quest) => {
    recommendations.push({
      quest,
      reason: "Quick win (30 min or less)",
      confidence: 0.8,
      type: "quick_win",
    });
  });

  return recommendations;
}

function getDailyStreakRecommendations(context: RecommendationContext): QuestRecommendation[] {
  const recommendations: QuestRecommendation[] = [];
  const completedQuestIdSet = new Set(context.completedQuestIds);
  const activeQuestIdSet = new Set(context.activeQuestIds);

  // If user needs to maintain streak, suggest the easiest available quest
  const easiestAvailable = ALL_QUESTS.filter(
    (q) => !completedQuestIdSet.has(q.id) && !activeQuestIdSet.has(q.id)
  ).sort((a, b) => a.difficulty - b.difficulty)[0];

  if (easiestAvailable) {
    recommendations.push({
      quest: easiestAvailable,
      reason: "Keep your streak alive!",
      confidence: 0.95,
      type: "daily_streak",
    });
  }

  return recommendations;
}

export async function getSmartRecommendations(limit: number = 5): Promise<QuestRecommendation[]> {
  const context = await buildContext();

  if (!context) {
    // Return featured quests if no user data
    return ALL_QUESTS.filter((q) => q.source === "predefined" && q.difficulty <= 2)
      .slice(0, limit)
      .map((quest) => ({
        quest,
        reason: "Great for beginners",
        confidence: 0.5,
        type: "quick_win" as const,
      }));
  }

  // Gather recommendations from all strategies
  const allRecommendations = [
    ...getQuestlineRecommendations(context),
    ...getDailyStreakRecommendations(context),
    ...getQuickWinRecommendations(context),
    ...getCategoryBalanceRecommendations(context),
    ...getDifficultyProgressionRecommendations(context),
  ];

  // Remove duplicates (by quest ID)
  const seen = new Set<string>();
  const unique = allRecommendations.filter((rec) => {
    if (seen.has(rec.quest.id)) return false;
    seen.add(rec.quest.id);
    return true;
  });

  // Sort by confidence and type priority
  const typePriority: Record<string, number> = {
    daily_streak: 5,
    continue_questline: 4,
    quick_win: 3,
    category_balance: 2,
    difficulty_progression: 1,
  };

  unique.sort((a, b) => {
    const priorityDiff = (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });

  return unique.slice(0, limit);
}

export async function getLowEnergySuggestion(): Promise<Quest | null> {
  const snapshot = await getUserDashboardSnapshot();
  const progressMap = snapshot?.progressMap ?? {};
  const completedIds = Object.entries(progressMap)
    .filter(([, p]) => p.status === "completed")
    .map(([id]) => id);
  const activeIds = Object.entries(progressMap)
    .filter(([, p]) => p.status === "active")
    .map(([id]) => id);
  const completedIdSet = new Set(completedIds);
  const activeIdSet = new Set(activeIds);

  // Find easiest side quest that hasn't been done
  const candidates = ALL_QUESTS.filter(
    (q) =>
      q.type === "side" &&
      q.difficulty === 1 &&
      !completedIdSet.has(q.id) &&
      !activeIdSet.has(q.id)
  ).sort((a, b) => a.xp_reward - b.xp_reward);

  return candidates[0] || null;
}
