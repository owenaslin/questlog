import { getSupabaseClient } from "@/lib/supabase";
import { calculateLevel, Quest, QuestStatus } from "@/lib/types";
import { ALL_QUESTS } from "@/lib/quests";

export interface UserQuestProgressRow {
  quest_id: string;
  status: QuestStatus;
  accepted_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface ProfileProgressSummary {
  xp_total: number;
  level: number;
  completedCount: number;
  activeCount: number;
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
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

  if (questCategory) {
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
    supabase.from("profiles").select("xp_total,level").eq("id", userId).single(),
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
  const { data, error } = await supabase.rpc("update_user_streak", {
    p_user_id: userId,
    p_completion_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Supabase RPC returns array of results
  const result = Array.isArray(data) ? data[0] : data;

  return {
    success: true,
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
  const weekStart = new Date(today);
  // getDay() returns 0 for Sunday — this produces a Sunday-start week.
  // Must match the week boundary used by the update_weekly_activity stored procedure.
  weekStart.setDate(today.getDate() - today.getDay() - weeksAgo * 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];

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
