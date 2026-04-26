import { Habit, HabitRecurrenceType, HabitRecurrenceData } from "@/lib/types";

/**
 * Check if a habit is scheduled for a specific date
 */
export function isHabitScheduledForDate(
  habit: Habit,
  date: Date = new Date(),
  completionsThisWeek: number = 0
): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  switch (habit.recurrence_type) {
    case "daily":
      return true;

    case "weekdays": {
      const days = habit.recurrence_data.days || [1, 2, 3, 4, 5]; // Default to Mon-Fri
      return days.includes(dayOfWeek);
    }

    case "weekly": {
      const targetDay = habit.recurrence_data.dayOfWeek ?? 1; // Default to Monday
      return dayOfWeek === targetDay;
    }

    case "interval": {
      const intervalDays = habit.recurrence_data.intervalDays ?? 1;
      const createdAt = new Date(habit.created_at);
      // Use midnight-normalised local dates so DST shifts (±1 h) don't skew
      // the integer day count. Math.round absorbs the ±1 h error.
      const targetMidnight  = new Date(date.getFullYear(),    date.getMonth(),    date.getDate());
      const createdMidnight = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const daysSinceCreated = Math.round(
        (targetMidnight.getTime() - createdMidnight.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceCreated >= 0 && daysSinceCreated % intervalDays === 0;
    }

    case "times_per_week": {
      const timesPerWeek = habit.recurrence_data.timesPerWeek ?? 3;
      return completionsThisWeek < timesPerWeek;
    }

    default:
      return true;
  }
}

/**
 * Get a human-readable description of the recurrence pattern
 */
export function getRecurrenceDescription(habit: Habit): string {
  switch (habit.recurrence_type) {
    case "daily":
      return "Every day";

    case "weekdays": {
      const days = habit.recurrence_data.days || [1, 2, 3, 4, 5];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      if (days.length === 5 && days.every((d, i) => d === i + 1)) {
        return "Weekdays";
      }
      if (days.length === 2 && days.includes(0) && days.includes(6)) {
        return "Weekends";
      }
      return days.map((d) => dayNames[d]).join(", ");
    }

    case "weekly": {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayOfWeek = habit.recurrence_data.dayOfWeek ?? 1;
      return `Every ${dayNames[dayOfWeek]}`;
    }

    case "interval": {
      const intervalDays = habit.recurrence_data.intervalDays ?? 1;
      if (intervalDays === 1) return "Daily";
      if (intervalDays === 7) return "Weekly";
      return `Every ${intervalDays} days`;
    }

    case "times_per_week": {
      const timesPerWeek = habit.recurrence_data.timesPerWeek ?? 3;
      return `${timesPerWeek} times per week`;
    }

    default:
      return "Daily";
  }
}

/** Format a Date as a local-timezone YYYY-MM-DD string (not UTC). */
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get today's date string in local time (YYYY-MM-DD).
 * Uses local timezone so users in UTC-5 etc. don't see yesterday's date.
 */
export function getTodayString(): string {
  return localDateString(new Date());
}

/**
 * Get start of week (Sunday) date string in local time.
 */
export function getWeekStartString(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return localDateString(d);
}

/**
 * Get array of local-time date strings for the last N days (oldest first).
 */
export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    dates.push(localDateString(d));
  }

  return dates;
}

/**
 * Validate recurrence data based on type
 */
export function validateRecurrenceData(
  type: HabitRecurrenceType,
  data: HabitRecurrenceData
): { valid: boolean; error?: string } {
  switch (type) {
    case "weekdays":
      if (!data.days || data.days.length === 0) {
        return { valid: false, error: "Select at least one day" };
      }
      if (data.days.some((d) => d < 0 || d > 6)) {
        return { valid: false, error: "Invalid day selected" };
      }
      return { valid: true };

    case "interval":
      if (!data.intervalDays || data.intervalDays < 1 || data.intervalDays > 365) {
        return { valid: false, error: "Interval must be between 1 and 365 days" };
      }
      return { valid: true };

    case "weekly":
      if (data.dayOfWeek === undefined || data.dayOfWeek < 0 || data.dayOfWeek > 6) {
        return { valid: false, error: "Select a valid day of the week" };
      }
      return { valid: true };

    case "times_per_week":
      if (!data.timesPerWeek || data.timesPerWeek < 1 || data.timesPerWeek > 7) {
        return { valid: false, error: "Times per week must be between 1 and 7" };
      }
      if (data.weekStartDay !== undefined && (data.weekStartDay < 0 || data.weekStartDay > 6)) {
        return { valid: false, error: "Invalid week start day" };
      }
      return { valid: true };

    case "daily":
    default:
      return { valid: true };
  }
}

/**
 * Build recurrence data object for saving
 */
export function buildRecurrenceData(
  type: HabitRecurrenceType,
  options: {
    days?: number[];
    intervalDays?: number;
    dayOfWeek?: number;
    timesPerWeek?: number;
    weekStartDay?: number;
  }
): HabitRecurrenceData {
  switch (type) {
    case "weekdays":
      return { days: options.days || [1, 2, 3, 4, 5] };
    case "interval":
      return { intervalDays: options.intervalDays || 1 };
    case "weekly":
      return { dayOfWeek: options.dayOfWeek ?? 1 };
    case "times_per_week":
      return {
        timesPerWeek: options.timesPerWeek ?? 3,
        weekStartDay: options.weekStartDay ?? 1,
      };
    case "daily":
    default:
      return {};
  }
}
