import { getSupabaseClient } from "@/lib/supabase";
import { calculateLevel, Quest, QuestStatus } from "@/lib/types";
import { ALL_QUESTS } from "@/lib/quests";
import { getTodayString } from "@/lib/habit-recurrence";

export interface UserQuestProgressRow {
  quest_id: string;
  status: QuestStatus;
  accepted_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface UserQuestStepProgressRow {
  quest_id: string;
  step_id: string;
  completed_at: string;
  xp_awarded: number;
  created_at: string;
}

export interface ProfileProgressSummary {
  xp_total: number;
  level: number;
  completedCount: number;
  activeCount: number;
  created_at?: string;
}

interface DashboardSnapshotRpcRow {
  profile_xp_total: number;
  profile_level: number;
  profile_created_at: string | null;
  completed_count: number;
  active_count: number;
  streak_current: number;
  streak_longest: number;
  streak_last_activity_date: string | null;
  recent_completed_ids: string[] | null;
  badge_ids: string[] | null;
  progress_rows:
    | Array<{
        quest_id: string;
        status: QuestStatus;
        accepted_at: string | null;
        completed_at: string | null;
        updated_at: string;
      }>
    | null;
}

export interface DashboardSnapshot {
  profileSummary: ProfileProgressSummary;
  streak: UserStreak;
  progressMap: Record<string, UserQuestProgressRow>;
  recentCompletedIds: string[];
  badgeIds: string[];
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function getUserDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_user_dashboard_snapshot");

  if (error || !data) {
    return null;
  }

  const row = (Array.isArray(data) ? data[0] : data) as DashboardSnapshotRpcRow;
  if (!row) {
    return null;
  }

  const progressRows = Array.isArray(row.progress_rows) ? row.progress_rows : [];
  const progressMap = progressRows.reduce<Record<string, UserQuestProgressRow>>((acc, progress) => {
    acc[progress.quest_id] = {
      quest_id: progress.quest_id,
      status: progress.status,
      accepted_at: progress.accepted_at,
      completed_at: progress.completed_at,
      updated_at: progress.updated_at,
    };
    return acc;
  }, {});

  return {
    profileSummary: {
      xp_total: row.profile_xp_total || 0,
      level: row.profile_level || calculateLevel(row.profile_xp_total || 0),
      completedCount: Number(row.completed_count) || 0,
      activeCount: Number(row.active_count) || 0,
      created_at: row.profile_created_at || undefined,
    },
    streak: {
      current_streak: row.streak_current || 0,
      longest_streak: row.streak_longest || 0,
      last_activity_date: row.streak_last_activity_date,
    },
    progressMap,
    recentCompletedIds: row.recent_completed_ids || [],
    badgeIds: row.badge_ids || [],
  };
}

export async function getUserQuestProgressMap(): Promise<Record<string, UserQuestProgressRow>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {};
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_quests")
    .select("quest_id,status,accepted_at,completed_at,updated_at")
    .eq("user_id", userId);

  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, UserQuestProgressRow>>((acc, row) => {
    acc[row.quest_id] = row as UserQuestProgressRow;
    return acc;
  }, {});
}

export async function getUserQuestStepProgress(
  questId: string
): Promise<Record<string, UserQuestStepProgressRow>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {};
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_quest_steps")
    .select("quest_id,step_id,completed_at,xp_awarded,created_at")
    .eq("user_id", userId)
    .eq("quest_id", questId);

  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, UserQuestStepProgressRow>>((acc, row) => {
    const step = row as UserQuestStepProgressRow;
    acc[step.step_id] = step;
    return acc;
  }, {});
}

export async function completeQuestStep(
  questId: string,
  stepId: string,
  questType?: Quest["type"],
  questCategory?: string
): Promise<{
  success: boolean;
  alreadyCompleted?: boolean;
  appliedXp?: number;
  nextXp?: number;
  nextLevel?: number;
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Please log in to complete quest steps." };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("complete_quest_step_atomic", {
    p_user_id: userId,
    p_quest_id: questId,
    p_step_id: stepId,
    p_quest_type: questType ?? null,
    p_quest_category: questCategory ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const rpcResult = Array.isArray(data) ? data[0] : data;
  const alreadyCompleted = Boolean(rpcResult?.already_completed);
  const appliedXp = typeof rpcResult?.applied_xp === "number" ? rpcResult.applied_xp : 0;

  if (alreadyCompleted) {
    return { success: true, alreadyCompleted: true, appliedXp };
  }

  if (questCategory && appliedXp > 0) {
    const { error: weeklyError } = await supabase.rpc("update_weekly_xp_only", {
      p_user_id: userId,
      p_xp: appliedXp,
      p_category: questCategory,
    });

    if (weeklyError) {
      console.error("Failed to update weekly activity for step completion:", weeklyError.message);
    }
  }

  const nextXp = typeof rpcResult?.next_xp === "number" ? rpcResult.next_xp : undefined;
  const nextLevel = typeof rpcResult?.next_level === "number" ? rpcResult.next_level : undefined;

  return { success: true, appliedXp, nextXp, nextLevel };
}

