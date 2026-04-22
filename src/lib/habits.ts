import { getSupabaseClient } from "@/lib/supabase";
import {
  Habit,
  HabitCompletion,
  HabitStreak,
  HabitWithStatus,
  HabitCalendarData,
  HabitCompletionHistory,
  HabitRecurrenceType,
  HabitRecurrenceData,
} from "@/lib/types";
import {
  getTodayString,
  getWeekStartString,
  getLastNDays,
  isToday,
  isThisWeek,
  isHabitScheduledForDate,
} from "@/lib/habit-recurrence";

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
  is_active?: boolean;
}

export async function createHabit(input: CreateHabitInput): Promise<{
  success: boolean;
  habit?: Habit;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("habits")
    .insert({
      title: input.title,
      description: input.description || null,
      icon: input.icon || "✓",
      color: input.color || "#e8b864",
      recurrence_type: input.recurrence_type,
      recurrence_data: input.recurrence_data,
      xp_reward: Math.min(25, Math.max(5, input.xp_reward || 10)),
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
  updates: Partial<CreateHabitInput>
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
  const weekStart = getWeekStartString();

  // Build query
  let query = supabase.from("habits").select("*").order("sort_order", { ascending: true });

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data: habits, error: habitsError } = await query;

  if (habitsError || !habits) {
    console.error("Error fetching habits:", habitsError);
    return [];
  }

  // Get today's completions
  const { data: todayCompletions, error: completionsError } = await supabase
    .from("habit_completions")
    .select("habit_id")
    .eq("completion_date", today);

  if (completionsError) {
    console.error("Error fetching completions:", completionsError);
  }

  const completedToday = new Set(todayCompletions?.map((c) => c.habit_id) || []);

  // Get week's completions for all habits
  const { data: weekCompletions, error: weekError } = await supabase
    .from("habit_completions")
    .select("habit_id")
    .gte("completion_date", weekStart);

  if (weekError) {
    console.error("Error fetching week completions:", weekError);
  }

  const weekCompletionCounts: Record<string, number> = {};
  weekCompletions?.forEach((c) => {
    weekCompletionCounts[c.habit_id] = (weekCompletionCounts[c.habit_id] || 0) + 1;
  });

  // Get streaks if requested
  let streaks: Record<string, HabitStreak> = {};
  if (options?.includeStreaks !== false) {
    const { data: streakData, error: streakError } = await supabase
      .from("habit_streaks")
      .select("*");

    if (streakError) {
      console.error("Error fetching streaks:", streakError);
    } else {
      streaks = (streakData || []).reduce((acc, s) => {
        acc[s.habit_id] = s as HabitStreak;
        return acc;
      }, {} as Record<string, HabitStreak>);
    }
  }

  // Combine data
  return (habits as Habit[]).map((habit) => ({
    ...habit,
    streak: streaks[habit.id] || null,
    is_completed_today: completedToday.has(habit.id),
    completions_this_week: weekCompletionCounts[habit.id] || 0,
  }));
}

export async function getHabitsForToday(): Promise<HabitWithStatus[]> {
  const habits = await getUserHabits({ activeOnly: true });
  const today = new Date();
  
  return habits.filter((h) => isHabitScheduledForDate(h, today));
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

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("completion_date", today);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getHabitCompletions(
  habitId: string,
  startDate?: string,
  endDate?: string
): Promise<HabitCompletion[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from("habit_completions")
    .select("*")
    .eq("habit_id", habitId)
    .order("completion_date", { ascending: false });

  if (startDate) {
    query = query.gte("completion_date", startDate);
  }
  if (endDate) {
    query = query.lte("completion_date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching completions:", error);
    return [];
  }

  return (data || []) as HabitCompletion[];
}

// ============================================
// HABIT STREAKS
// ============================================

export async function getHabitStreak(habitId: string): Promise<HabitStreak | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("habit_streaks")
    .select("*")
    .eq("habit_id", habitId)
    .single();

  if (error || !data) return null;
  return data as HabitStreak;
}

// ============================================
// CALENDAR / HISTORY DATA
// ============================================

export async function getHabitCalendarData(
  habitId: string,
  days: number = 30
): Promise<HabitCalendarData | null> {
  const supabase = getSupabaseClient();

  // Get habit
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) return null;

  // Get streak
  const { data: streak } = await supabase
    .from("habit_streaks")
    .select("*")
    .eq("habit_id", habitId)
    .single();

  // Get completions for date range
  const dateRange = getLastNDays(days);
  const startDate = dateRange[0];
  const endDate = dateRange[dateRange.length - 1];

  const { data: completions, error: compError } = await supabase
    .from("habit_completions")
    .select("completion_date")
    .eq("habit_id", habitId)
    .gte("completion_date", startDate)
    .lte("completion_date", endDate);

  if (compError) {
    console.error("Error fetching calendar completions:", compError);
  }

  const completedDates = new Set(completions?.map((c) => c.completion_date) || []);

  const history: HabitCompletionHistory[] = dateRange.map((date) => ({
    date,
    completed: completedDates.has(date),
  }));

  return {
    habit: habit as Habit,
    streak: streak as HabitStreak | null,
    history,
  };
}

// ============================================
// STATS & SUMMARIES
// ============================================

export interface HabitsSummary {
  totalHabits: number;
  activeHabits: number;
  completedToday: number;
  totalCompletionsThisWeek: number;
  currentStreaks: number; // Habits with streak > 0
  longestStreak: number;
}

export async function getHabitsSummary(): Promise<HabitsSummary> {
  const supabase = getSupabaseClient();
  const today = getTodayString();
  const weekStart = getWeekStartString();

  // Get all habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id, is_active");

  // Get today's completions
  const { data: todayCompletions } = await supabase
    .from("habit_completions")
    .select("habit_id")
    .eq("completion_date", today);

  // Get week's completions
  const { data: weekCompletions } = await supabase
    .from("habit_completions")
    .select("*")
    .gte("completion_date", weekStart);

  // Get streaks
  const { data: streaks } = await supabase
    .from("habit_streaks")
    .select("current_streak, longest_streak");

  const totalHabits = habits?.length || 0;
  const activeHabits = habits?.filter((h) => h.is_active).length || 0;
  const completedToday = todayCompletions?.length || 0;
  const totalCompletionsThisWeek = weekCompletions?.length || 0;
  const currentStreaks =
    streaks?.filter((s) => s.current_streak > 0).length || 0;
  const longestStreak =
    streaks?.reduce((max, s) => Math.max(max, s.longest_streak), 0) || 0;

  return {
    totalHabits,
    activeHabits,
    completedToday,
    totalCompletionsThisWeek,
    currentStreaks,
    longestStreak,
  };
}

// ============================================
// REORDERING
// ============================================

export async function updateHabitOrder(
  habitOrders: { id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  // Update each habit's sort_order
  const updates = habitOrders.map(({ id, sort_order }) =>
    supabase
      .from("habits")
      .update({ sort_order, updated_at: new Date().toISOString() })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    return { success: false, error: errors[0].error?.message };
  }

  return { success: true };
}
