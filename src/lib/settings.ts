import { getSupabaseClient } from "@/lib/supabase";
import { NotificationPreferences, ThemeMode, UserSettings } from "@/lib/types";

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  habit_reminders: true,
  quest_alerts: true,
  weekly_recap: true,
};

export const DEFAULT_USER_SETTINGS = {
  week_start_day: 0,
  theme_mode: "system" as ThemeMode,
  notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
};

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const prefs = value as Partial<NotificationPreferences>;
  return {
    habit_reminders: prefs.habit_reminders ?? true,
    quest_alerts: prefs.quest_alerts ?? true,
    weekly_recap: prefs.weekly_recap ?? true,
  };
}

function normalizeSettingsRow(row: Record<string, unknown>): UserSettings {
  return {
    user_id: String(row.user_id),
    week_start_day: Number(row.week_start_day ?? 0),
    theme_mode: (row.theme_mode as ThemeMode) ?? "system",
    notification_preferences: normalizeNotificationPreferences(row.notification_preferences),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getUserSettings(): Promise<{ settings: UserSettings | null; error?: string }> {
  const supabase = getSupabaseClient();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    return { settings: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { settings: null, error: error.message };
  }

  if (!data) {
    const created = await upsertUserSettings({});
    if (!created.settings) {
      return { settings: null, error: created.error || "Failed to initialize settings" };
    }
    return { settings: created.settings };
  }

  return { settings: normalizeSettingsRow(data as Record<string, unknown>) };
}

export interface UpdateUserSettingsInput {
  week_start_day?: number;
  theme_mode?: ThemeMode;
  notification_preferences?: Partial<NotificationPreferences>;
}

export async function upsertUserSettings(
  input: UpdateUserSettingsInput
): Promise<{ settings: UserSettings | null; error?: string }> {
  const supabase = getSupabaseClient();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    return { settings: null, error: "Not authenticated" };
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
  };

  if (input.week_start_day !== undefined) {
    payload.week_start_day = Math.max(0, Math.min(6, Math.round(input.week_start_day)));
  }

  if (input.theme_mode) {
    payload.theme_mode = input.theme_mode;
  }

  if (input.notification_preferences) {
    const current = await getUserSettings();
    const existingPrefs = current.settings?.notification_preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
    payload.notification_preferences = {
      ...existingPrefs,
      ...input.notification_preferences,
    };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    return { settings: null, error: error?.message || "Failed to save settings" };
  }

  return { settings: normalizeSettingsRow(data as Record<string, unknown>) };
}

export async function updateProfileSettings(input: {
  display_name?: string;
  avatar_url?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const payload: Record<string, unknown> = {};

  if (input.display_name !== undefined) {
    const trimmed = input.display_name.trim();
    payload.display_name = trimmed.length > 0 ? trimmed : "Adventurer";
  }

  if (input.avatar_url !== undefined) {
    payload.avatar_url = input.avatar_url;
  }

  if (Object.keys(payload).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getOwnProfileSettings(): Promise<{
  profile: { display_name: string; email: string; avatar_url: string | null } | null;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    return { profile: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { profile: null, error: error?.message || "Profile not found" };
  }

  return {
    profile: {
      display_name: String(data.display_name ?? "Adventurer"),
      email: String(data.email ?? ""),
      avatar_url: (data.avatar_url as string | null) ?? null,
    },
  };
}