export async function hasPersistedQuestSteps(questId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quests")
    .select("steps")
    .eq("id", questId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return Array.isArray(data.steps) && data.steps.length > 0;
}

export function mergeQuestWithProgress(
  quests: Quest[],
  progressMap: Record<string, UserQuestProgressRow>
): Quest[] {
  return quests.map((quest) => {
    const progress = progressMap[quest.id];
    if (!progress) {
      return quest;
    }

    return {
      ...quest,
      status: progress.status,
    };
  });
}

export async function acceptQuest(
  questId: string,
  questType?: Quest["type"],
  questCategory?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Please log in to accept quests." };
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("user_quests")
    .upsert(
      {
        user_id: userId,
        quest_id: questId,
        quest_type: questType,
        quest_category: questCategory,
        status: "active",
        accepted_at: now,
      },
      { onConflict: "user_id,quest_id" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Marks a quest complete and awards XP via the complete_quest_atomic RPC, then
 * separately updates weekly_activity. These are two distinct DB operations — if
 * the second fails the XP is still awarded (not rolled back). Acceptable for
 * this app's consistency requirements.
 */
export async function completeQuest(
  questId: string,
  xpReward: number,
  questType?: Quest["type"],
  questCategory?: string
): Promise<{ success: boolean; alreadyCompleted?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Please log in to complete quests." };
  }

  const supabase = getSupabaseClient();

  const { data: completionData, error: completionError } = await supabase.rpc(
    "complete_quest_atomic",
    {
      p_user_id: userId,
      p_quest_id: questId,
      p_xp: xpReward,
      p_quest_type: questType ?? null,
      p_quest_category: questCategory ?? null,
    }
  );

  if (completionError) {
    return { success: false, error: completionError.message };
  }

  const rpcResult = Array.isArray(completionData) ? completionData[0] : completionData;
  const alreadyCompleted = Boolean(rpcResult?.already_completed);

  if (alreadyCompleted) {
    return { success: true, alreadyCompleted: true };
  }

  let shouldUpdateWeekly = Boolean(questCategory);

  if (shouldUpdateWeekly) {
    const { data: questMeta } = await supabase
      .from("quests")
      .select("steps")
      .eq("id", questId)
      .maybeSingle();

    const steps = questMeta?.steps;
    if (Array.isArray(steps) && steps.length > 0) {
      shouldUpdateWeekly = false;
    }
  }

  if (shouldUpdateWeekly && questCategory) {
    const { error: weeklyError } = await supabase.rpc("update_weekly_activity", {
      p_user_id: userId,
      p_xp: xpReward,
      p_category: questCategory,
    });

    if (weeklyError) {
      console.error("Failed to update weekly activity:", weeklyError.message);
    }
  }

  return { success: true };
}

export async function getProfileProgressSummary(): Promise<ProfileProgressSummary | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = getSupabaseClient();

  const [{ data: profile }, { count: completedCount }, { count: activeCount }] = await Promise.all([
    supabase.from("profiles").select("xp_total,level,created_at").eq("id", userId).single(),
    supabase
      .from("user_quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("user_quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (!profile) {
    return null;
  }

  return {
    xp_total: profile.xp_total || 0,
    level: profile.level || calculateLevel(profile.xp_total || 0),
    completedCount: completedCount || 0,
    activeCount: activeCount || 0,
    created_at: profile.created_at || undefined,
  };
}

export async function getRecentCompletedQuestIds(limit = 5): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("user_quests")
    .select("quest_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  return (data || []).map((row) => row.quest_id as string);
}

export type CompletedQuestForSaga = Quest & { completed_at: string };

export async function getCompletedQuestsForSaga(): Promise<CompletedQuestForSaga[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseClient();

  const { data: completedRows, error: completedError } = await supabase
    .from("user_quests")
    .select("quest_id,completed_at,updated_at")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (completedError || !completedRows?.length) {
    return [];
  }

  const predefinedById = new Map(ALL_QUESTS.map((q) => [q.id, q]));
  const completionDateById: Record<string, string> = {};
  const completedPredefined: CompletedQuestForSaga[] = [];
  const customIds: string[] = [];

  for (const row of completedRows) {
    const questId = row.quest_id as string;
    const completedAt = (row.completed_at || row.updated_at || new Date().toISOString()) as string;
    const predefined = predefinedById.get(questId);

    if (predefined) {
      completedPredefined.push({
        ...predefined,
        status: "completed",
        completed_at: completedAt,
      });
    } else {
      customIds.push(questId);
      completionDateById[questId] = completedAt;
    }
  }

  if (!customIds.length) {
    return completedPredefined;
  }

  const { data: customQuests, error: customError } = await supabase
    .from("quests")
    .select(
      "id,title,description,type,source,difficulty,xp_reward,duration_label,category,location,user_id,created_at,status"
    )
    .in("id", customIds);

  if (customError || !customQuests?.length) {
    return completedPredefined;
  }

  const completedCustom: CompletedQuestForSaga[] = customQuests.map((q) => ({
    ...(q as Quest),
    status: "completed",
    completed_at: completionDateById[q.id] || new Date().toISOString(),
  }));

  return [...completedPredefined, ...completedCustom];
}

export async function getCompletedCategoryCounts(): Promise<Record<string, number>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {};
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_quests")
    .select("quest_category")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, number>>((acc, row) => {
    const category = row.quest_category as string | null;
    if (!category) return acc;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
}

export interface UserBadgeRow {
  badge_id: string;
  earned_at: string;
}

export async function getUserEarnedBadgeIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.badge_id as string);
}

export interface QuestlineProgressRow {
  questline_id: string;
  current_step_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
  started_at: string;
}

export async function getQuestlineProgressMap(): Promise<Record<string, QuestlineProgressRow>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {};
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_questline_progress")
    .select("questline_id,current_step_id,is_completed,completed_at,started_at")
    .eq("user_id", userId);

  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, QuestlineProgressRow>>((acc, row) => {
    acc[row.questline_id as string] = row as QuestlineProgressRow;
    return acc;
  }, {});
}

export async function checkAndAwardBadges(): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Please log in." };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("check_and_award_badges", { p_user_id: userId });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export async function getUserStreak(): Promise<UserStreak | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_streaks")
    .select("current_streak,longest_streak,last_activity_date")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    current_streak: data.current_streak || 0,
    longest_streak: data.longest_streak || 0,
    last_activity_date: data.last_activity_date,
  };
}

