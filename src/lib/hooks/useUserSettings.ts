"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_USER_SETTINGS,
  getOwnProfileSettings,
  getUserSettings,
  upsertUserSettings,
  updateProfileSettings,
} from "@/lib/settings";
import {
  DiscoveryPreference,
  EnergyLevel,
  NotificationPreferences,
  RecommendationPreferences,
  ThemeMode,
  UserSettings,
} from "@/lib/types";

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

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(async (input: {
    week_start_day?: number;
    theme_mode?: ThemeMode;
    notification_preferences?: Partial<NotificationPreferences>;
    default_available_time_minutes?: RecommendationPreferences["default_available_time_minutes"];
    default_energy_level?: EnergyLevel;
    preferred_categories?: string[];
    discovery_preferences?: DiscoveryPreference[];
    home_location_label?: string | null;
    display_name?: string;
    avatar_url?: string | null;
  }) => {
    setIsSaving(true);
    setError(null);

    try {
      const [settingsResult, profileResult] = await Promise.all([
        upsertUserSettings({
          week_start_day: input.week_start_day,
          theme_mode: input.theme_mode,
          notification_preferences: input.notification_preferences,
          default_available_time_minutes: input.default_available_time_minutes,
          default_energy_level: input.default_energy_level,
          preferred_categories: input.preferred_categories,
          discovery_preferences: input.discovery_preferences,
          home_location_label: input.home_location_label,
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

      return {
        success: !settingsResult.error && profileResult.success,
        settings: settingsResult.settings,
        profile: profileResult.success ? profile : null,
        error: settingsResult.error || profileResult.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings";
      setError(message);
      return {
        success: false,
        settings: null,
        profile: null,
        error: message,
      };
    } finally {
      setIsSaving(false);
    }
  }, [profile]);

  const weekStartDay = settings?.week_start_day ?? DEFAULT_USER_SETTINGS.week_start_day;
  const themeMode = settings?.theme_mode ?? DEFAULT_USER_SETTINGS.theme_mode;
  const notificationPreferences = settings?.notification_preferences ?? DEFAULT_USER_SETTINGS.notification_preferences;
  const recommendationPreferences: RecommendationPreferences = {
    default_available_time_minutes: settings?.default_available_time_minutes ?? DEFAULT_USER_SETTINGS.default_available_time_minutes,
    default_energy_level: settings?.default_energy_level ?? DEFAULT_USER_SETTINGS.default_energy_level,
    preferred_categories: settings?.preferred_categories ?? DEFAULT_USER_SETTINGS.preferred_categories,
    discovery_preferences: settings?.discovery_preferences ?? DEFAULT_USER_SETTINGS.discovery_preferences,
    home_location_label: settings?.home_location_label ?? DEFAULT_USER_SETTINGS.home_location_label,
  };

  return useMemo(() => ({
    settings,
    profile,
    isLoading,
    error,
    isSaving,
    weekStartDay,
    themeMode,
    notificationPreferences,
    recommendationPreferences,
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
    recommendationPreferences,
    load,
    saveSettings,
  ]);
}
