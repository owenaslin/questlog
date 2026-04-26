"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_USER_SETTINGS,
  getOwnProfileSettings,
  getUserSettings,
  upsertUserSettings,
  updateProfileSettings,
} from "@/lib/settings";
import { NotificationPreferences, ThemeMode, UserSettings } from "@/lib/types";

interface ProfileSettingsState {
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<ProfileSettingsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [settingsResult, profileResult] = await Promise.all([
      getUserSettings(),
      getOwnProfileSettings(),
    ]);

    if (settingsResult.error) {
      setError(settingsResult.error);
    }

    if (profileResult.error) {
      setError(profileResult.error);
    }

    setSettings(settingsResult.settings);
    setProfile(profileResult.profile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(async (input: {
    week_start_day?: number;
    theme_mode?: ThemeMode;
    notification_preferences?: Partial<NotificationPreferences>;
    display_name?: string;
    avatar_url?: string | null;
  }) => {
    setIsSaving(true);
    setError(null);

    const [settingsResult, profileResult] = await Promise.all([
      upsertUserSettings({
        week_start_day: input.week_start_day,
        theme_mode: input.theme_mode,
        notification_preferences: input.notification_preferences,
      }),
      updateProfileSettings({
        display_name: input.display_name,
        avatar_url: input.avatar_url,
      }),
    ]);

    if (settingsResult.error) {
      setError(settingsResult.error);
    }

    if (!profileResult.success) {
      setError(profileResult.error || "Failed to update profile settings");
    }

    if (settingsResult.settings) {
      setSettings(settingsResult.settings);
    }

    if (profileResult.success && (input.display_name !== undefined || input.avatar_url !== undefined)) {
      setProfile((prev) => ({
        display_name: input.display_name !== undefined ? input.display_name.trim() || "Adventurer" : prev?.display_name || "Adventurer",
        email: prev?.email || "",
        avatar_url: input.avatar_url !== undefined ? input.avatar_url : prev?.avatar_url || null,
      }));
    }

    setIsSaving(false);

    return {
      success: !settingsResult.error && profileResult.success,
      settings: settingsResult.settings,
      profile: profileResult.success ? profile : null,
      error: settingsResult.error || profileResult.error,
    };
  }, [profile]);

  const weekStartDay = settings?.week_start_day ?? DEFAULT_USER_SETTINGS.week_start_day;
  const themeMode = settings?.theme_mode ?? DEFAULT_USER_SETTINGS.theme_mode;
  const notificationPreferences = settings?.notification_preferences ?? DEFAULT_USER_SETTINGS.notification_preferences;

  return useMemo(() => ({
    settings,
    profile,
    isLoading,
    error,
    isSaving,
    weekStartDay,
    themeMode,
    notificationPreferences,
    reload: load,
    saveSettings,
  }), [
    settings,
    profile,
    isLoading,
    error,
    isSaving,
    weekStartDay,
    themeMode,
    notificationPreferences,
    load,
    saveSettings,
  ]);
}