export async function updateStreakOnCompletion(): Promise<{
  success: boolean;
  previousStreak?: number;
  newStreak?: number;
  streakBroken?: boolean;
  isNewLongest?: boolean;
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Please log in." };
  }

  const supabase = getSupabaseClient();

  // Capture streak before the RPC mutates it so callers have the exact pre-completion value.
  const { data: streakBefore } = await supabase
    .from("user_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .single();
  const previousStreak = streakBefore?.current_streak ?? 0;

  const { data, error } = await supabase.rpc("update_user_streak", {
    p_user_id: userId,
    p_completion_date: getTodayString(), // local-timezone date, not UTC
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Supabase RPC returns array of results
  const result = Array.isArray(data) ? data[0] : data;

  return {
    success: true,
    previousStreak,
    newStreak: result?.new_streak || 0,
    streakBroken: result?.streak_broken || false,
    isNewLongest: result?.is_new_longest || false,
  };
}

export interface WeeklyRecap {
  week_start: string;
  quests_completed: number;
  xp_earned: number;
  categories: string[];
}

export async function getWeeklyRecap(weeksAgo: number = 0): Promise<WeeklyRecap | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const today = new Date();
  // Build the week-start date in local time (Sunday = day 0).
  // Must match the week boundary used by the update_weekly_activity stored procedure.
  const ws = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - weeksAgo * 7);
  const weekStartStr = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_activity")
    .select("week_start,quests_completed,xp_earned,categories")
    .eq("user_id", userId)
    .eq("week_start", weekStartStr)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    week_start: data.week_start,
    quests_completed: data.quests_completed || 0,
    xp_earned: data.xp_earned || 0,
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}

export async function getWeeklyHistory(limit: number = 4): Promise<WeeklyRecap[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_activity")
    .select("week_start,quests_completed,xp_earned,categories")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    week_start: row.week_start,
    quests_completed: row.quests_completed || 0,
    xp_earned: row.xp_earned || 0,
    categories: Array.isArray(row.categories) ? row.categories : [],
  }));
}

/**
 * Returns active quests that were created by the user (source "user" or "ai")
 * and stored in the DB. These are not in ALL_QUESTS so need a separate fetch.
 */
export async function getUserCreatedActiveQuests(): Promise<Quest[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseClient();

  // Get active quest IDs for this user that aren't in the predefined list
  const { data: progress } = await supabase
    .from("user_quests")
    .select("quest_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!progress?.length) return [];

  const predefinedIds = new Set(ALL_QUESTS.map((q) => q.id));
  const customIds = progress
    .map((p) => p.quest_id as string)
    .filter((id) => !predefinedIds.has(id));

  if (!customIds.length) return [];

  const { data: quests, error } = await supabase
    .from("quests")
    .select(
      "id,title,description,type,source,difficulty,xp_reward,duration_label,category,location,user_id,created_at,status"
    )
    .in("id", customIds);

  if (error || !quests) return [];

  return quests.map((q) => ({
    ...(q as Quest),
    status: "active" as QuestStatus,
  }));
}
