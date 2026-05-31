"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import XPBar from "@/components/ui/XPBar";
import StreakDisplay from "@/components/ui/StreakDisplay";
import WeeklyRecap from "@/components/quest/WeeklyRecap";
import DesktopRightRail from "@/components/layout/DesktopRightRail";
import RoutinesSection from "@/components/habit/RoutinesSection";
import PersonalSaga from "@/components/quest/PersonalSaga";
import { generatePersonalSaga } from "@/lib/saga-generator";
import AmbientScene from "@/components/ui/AmbientScene";
import { useViewMode } from "@/components/ui/ViewModeProvider";
import { ALL_QUESTS } from "@/lib/quests";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { useRequireAuth } from "@/lib/auth-hooks";
import {
  getCompletedQuestsForSaga,
  getUserDashboardSnapshot,
  getWeeklyRecap,
  getUserCreatedActiveQuests,
  mergeQuestWithProgress,
  UserStreak,
  WeeklyRecap as WeeklyRecapType,
} from "@/lib/quest-progress";
import { Quest } from "@/lib/types";
import { BadgeShowcase } from "@/components/badge/BadgeGrid";
import { BADGES } from "@/lib/badges";

export default function JournalPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDesktopActive } = useViewMode();

  const {
    isCheckingAuth,
    authError,
    userName,
  } = useRequireAuth("/journal");
  const heroName = userName || "Adventurer";

  const [profileSummary, setProfileSummary] = useState<{
    xp_total: number; level: number; completedCount: number; activeCount: number;
  } | null>(null);
  const [activeQuests, setActiveQuests]     = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [streak, setStreak]                 = useState<UserStreak | null>(null);
  const [weeklyRecap, setWeeklyRecap]       = useState<WeeklyRecapType | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [saga, setSaga]                     = useState<ReturnType<typeof generatePersonalSaga> | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);

  /* ── Load progress ───────────────────────────────────────────────── */
  useEffect(() => {
    if (isCheckingAuth || authError) return;
    let alive = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [snapshot, weeklyData, userQuests] = await Promise.all([
          getUserDashboardSnapshot(),
          getWeeklyRecap(0),
          getUserCreatedActiveQuests(),
        ]);
        if (!alive) return;

        const summary = snapshot?.profileSummary ?? null;
        const progressMap = snapshot?.progressMap ?? {};
        const recentIds = snapshot?.recentCompletedIds ?? [];
        const streakData = snapshot?.streak ?? null;

        if (summary)    setProfileSummary(summary);
        if (streakData) setStreak(streakData);
        if (weeklyData) setWeeklyRecap(weeklyData);
        setEarnedBadgeIds(snapshot?.badgeIds || []);

        const merged = mergeQuestWithProgress(ALL_QUESTS, progressMap);

        // Merge predefined active quests with user-created DB quests
        const predefinedActive = merged.filter((q) => q.status === "active");
        const allActive = [...predefinedActive, ...userQuests];
        setActiveQuests(allActive);

        const completedById = new Map(
          merged.filter((q) => q.status === "completed").map((q) => [q.id, q])
        );
        setCompletedQuests(
          recentIds.map((id) => completedById.get(id)).filter((q): q is Quest => Boolean(q))
        );

        // Generate personal saga from all completed quests (predefined + custom/AI)
        const completedQuestsWithDates = await getCompletedQuestsForSaga();

        const sagaData = generatePersonalSaga(
          completedQuestsWithDates,
          streakData?.longest_streak ?? 0,
          summary?.created_at || new Date().toISOString()
        );
        setSaga(sagaData);
      } catch {
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, [isCheckingAuth, authError]);

  const xpTotal = profileSummary?.xp_total ?? 0;
  const level   = profileSummary?.level ?? 1;

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (isCheckingAuth) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="tavern-card p-6 animate-pulse">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 bg-tavern-smoke" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-tavern-smoke" />
              <div className="h-2 w-48 bg-tavern-smoke" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="max-w-2xl mx-auto tavrn-panel p-4 md:p-6">
        <div className="tavern-card p-6 text-center">
          <p className="text-body-sm text-tavern-ember mb-4">{authError}</p>
          <button
            type="button"
            onClick={() => router.replace(buildAuthUrl("login", pathname || "/journal"))}
            className="tavrn-btn tavrn-btn-ghost"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isDesktopActive ? "max-w-6xl mx-auto tavrn-panel p-4 md:p-6" : "max-w-2xl mx-auto tavrn-panel p-4 md:p-6"}>
      <AmbientScene scene="hearthside" />
      <div className={isDesktopActive ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_288px] gap-6" : ""}>
      <div>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Image src="/tavern/scroll.svg" alt="" width={28} height={24} />
        <div>
          <h1 className="tavrn-wordmark text-3xl leading-none">My Questline</h1>
          <p className="text-body-sm text-[--parchment-dim] mt-0.5">
            {heroName}&apos;s adventure log
          </p>
        </div>
      </div>

      {/* ── Hero strip: XP + level ────────────────────────────────── */}
      <div className="tavern-card px-5 py-4 mb-6 flex items-center gap-5">
        <div className="w-12 h-12 bg-tavern-smoke border-2 border-tavern-oak flex items-center justify-center text-2xl flex-shrink-0">
          🧙
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-body-sm font-semibold text-tavern-gold">Level {level}</span>
            <span className="text-body-sm text-[--parchment-dim] opacity-70">
              {xpTotal} XP total
            </span>
          </div>
          <XPBar xpTotal={xpTotal} showLabel={false} />
        </div>
      </div>

      {/* ── Daily Routines ───────────────────────────────────────── */}
      <RoutinesSection />

      {/* ── Streak + Weekly recap ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="tavern-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔥</span>
            <h2 className="text-body-sm font-semibold text-tavern-gold">Streak</h2>
          </div>
          {streak ? (
            <StreakDisplay
              currentStreak={streak.current_streak}
              longestStreak={streak.longest_streak}
              size="md"
              showLongest
            />
          ) : (
            <p className="text-body-sm text-[--parchment-dim]">
              Complete a quest to start your streak!
            </p>
          )}
        </div>
        <WeeklyRecap recap={weeklyRecap} isLoading={isLoading} />
      </div>

      {/* ── Personal Questline ─────────────────────────────────────────── */}
      {saga && (
        <div className="mb-8">
          <PersonalSaga saga={saga} heroName={heroName} />
        </div>
      )}

      {/* ── Active Quests — journal entries ───────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading text-tavern-gold flex items-center gap-2">
            ▶ Active Quests
            {activeQuests.length > 0 && (
              <span className="badge badge-ember">{activeQuests.length}</span>
            )}
          </h2>
          <Link href="/board" className="text-body-sm text-tavern-gold hover:text-tavern-candle">
            + Find more →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="tavern-card p-4 animate-pulse">
                <div className="h-3 w-3/4 bg-tavern-smoke mb-2" />
                <div className="h-2 w-1/2 bg-tavern-smoke" />
              </div>
            ))}
          </div>
        ) : activeQuests.length === 0 ? (
          <div className="parchment-card p-5 text-center">
            <p className="text-body text-tavern-parchment leading-relaxed mb-3">
              No active quests. The board awaits, adventurer.
            </p>
            <Link href="/board">
              <span className="text-body-sm text-tavern-gold hover:text-tavern-candle underline">
                ⚔ Browse The Board →
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeQuests.map((quest) => (
              <div
                key={quest.id}
                className="tavern-card p-4 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-blue">📜</span>
                    <span className="text-body-sm font-medium text-tavern-parchment leading-snug truncate">
                      {quest.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-body-sm text-tavern-gold">+{quest.xp_reward} XP</span>
                    <span className="text-body-sm text-[--parchment-dim]">{quest.duration_label}</span>
                  </div>
                </div>
                <Link
                  href={`/board/${quest.id}`}
                  className="text-body-sm px-3 py-2 border border-tavern-gold text-tavern-gold hover:bg-tavern-smoke-light flex-shrink-0 whitespace-nowrap min-h-[36px] flex items-center"
                >
                  Continue →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Victories ──────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-heading text-tavern-gold mb-4 flex items-center gap-2">
          <Image src="/tavern/mug.svg" alt="" width={16} height={16} />
          Recent Victories
        </h2>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tavern-card px-4 py-3 animate-pulse">
                <div className="h-2 w-2/3 bg-tavern-smoke" />
              </div>
            ))}
          </div>
        ) : completedQuests.length === 0 ? (
          <div className="parchment-card p-4 text-center">
            <p className="text-body text-tavern-parchment">
              Your tale is yet unwritten. Complete your first quest.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {completedQuests.map((quest, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  border: "2px solid #5c3a1a",
                  background: i === 0 ? "#1f1608" : "#17130a",
                  opacity: 1 - i * 0.07,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-tavern-gold text-base leading-none">✓</span>
                  <span className="text-body text-tavern-parchment truncate">
                    {quest.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-body-sm text-tavern-gold">+{quest.xp_reward} XP</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Trophy Wall ─────────────────────────────────────────── */}
      <div className="mb-6">
        <BadgeShowcase
          badges={BADGES}
          earnedBadgeIds={earnedBadgeIds}
          maxDisplay={6}
        />
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { value: profileSummary?.completedCount ?? completedQuests.length, label: "Completed", color: "text-tavern-gold" },
          { value: profileSummary?.activeCount ?? activeQuests.length, label: "Active",    color: "text-tavern-ember" },
          { value: xpTotal, label: "Total XP",  color: "text-retro-lime" },
        ].map(({ value, label, color }) => (
          <div key={label} className="tavern-card p-3 text-center">
            <div className={`font-pixel text-lg ${color}`}>{value}</div>
            <div className="text-body-sm text-[--parchment-dim] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Footer nav ────────────────────────────────────────────── */}
      <div className="flex justify-center gap-4 pb-4">
        <Link href="/board" className="text-body-sm text-tavern-gold hover:text-tavern-candle">
          ⚔ The Board
        </Link>
        <span className="text-body-sm text-[--parchment-dim]">·</span>
        <Link href="/trophies" className="text-body-sm text-tavern-gold hover:text-tavern-candle">
          🏅 Trophies
        </Link>
        <span className="text-body-sm text-[--parchment-dim]">·</span>
        <Link href="/sagas" className="text-body-sm text-tavern-gold hover:text-tavern-candle">
          📜 Questlines
        </Link>
      </div>
      </div>

      <DesktopRightRail title="Journal Desk">
        <div className="bg-retro-black border-2 border-retro-darkgray p-3">
          <p className="kicker mb-2">Snapshot</p>
          <p className="text-body-sm text-tavern-gold mb-1">Level: {level}</p>
          <p className="text-body-sm text-retro-lime mb-1">XP: {xpTotal}</p>
          <p className="text-body-sm text-retro-cyan">Active: {activeQuests.length}</p>
        </div>
        <div className="bg-retro-black border-2 border-retro-darkgray p-3">
          <p className="kicker mb-2">Quick Paths</p>
          <div className="flex flex-col gap-2">
            <Link href="/board" className="text-body-sm text-tavern-gold hover:text-tavern-candle">⚔ Open Board</Link>
            <Link href="/hero/edit" className="text-body-sm text-retro-lightblue hover:text-retro-white">🧙 Edit Hero</Link>
            <Link href="/trophies" className="text-body-sm text-retro-lime hover:text-retro-white">🏅 View Trophies</Link>
          </div>
        </div>
      </DesktopRightRail>
      </div>
    </div>
  );
}
