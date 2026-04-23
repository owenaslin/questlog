"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import XPBar from "@/components/XPBar";
import { BadgeShowcase } from "@/components/BadgeGrid";
import StreakDisplay from "@/components/StreakDisplay";
import WeeklyRecap from "@/components/WeeklyRecap";
import { BADGES } from "@/lib/badges";
import { ALL_QUESTS } from "@/lib/quests";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";
import {
  getProfileProgressSummary,
  getRecentCompletedQuestIds,
  getUserQuestProgressMap,
  getUserStreak,
  getUserEarnedBadgeIds,
  getWeeklyRecap,
  UserStreak,
  WeeklyRecap as WeeklyRecapType,
} from "@/lib/quest-progress";
import { Quest } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [profileSummary, setProfileSummary] = useState<{
    xp_total: number;
    level: number;
    completedCount: number;
    activeCount: number;
  } | null>(null);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecapType | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    const timeout = window.setTimeout(() => {
      if (isMounted) {
        setAuthCheckError("Session check timed out. Please try again.");
        setIsCheckingAuth(false);
      }
    }, 8000);

    const ensureAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session) {
          router.replace(buildAuthUrl("login", pathname || "/profile"));
          return;
        }

        if (!isMounted) {
          return;
        }

        setSessionEmail(data.session.user.email || null);
        const userMeta = data.session.user.user_metadata;
        setSessionName(userMeta?.display_name || userMeta?.name || null);
        setIsCheckingAuth(false);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setAuthCheckError(err instanceof Error ? err.message : "Could not verify your session.");
        setIsCheckingAuth(false);
      } finally {
        window.clearTimeout(timeout);
      }
    };

    ensureAuth();

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (isCheckingAuth || authCheckError) {
      return;
    }

    let isMounted = true;

    const loadProgress = async () => {
      setIsLoadingProgress(true);

      try {
        const [summary, progressMap, recentCompletedIds, streakData, weeklyData, badgeIds] = await Promise.all([
          getProfileProgressSummary(),
          getUserQuestProgressMap(),
          getRecentCompletedQuestIds(10),
          getUserStreak(),
          getWeeklyRecap(0),
          getUserEarnedBadgeIds(),
        ]);

        if (!isMounted) return;

        if (streakData) {
          setStreak(streakData);
        }
        if (weeklyData) {
          setWeeklyRecap(weeklyData);
        }
        setEarnedBadgeIds(badgeIds);

        if (summary) {
          setProfileSummary(summary);
        }

        const merged = ALL_QUESTS.map((quest) => ({
          ...quest,
          status: progressMap[quest.id]?.status || quest.status,
        }));

        setActiveQuests(merged.filter((q) => q.status === "active").slice(0, 8));

        const completedById = new Map(merged.filter((q) => q.status === "completed").map((q) => [q.id, q]));
        const orderedCompleted = recentCompletedIds
          .map((id) => completedById.get(id))
          .filter((q): q is Quest => Boolean(q));
        setCompletedQuests(orderedCompleted.slice(0, 10));
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load profile progress:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProgress(false);
        }
      }
    };

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [authCheckError, isCheckingAuth]);

  const user = useMemo(
    () => ({
      display_name: sessionName || "Adventurer",
      email: sessionEmail || "adventurer@questboard.io",
      xp_total: profileSummary?.xp_total || 0,
      avatar_url: null,
    }),
    [profileSummary?.xp_total, sessionEmail, sessionName]
  );

  const level = profileSummary?.level || 1;

  if (isCheckingAuth) {
    return (
      <div className="max-w-2xl mx-auto tavrn-panel p-4 md:p-6">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6">
          <div className="flex items-center gap-6 animate-pulse">
            <div className="w-20 h-20 bg-retro-black" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-retro-black" />
              <div className="h-3 w-48 bg-retro-black" />
              <div className="h-2 w-24 bg-retro-black" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authCheckError) {
    return (
      <div className="max-w-2xl mx-auto tavrn-panel p-4 md:p-6">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 text-center">
          <p className="font-pixel text-retro-red text-[9px] mb-4">{authCheckError}</p>
          <button
            type="button"
            onClick={() => router.replace(buildAuthUrl("login", pathname || "/profile"))}
            className="font-pixel text-[8px] px-4 py-2 bg-retro-blue text-retro-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto tavrn-panel p-4 md:p-6">
      {/* Profile Header */}
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 mb-8">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-retro-darkpurple border-4 border-retro-black flex items-center justify-center text-3xl">
            🧙
          </div>

          <div className="flex-1">
            <h1 className="font-pixel text-retro-yellow text-sm mb-1">
              {user.display_name}
            </h1>
            <p className="font-pixel text-retro-gray text-[8px] mb-3">
              {user.email}
            </p>

            <div className="flex items-center gap-4 mb-2">
              <span className="font-pixel text-retro-cyan text-[10px]">
                Level {level}
              </span>
              <span className="font-pixel text-retro-lime text-[10px]">
                {user.xp_total} XP Total
              </span>
            </div>

            <XPBar xpTotal={user.xp_total} />
          </div>
        </div>
      </div>

      {/* Streak & Weekly Recap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-retro-darkgray border-4 border-retro-black p-4">
          <h2 className="font-pixel text-retro-yellow text-xs mb-3">
            🔥 Streak
          </h2>
          {streak ? (
            <StreakDisplay
              currentStreak={streak.current_streak}
              longestStreak={streak.longest_streak}
              size="md"
              showLongest={true}
            />
          ) : (
            <div className="flex items-center gap-2 text-retro-gray">
              <span className="text-lg">🔥</span>
              <span className="font-pixel text-[8px]">Complete a quest to start your streak!</span>
            </div>
          )}
        </div>
        <WeeklyRecap recap={weeklyRecap} isLoading={isLoadingProgress} />
      </div>

      {/* Badge Showcase */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-retro-yellow text-sm">
            🏅 Recent Badges
          </h2>
          <Link
            href="/badges"
            className="font-pixel text-retro-cyan text-[8px] hover:text-retro-lightblue"
          >
            View All →
          </Link>
        </div>
        <BadgeShowcase
          badges={BADGES}
          earnedBadgeIds={earnedBadgeIds}
          maxDisplay={4}
        />
      </div>

      {/* Active Quests */}
      <h2 className="tavrn-kicker text-retro-orange text-sm mb-4">
        ▶ Active Quests
      </h2>
      <div className="flex flex-col gap-3 mb-8">
        {activeQuests.length === 0 && !isLoadingProgress && (
          <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
            <p className="font-pixel text-retro-lightgray text-[8px]">
              No active quests yet. Accept one from the quest board.
            </p>
          </div>
        )}

        {activeQuests.map((quest) => (
          <div
            key={quest.id}
            className="bg-retro-darkgray border-4 border-retro-black p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-retro-yellow text-[10px]">
                {quest.title}
              </span>
              <span
                className={`font-pixel text-[8px] px-2 py-1 ${
                  quest.type === "main"
                    ? "bg-retro-red text-retro-white"
                    : "bg-retro-blue text-retro-white"
                }`}
              >
                {quest.type === "main" ? "⚔ Main" : "🗡 Side"}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-pixel text-retro-gray text-[7px]">
                In progress
              </span>
              <span className="font-pixel text-retro-lime text-[7px]">
                +{quest.xp_reward} XP
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Completed Quests */}
      <h2 className="tavrn-kicker text-retro-green text-sm mb-4">
        ✓ Completed Quests
      </h2>
      <div className="flex flex-col gap-2">
        {completedQuests.length === 0 && !isLoadingProgress && (
          <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
            <p className="font-pixel text-retro-lightgray text-[8px]">
              Complete your first quest to see history here.
            </p>
          </div>
        )}

        {completedQuests.map((quest) => (
          <div
            key={quest.id}
            className="bg-retro-darkgray border-4 border-retro-black p-3 flex items-center justify-between opacity-80"
          >
            <div className="flex items-center gap-3">
              <span className="font-pixel text-retro-green text-[10px]">
                ✓
              </span>
              <span className="font-pixel text-retro-lightgray text-[9px]">
                {quest.title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`font-pixel text-[7px] px-2 py-1 ${
                  quest.type === "main"
                    ? "bg-retro-red text-retro-white"
                    : "bg-retro-blue text-retro-white"
                }`}
              >
                {quest.type === "main" ? "Main" : "Side"}
              </span>
              <span className="font-pixel text-retro-lime text-[8px]">
                +{quest.xp_reward} XP
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Timeline */}
      <div className="mt-8 mb-8 bg-retro-darkgray border-4 border-retro-black p-4">
        <h2 className="font-pixel text-retro-cyan text-sm mb-4">
          📅 Recent Activity
        </h2>
        {completedQuests.length === 0 && !isLoadingProgress ? (
          <p className="font-pixel text-retro-gray text-[8px]">
            No recent activity. Start your first quest!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {completedQuests.slice(0, 5).map((quest) => (
              <div key={quest.id} className="flex items-center gap-3 text-[8px]">
                <span className="font-pixel text-retro-green">✓</span>
                <span className="font-pixel text-retro-lightgray flex-1">
                  Completed "{quest.title}"
                </span>
                <span className="font-pixel text-retro-lime">+{quest.xp_reward} XP</span>
              </div>
            ))}
            {completedQuests.length > 5 && (
              <p className="font-pixel text-retro-gray text-[7px] mt-2">
                + {completedQuests.length - 5} more quests completed
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
          <div className="font-pixel text-retro-yellow text-lg">
            {profileSummary?.completedCount ?? completedQuests.length}
          </div>
          <div className="font-pixel text-retro-gray text-[7px] mt-1">
            Completed
          </div>
        </div>
        <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
          <div className="font-pixel text-retro-orange text-lg">
            {profileSummary?.activeCount ?? activeQuests.length}
          </div>
          <div className="font-pixel text-retro-gray text-[7px] mt-1">
            Active
          </div>
        </div>
        <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
          <div className="font-pixel text-retro-lime text-lg">
            {user.xp_total}
          </div>
          <div className="font-pixel text-retro-gray text-[7px] mt-1">
            Total XP
          </div>
        </div>
      </div>
    </div>
  );
}
