import { getSupabaseClient } from "@/lib/supabase";
import {
  Habit,
  HabitStreak,
  HabitWithStatus,
  HabitRecurrenceType,
  HabitRecurrenceData,
} from "@/lib/types";
import {
  getTodayString,
  getWeekStartString,
  isHabitScheduledForDate,
} from "@/lib/habit-recurrence";
import { getUserSettings } from "@/lib/settings";

// ============================================
// HABIT CRUD OPERATIONS
// ============================================

export interface CreateHabitInput {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  recurrence_type: HabitRecurrenceType;
  recurrence_data: HabitRecurrenceData;
  xp_reward?: number;
}

export interface UpdateHabitInput extends Partial<CreateHabitInput> {
  is_active?: boolean;
}

export async function createHabit(input: CreateHabitInput): Promise<{
  success: boolean;
  habit?: Habit;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      icon: input.icon || "✓",
      color: input.color || "#e8b864",
      recurrence_type: input.recurrence_type,
      recurrence_data: input.recurrence_data,
      xp_reward: Math.min(300, Math.max(5, input.xp_reward || 10)),
      is_active: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, habit: data as Habit };
}

export async function updateHabit(
  habitId: string,
  updates: UpdateHabitInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("habits")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habitId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteHabit(habitId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function toggleHabitActive(
  habitId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("habits")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", habitId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// HABIT FETCHING
// ============================================

export async function getHabitById(habitId: string): Promise<Habit | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .single();

  if (error || !data) return null;
  return data as Habit;
}

export async function getUserHabits(options?: {
  activeOnly?: boolean;
  includeStreaks?: boolean;
}): Promise<HabitWithStatus[]> {
  const supabase = getSupabaseClient();
  const today = getTodayString();
  const { settings } = await getUserSettings();
  const weekStart = getWeekStartString(new Date(), settings?.week_start_day ?? 0);
  const { data, error } = await supabase.rpc("get_user_habits_snapshot", {
    p_today: today,
    p_week_start: weekStart,
    p_active_only: options?.activeOnly !== false,
  });

  if (error || !data) {
    console.error("Error fetching habits snapshot:", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const habit: Habit = {
      id: row.id as string,
      user_id: row.user_id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      icon: row.icon as string,
      color: row.color as string,
      recurrence_type: row.recurrence_type as HabitRecurrenceType,
      recurrence_data: (row.recurrence_data as HabitRecurrenceData) || {},
      xp_reward: Number(row.xp_reward) || 0,
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order) || 0,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    const streak: HabitStreak | null =
      options?.includeStreaks === false || !row.streak_id
        ? null
        : {
            id: row.streak_id as string,
            habit_id: row.id as string,
            user_id: row.user_id as string,
            current_streak: Number(row.streak_current) || 0,
            longest_streak: Number(row.streak_longest) || 0,
            last_completed_date: (row.streak_last_completed_date as string | null) ?? null,
            updated_at: row.streak_updated_at as string,
          };

    return {
      ...habit,
      streak,
      is_completed_today: Boolean(row.is_completed_today),
      completions_this_week: Number(row.completions_this_week) || 0,
    } as HabitWithStatus;
  });
}

export async function getHabitsForToday(): Promise<HabitWithStatus[]> {
  const habits = await getUserHabits({ activeOnly: true });
  const today = new Date();

  return habits.filter((h) => isHabitScheduledForDate(h, today, h.completions_this_week));
}

// ============================================
// HABIT COMPLETIONS
// ============================================

export async function completeHabit(habitId: string): Promise<{
  success: boolean;
  xpAwarded?: number;
  newStreak?: number;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  const today = getTodayString();

  // Get habit to determine XP
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("xp_reward")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) {
    return { success: false, error: habitError?.message || "Habit not found" };
  }

  // Create completion record
  const { error } = await supabase.from("habit_completions").insert({
    habit_id: habitId,
    xp_awarded: habit.xp_reward,
    completion_date: today,
  });

  if (error) {
    // Check for unique constraint violation (already completed today)
    if (error.code === "23505") {
      return { success: false, error: "Already completed today" };
    }
    return { success: false, error: error.message };
  }

  // Get updated streak
  const { data: streak } = await supabase
    .from("habit_streaks")
    .select("current_streak")
    .eq("habit_id", habitId)
    .single();

  return {
    success: true,
    xpAwarded: habit.xp_reward,
    newStreak: streak?.current_streak || 1,
  };
}

export async function uncompleteHabit(habitId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  const today = getTodayString();

  // Fetch xp_awarded before deleting so we can deduct it from the profile.
  // The DB trigger `on_habit_completion_revoke_xp` handles this automatically
  // once the schema migration is applied; this client-side path is the fallback.
  const { data: existing } = await supabase
    .from("habit_completions")
    .select("xp_awarded")
    .eq("habit_id", habitId)
    .eq("completion_date", today)
    .single();

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("completion_date", today);

  if (error) {
    return { success: false, error: error.message };
  }

  // Deduct XP from profile (fallback if trigger not yet applied to live DB)
  if (existing?.xp_awarded) {
    const userId = (await supabase.auth.getSession()).data.session?.user.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_total")
        .eq("id", userId)
        .single();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ xp_total: Math.max(0, profile.xp_total - existing.xp_awarded) })
          .eq("id", userId);
      }
    }
  }

  return { success: true };
}

// ============================================
// REORDERING
// ============================================

export async function updateHabitOrder(
  habitOrders: { id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  if (habitOrders.length === 0) return { success: true };

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Single upsert replaces N round-trips.
  const { error } = await supabase
    .from("habits")
    .upsert(
      habitOrders.map(({ id, sort_order }) => ({ id, sort_order, updated_at: now })),
      { onConflict: "id" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
