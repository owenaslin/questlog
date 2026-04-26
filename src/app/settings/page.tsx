"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth-hooks";
import { ThemeMode } from "@/lib/types";
import { useUserSettings } from "@/lib/hooks/useUserSettings";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "system", label: "System", hint: "Follow your device preference" },
  { value: "light", label: "Light", hint: "Brighter look for daytime" },
  { value: "dark", label: "Dark", hint: "Dimmer look for low-light sessions" },
];

const AVATAR_OPTIONS = ["🧙", "⚔", "🗡", "🏹", "🎵", "🛡", "🌿", "✨"];

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isCheckingAuth,
    authError,
  } = useRequireAuth("/settings");

  const {
    profile,
    isLoading,
    isSaving,
    error,
    weekStartDay,
    themeMode,
    notificationPreferences,
    saveSettings,
  } = useUserSettings();

  const [displayName, setDisplayName] = useState("Adventurer");
  const [avatar, setAvatar] = useState<string | null>("🧙");
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState(0);
  const [selectedThemeMode, setSelectedThemeMode] = useState<ThemeMode>("system");
  const [habitReminders, setHabitReminders] = useState(true);
  const [questAlerts, setQuestAlerts] = useState(true);
  const [weeklyRecap, setWeeklyRecap] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "Adventurer");
      setAvatar(profile.avatar_url || "🧙");
    }
  }, [profile]);

  useEffect(() => {
    setSelectedWeekStartDay(weekStartDay);
  }, [weekStartDay]);

  useEffect(() => {
    setSelectedThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    setHabitReminders(notificationPreferences.habit_reminders);
    setQuestAlerts(notificationPreferences.quest_alerts);
    setWeeklyRecap(notificationPreferences.weekly_recap);
  }, [notificationPreferences]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme-mode", selectedThemeMode);
    }
  }, [selectedThemeMode]);

  const hasChanges = useMemo(() => {
    return (
      displayName.trim() !== (profile?.display_name || "Adventurer") ||
      (avatar || "🧙") !== (profile?.avatar_url || "🧙") ||
      selectedWeekStartDay !== weekStartDay ||
      selectedThemeMode !== themeMode ||
      habitReminders !== notificationPreferences.habit_reminders ||
      questAlerts !== notificationPreferences.quest_alerts ||
      weeklyRecap !== notificationPreferences.weekly_recap
    );
  }, [
    avatar,
    displayName,
    habitReminders,
    notificationPreferences.habit_reminders,
    notificationPreferences.quest_alerts,
    notificationPreferences.weekly_recap,
    profile?.avatar_url,
    profile?.display_name,
    questAlerts,
    selectedThemeMode,
    selectedWeekStartDay,
    themeMode,
    weekStartDay,
    weeklyRecap,
  ]);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  const confirmDiscardChanges = () => {
    if (!hasChanges) {
      return true;
    }

    return window.confirm("You have unsaved changes. Leave this page without saving?");
  };

  const handleBackToProfileClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (confirmDiscardChanges()) {
      return;
    }

    event.preventDefault();
  };

  const handleSave = async () => {
    setSaveMessage(null);

    const result = await saveSettings({
      display_name: displayName,
      avatar_url: avatar,
      week_start_day: selectedWeekStartDay,
      theme_mode: selectedThemeMode,
      notification_preferences: {
        habit_reminders: habitReminders,
        quest_alerts: questAlerts,
        weekly_recap: weeklyRecap,
      },
    });

    if (result.success) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tavrn_theme_mode", selectedThemeMode);
      }
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme-mode", selectedThemeMode);
      }
      setLastSavedAt(new Date());
      setSaveMessage("Settings saved.");
      return;
    }

    setSaveMessage(result.error || "Could not save settings.");
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="max-w-3xl mx-auto tavrn-panel p-4 md:p-6">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 animate-pulse">
          <div className="h-6 w-40 bg-retro-black mb-4" />
          <div className="h-20 bg-retro-black mb-3" />
          <div className="h-20 bg-retro-black mb-3" />
          <div className="h-20 bg-retro-black" />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="max-w-2xl mx-auto tavrn-panel p-4 md:p-6">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 text-center">
          <p className="font-pixel text-retro-red text-[9px] mb-4">{authError}</p>
          <button
            type="button"
            onClick={() => router.replace(`/login?redirect=${encodeURIComponent(pathname || "/settings")}`)}
            className="font-pixel text-[8px] px-4 py-2 bg-retro-blue text-retro-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto tavrn-panel p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="tavrn-wordmark text-4xl leading-none mb-2">Settings</h1>
          <p className="text-sm text-tavern-parchment-dim">Adjust your tavern experience.</p>
        </div>
        <Link
          href="/profile"
          onClick={handleBackToProfileClick}
          className="font-pixel text-[8px] text-retro-cyan hover:text-retro-lightblue"
        >
          ← Back to Profile
        </Link>
      </div>

      {(error || saveMessage) && (
        <div className="mb-4 bg-retro-darkgray border-2 border-retro-black p-3">
          <p className={`font-pixel text-[8px] ${error ? "text-retro-red" : "text-retro-lime"}`}>
            {error || saveMessage}
          </p>
        </div>
      )}

      <div className="space-y-5">
        <section className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4">
          <h2 className="font-pixel text-retro-yellow text-xs mb-3">👤 Profile</h2>

          <label className="font-pixel text-[8px] text-retro-lightgray block mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment mb-4"
          />

          <p className="font-pixel text-[8px] text-retro-lightgray mb-2">Avatar</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`w-10 h-10 border-2 text-lg ${
                  avatar === emoji
                    ? "border-tavern-gold bg-tavern-oak"
                    : "border-retro-black bg-retro-darkpurple"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {profile?.email && (
            <p className="font-pixel text-[7px] text-retro-gray mt-4">Signed in as {profile.email}</p>
          )}
        </section>

        <section className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4">
          <h2 className="font-pixel text-retro-yellow text-xs mb-3">📅 Habit Tracker</h2>
          <label className="font-pixel text-[8px] text-retro-lightgray block mb-2">Week starts on</label>
          <select
            value={selectedWeekStartDay}
            onChange={(e) => setSelectedWeekStartDay(Number(e.target.value))}
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment"
          >
            {WEEKDAY_OPTIONS.map((day) => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </select>
          <p className="font-pixel text-[7px] text-retro-gray mt-2">
            This controls weekly habit counters and progress windows.
          </p>
        </section>

        <section className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4">
          <h2 className="font-pixel text-retro-yellow text-xs mb-3">🎨 Theme</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedThemeMode(option.value)}
                className={`text-left border-2 p-3 ${
                  selectedThemeMode === option.value
                    ? "border-tavern-gold bg-tavern-oak"
                    : "border-retro-black bg-retro-darkpurple"
                }`}
              >
                <p className="font-pixel text-[8px] text-tavern-parchment">{option.label}</p>
                <p className="text-[11px] text-retro-gray mt-1">{option.hint}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4">
          <h2 className="font-pixel text-retro-yellow text-xs mb-3">🔔 Notifications</h2>
          <div className="space-y-2">
            <label className="flex items-center justify-between bg-retro-darkpurple border-2 border-retro-black p-2">
              <span className="font-pixel text-[8px] text-tavern-parchment">Habit reminders</span>
              <input type="checkbox" checked={habitReminders} onChange={(e) => setHabitReminders(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between bg-retro-darkpurple border-2 border-retro-black p-2">
              <span className="font-pixel text-[8px] text-tavern-parchment">Quest activity alerts</span>
              <input type="checkbox" checked={questAlerts} onChange={(e) => setQuestAlerts(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between bg-retro-darkpurple border-2 border-retro-black p-2">
              <span className="font-pixel text-[8px] text-tavern-parchment">Weekly recap summary</span>
              <input type="checkbox" checked={weeklyRecap} onChange={(e) => setWeeklyRecap(e.target.checked)} />
            </label>
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="font-pixel text-[7px] text-retro-gray min-h-[12px]">
          {lastSavedAt
            ? `Last saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Not saved yet in this session"}
          {hasChanges && " · Unsaved changes"}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="font-pixel text-[8px] px-5 py-3 bg-tavern-gold text-tavern-smoke disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
