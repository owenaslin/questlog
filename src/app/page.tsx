"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import {
  acceptQuest,
  getUserDashboardSnapshot,
  type ProfileProgressSummary,
  type UserStreak,
} from "@/lib/quest-progress";
import {
  completeTodayAdventure,
  getDailyAdventureStats,
  getOrCreateTodayAdventure,
  rerollTodaySideQuest,
  saveTodayReflection,
  type DailyAdventureStats,
  type DailyAdventureLoadout,
} from "@/lib/daily-adventure";
import { getDailyQuests, ALL_QUESTS, getRandomQuests } from "@/lib/quests";
import type { Quest } from "@/lib/types";
import XPBar from "@/components/XPBar";
import StreakDisplay from "@/components/StreakDisplay";
const DailyHabitsWidget = lazy(() => import("@/components/DailyHabitsWidget"));
import ActiveQuestPanel from "@/components/ActiveQuestPanel";
import QuestPickerPanel from "@/components/QuestPickerPanel";

const OnboardingModal = lazy(() => import("@/components/OnboardingModal"));

export default function HomePage() {
  const [heroName,       setHeroName]       = useState<string | null>(null);
  const [authChecked,    setAuthChecked]    = useState(false);
  const [profile,        setProfile]        = useState<ProfileProgressSummary | null>(null);
  const [streak,         setStreak]         = useState<UserStreak | null>(null);
  const [activeMainQuest,setActiveMainQuest]= useState<Quest | null>(null);
  const [activeSideQuests,setActiveSideQuests]= useState<Quest[]>([]);
  const [pickerQuests,   setPickerQuests]   = useState<Quest[]>([]);
  const [dailyLoadout,   setDailyLoadout]   = useState<DailyAdventureLoadout | null>(null);
  const [dailyStats,     setDailyStats]     = useState<DailyAdventureStats | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const [dailyActionMessage, setDailyActionMessage] = useState<string | null>(null);
  // Guest "Tonight's Hand" state
  const [tonightQuests,  setTonightQuests]  = useState<Quest[]>([]);
  const [pickedId,       setPickedId]       = useState<string | null>(null);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const mounted = { current: true };

    (async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted.current) return;

      if (session) {
        const meta = session.user.user_metadata;
        setHeroName(meta?.display_name || meta?.name || "Adventurer");
      }
      setAuthChecked(true);

      if (!session) {
        const quests = getDailyQuests();
        setTonightQuests(quests);
        setPickedId(quests[1]?.id ?? quests[0]?.id ?? null);
        setDataLoading(false);
        return;
      }

      try {
        const [snapshot, todayAdventure, adventureStats] = await Promise.all([
          getUserDashboardSnapshot(),
          getOrCreateTodayAdventure(),
          getDailyAdventureStats(),
        ]);

        if (!mounted.current) return;

        const profileData = snapshot?.profileSummary ?? null;
        const streakData = snapshot?.streak ?? null;
        const progressMap = snapshot?.progressMap ?? {};

        setProfile(profileData);
        setStreak(streakData);

        if (
          profileData &&
          profileData.completedCount === 0 &&
          profileData.activeCount === 0 &&
          !localStorage.getItem("tavrn_onboarding_done")
        ) {
          setShowOnboarding(true);
        }

        const completedIds = Object.entries(progressMap)
          .filter(([, p]) => p.status === "completed")
          .map(([id]) => id);

        const allActiveQuests = [
          ...(todayAdventure?.mainQuest ? [todayAdventure.mainQuest] : []),
          ...(todayAdventure?.activeSideQuests ?? []),
        ];

        const allActiveIds = new Set(allActiveQuests.map((q) => q.id));
        setActiveMainQuest(todayAdventure?.mainQuest ?? null);
        setActiveSideQuests(todayAdventure?.activeSideQuests ?? []);
        setPickerQuests(getDailyQuests([...completedIds, ...Array.from(allActiveIds)]));
        setDailyLoadout(todayAdventure);
        setDailyStats(adventureStats);
        setReflectionText(todayAdventure?.adventure.reflection_answer ?? "");
      } catch (err) {
        console.error("[home] data fetch failed:", err);
        if (!mounted.current) return;
        setPickerQuests(getDailyQuests());
      } finally {
        if (mounted.current) setDataLoading(false);
      }
    })();

    return () => { mounted.current = false; };
  }, []);

  const isLoggedIn = authChecked && heroName !== null;

  const handleRerollSideQuest = async () => {
    setDailyActionMessage(null);
    const result = await rerollTodaySideQuest();
    if (!result.success) {
      setDailyActionMessage(result.error || "Could not reroll today's side quest.");
      return;
    }
    setDailyLoadout(result.loadout ?? null);
    setDailyActionMessage("A fresh side quest has been drawn.");
  };

  const handleAcceptDailySideQuest = async () => {
    if (!dailyLoadout?.sideQuest) return;
    setDailyActionMessage(null);
    const quest = dailyLoadout.sideQuest;
    const result = await acceptQuest(quest.id, quest.type, quest.category);
    if (!result.success) {
      setDailyActionMessage(result.error || "Could not accept today's side quest.");
      return;
    }
    setActiveSideQuests((prev) => prev.some((q) => q.id === quest.id) ? prev : [...prev, { ...quest, status: "active" }]);
    setDailyActionMessage("Side quest accepted.");
  };

  const handleSaveReflection = async () => {
    setDailyActionMessage(null);
    const result = await saveTodayReflection(reflectionText);
    setDailyActionMessage(result.success ? "Reflection saved." : result.error || "Could not save reflection.");
  };

  const handleCompleteTodayAdventure = async () => {
    setDailyActionMessage(null);
    const saveResult = await saveTodayReflection(reflectionText);
    if (!saveResult.success) {
      setDailyActionMessage(saveResult.error || "Could not save reflection.");
      return;
    }

    const completeResult = await completeTodayAdventure();
    if (!completeResult.success || !completeResult.adventure) {
      setDailyActionMessage(completeResult.error || "Could not complete today's adventure.");
      return;
    }

    const refreshedStats = await getDailyAdventureStats();
    setDailyLoadout((prev) => prev ? { ...prev, adventure: completeResult.adventure! } : prev);
    setDailyStats(refreshedStats);
    setDailyActionMessage("Today's adventure is complete. Rest well, hero.");
  };

  // ── Auth skeleton — shown while we don't know yet if user is logged in ───
  if (!authChecked) {
    return (
      <div className="tavrn-panel p-5 md:p-7 animate-pulse space-y-4">
        <div className="h-8 w-32 bg-tavern-oak/50 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-tavern-oak/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // ── Guest view ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    const pickedQuest = tonightQuests.find((q) => q.id === pickedId) ?? tonightQuests[0] ?? null;

    return (
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
        <section className="tavrn-panel p-5 md:p-7">
          <div className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#4b3b2e] pb-4">
              <div>
                <h1 className="tavrn-wordmark text-4xl leading-none">tavrn</h1>
                <p className="text-[11px] text-[#cdb68f] mt-2 tracking-wide">a quiet corner of your life</p>
              </div>
              <div className="tavrn-kicker">Tonight&apos;s Hand · Three Drawn Quests</div>
            </header>

            <div className="tavern-card p-4 md:p-5">
              <p className="font-pixel text-tavern-gold text-[8px] mb-2">🍺 The barkeep speaks</p>
              <p className="text-[14px] leading-relaxed text-[#dbc59a]">
                Welcome, adventurer. Three quests are laid out tonight. Choose your path and begin your legend.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dataLoading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="tavern-card p-4 animate-pulse">
                      <div className="flex justify-between mb-3">
                        <div className="h-2 w-12 bg-tavern-oak/60 rounded" />
                        <div className="h-2 w-10 bg-tavern-oak/60 rounded" />
                      </div>
                      <div className="h-3 w-3/4 bg-tavern-oak/60 rounded mb-2" />
                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-tavern-oak/40 rounded" />
                        <div className="h-2 w-5/6 bg-tavern-oak/40 rounded" />
                      </div>
                    </div>
                  ))
                : tonightQuests.map((quest) => {
                    const active = pickedId === quest.id;
                    const blurb = quest.description.length > 100
                      ? quest.description.slice(0, 97) + "…"
                      : quest.description;
                    return (
                      <button
                        key={quest.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPickedId(quest.id)}
                        className={`text-left tavern-card p-4 transition-none ${
                          active ? "ring-2 ring-tavern-gold" : "opacity-90 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="font-pixel text-[7px] text-tavern-gold uppercase">
                            {quest.type === "main" ? "⚔ Main" : "🗡 Side"}
                          </span>
                          <span className="font-pixel text-[7px] text-retro-lime">+{quest.xp_reward} XP</span>
                        </div>
                        <p className="font-pixel text-[9px] text-tavern-parchment mb-2 leading-relaxed">{quest.title}</p>
                        <p className="text-[12px] text-[#cdb68f] leading-relaxed">{blurb}</p>
                      </button>
                    );
                  })}
            </div>

            <div className="tavern-card p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="tavrn-kicker mb-2">Today&apos;s Quest</p>
                {dataLoading
                  ? <div className="h-3 w-48 bg-tavern-oak/60 rounded animate-pulse" />
                  : <p className="font-pixel text-[9px] text-tavern-gold">{pickedQuest?.title ?? "—"}</p>
                }
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newQuests = getRandomQuests(tonightQuests.map((q) => q.id));
                    setTonightQuests(newQuests);
                    setPickedId(newQuests[1]?.id ?? newQuests[0]?.id ?? null);
                  }}
                  className="tavrn-button !bg-tavern-oak !text-tavern-parchment"
                >
                  Draw Again
                </button>
                <Link
                  href={pickedQuest ? `/board/${pickedQuest.id}` : "/board"}
                  className="tavrn-button"
                >
                  Accept
                </Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="tavrn-panel p-4">
            <p className="tavrn-kicker mb-3">Hero Ledger</p>
            <p className="font-pixel text-[10px] text-tavern-gold">Adventurer</p>
            <p className="text-[12px] text-tavern-parchment mt-2">Level up by finishing one quest tonight.</p>
            <div className="mt-4 h-2 bg-black/40 border border-tavern-oak">
              <div className="h-full bg-tavern-gold" style={{ width: "24%" }} />
            </div>
          </div>
          <div className="tavern-card p-4 !bg-tavern-mystic/20">
            <p className="font-pixel text-[8px] text-tavern-gold mb-2">⚡ The Quest Giver</p>
            <p className="text-[13px] text-tavern-parchment leading-relaxed mb-3">
              Ask for a quest shaped to your current mood, location, and goals.
            </p>
            <Link href="/generate" className="tavrn-button block text-center !bg-tavern-mystic !text-white">
              Ask The Giver
            </Link>
          </div>
        </aside>
      </div>
    );
  }

  // ── Logged-in view ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Hero header */}
      <div className="tavrn-panel p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-pixel text-[10px] text-tavern-gold mb-1">
              {dataLoading ? "…" : heroName}
            </p>
            {!dataLoading && profile && (
              <XPBar xpTotal={profile.xp_total} showLabel />
            )}
          </div>
          <div className="flex items-center gap-4">
            {!dataLoading && streak && streak.current_streak > 0 && (
              <StreakDisplay
                currentStreak={streak.current_streak}
                longestStreak={streak.longest_streak}
                size="sm"
                showLongest={false}
              />
            )}
            <Link href="/generate" className="tavrn-button !bg-tavern-mystic !text-white text-[8px] !py-1.5 !px-3">
              ⚡ Quest Giver
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
        {/* ── Main column ── */}
        <div className="flex flex-col gap-5">
          {/* Daily Adventure Board */}
          {dataLoading ? (
            <div className="tavrn-panel p-4 md:p-5 animate-pulse">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5 border-b border-tavern-oak/50 pb-4">
                <div>
                  <div className="h-3 w-32 bg-tavern-oak/60 rounded mb-2" />
                  <div className="h-4 w-48 bg-tavern-oak/60 rounded mb-2" />
                  <div className="h-3 w-64 bg-tavern-oak/40 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-tavern-oak/60 rounded" />
                  <div className="h-6 w-20 bg-tavern-oak/60 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="tavern-card p-4">
                  <div className="h-2 w-24 bg-tavern-oak/60 rounded mb-3" />
                  <div className="h-3 w-full bg-tavern-oak/40 rounded mb-2" />
                  <div className="h-3 w-5/6 bg-tavern-oak/40 rounded" />
                </div>
                <div className="tavern-card p-4">
                  <div className="h-2 w-24 bg-tavern-oak/60 rounded mb-3" />
                  <div className="h-3 w-full bg-tavern-oak/40 rounded mb-2" />
                  <div className="h-3 w-4/6 bg-tavern-oak/40 rounded" />
                </div>
              </div>
            </div>
          ) : (
            <div className="tavrn-panel p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5 border-b border-tavern-oak/50 pb-4">
                <div>
                  <p className="tavrn-kicker mb-2">Today&apos;s Adventure</p>
                  <h1 className="font-pixel text-[14px] text-tavern-gold leading-relaxed">Your daily quest loop</h1>
                  <p className="text-[12px] text-tavern-parchment-dark mt-2">Focus your main quest, complete a ritual, and try one side adventure.</p>
                </div>
                <Link href="/settings" className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px] !py-1.5 !px-3">
                  Tune Preferences
                </Link>
                <Link href="/packs" className="tavrn-button !bg-tavern-mystic !text-white text-[8px] !py-1.5 !px-3">
                  Draw by Vibe
                </Link>
              </div>

              {dailyActionMessage && (
                <div className="mb-4 p-2 border border-tavern-oak bg-black/30 text-[11px] text-tavern-parchment">
                  {dailyActionMessage}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="tavern-card p-4">
                  <p className="font-pixel text-[8px] text-tavern-ember mb-3">⚔ Main Quest Focus</p>
                  {activeMainQuest ? (
                    <ActiveQuestPanel quest={activeMainQuest} />
                  ) : (
                    <div>
                      <p className="text-[12px] text-tavern-parchment-dark mb-3">Choose one long-term quest to anchor your adventure.</p>
                      <QuestPickerPanel
                        quests={pickerQuests.filter((quest) => quest.type === "main").slice(0, 2)}
                        onAccepted={(quest) => setActiveMainQuest({ ...quest, status: "active" })}
                      />
                    </div>
                  )}
                </div>

                <div className="tavern-card p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="font-pixel text-[8px] text-tavern-gold">🗡 Today&apos;s Side Quest</p>
                    <span className="font-pixel text-[7px] text-tavern-parchment-dim">
                      {dailyLoadout ? `${dailyLoadout.adventure.side_quest_rerolls_used}/1 reroll` : "—"}
                    </span>
                  </div>
                  {dailyLoadout?.sideQuest ? (
                    <div>
                      <p className="font-pixel text-[10px] text-tavern-parchment leading-relaxed mb-2">{dailyLoadout.sideQuest.title}</p>
                      <p className="text-[12px] text-tavern-parchment-dark leading-relaxed mb-3">{dailyLoadout.sideQuest.description}</p>
                      <p className="text-[10px] text-tavern-parchment-dim mb-4">
                        +{dailyLoadout.sideQuest.xp_reward} XP · {dailyLoadout.sideQuest.category} · {dailyLoadout.sideQuest.duration_label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={handleAcceptDailySideQuest} className="tavrn-button text-[8px] !py-1.5 !px-3">
                          Accept
                        </button>
                        <Link href={`/quests/${dailyLoadout.sideQuest.id}`} className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px] !py-1.5 !px-3">
                          Details
                        </Link>
                        <button
                          type="button"
                          onClick={handleRerollSideQuest}
                          disabled={dailyLoadout.adventure.side_quest_rerolls_used >= 1}
                          className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px] !py-1.5 !px-3 disabled:opacity-50"
                        >
                          Surprise Me
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-tavern-parchment-dark">No side quest was drawn yet. Try browsing the quest board.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 tavern-card p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-pixel text-[8px] text-tavern-gold">🕯 Reflection Prompt</p>
                  {dailyLoadout?.adventure.completed_at && (
                    <span className="font-pixel text-[7px] text-retro-lime">Complete</span>
                  )}
                </div>
                <p className="text-[12px] text-tavern-parchment-dark mb-3">{dailyLoadout?.adventure.generated_prompt ?? "What should tomorrow's quest be?"}</p>
                <textarea
                  value={reflectionText}
                  onChange={(event) => setReflectionText(event.target.value)}
                  rows={3}
                  className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment text-sm mb-3"
                  placeholder="Write a quick note before closing the tavern..."
                  disabled={!!dailyLoadout?.adventure.completed_at}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveReflection}
                    disabled={!!dailyLoadout?.adventure.completed_at}
                    className="tavrn-button text-[8px] !py-1.5 !px-3 disabled:opacity-50"
                  >
                    Save Reflection
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteTodayAdventure}
                    disabled={!!dailyLoadout?.adventure.completed_at}
                    className="tavrn-button !bg-tavern-mystic !text-white text-[8px] !py-1.5 !px-3 disabled:opacity-50"
                  >
                    Complete Today
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active side quests */}
          {!dataLoading && activeSideQuests.length > 0 && (
            <div className="tavrn-panel p-4">
              <p className="tavrn-kicker mb-3">Side Quests in Progress</p>
              <div className="space-y-2">
                {activeSideQuests.map((quest) => (
                  <Link
                    key={quest.id}
                    href={`/quests/${quest.id}`}
                    className="flex items-center justify-between p-3 border border-tavern-oak/50 hover:border-tavern-gold/50 transition-none group"
                  >
                    <div>
                      <p className="font-pixel text-[9px] text-tavern-parchment group-hover:text-tavern-gold leading-relaxed">
                        {quest.title}
                      </p>
                      <p className="text-[10px] text-tavern-parchment-dim">+{quest.xp_reward} XP · {quest.category}</p>
                    </div>
                    <span className="font-pixel text-[8px] text-tavern-gold opacity-0 group-hover:opacity-100">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pick a side quest prompt (when no side quests active) */}
          {!dataLoading && activeSideQuests.length === 0 && (
            <div className="tavrn-panel p-4 flex items-center justify-between gap-4">
              <p className="text-[12px] text-tavern-parchment-dim">No side quests in progress.</p>
              <Link href="/board" className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px] !py-1.5 !px-3">
                Browse Side Quests
              </Link>
            </div>
          )}
        </div>

        {/* ── Sidebar column ── */}
        <aside className="flex flex-col gap-4">
          {!dataLoading && dailyStats && (
            <div className="tavrn-panel p-4">
              <p className="tavrn-kicker mb-3">Adventure Ledger</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="tavern-card p-3 text-center">
                  <p className="font-pixel text-[7px] text-tavern-parchment-dim mb-1">Loops</p>
                  <p className="font-pixel text-[14px] text-tavern-gold">{dailyStats.totalCompleted}</p>
                </div>
                <div className="tavern-card p-3 text-center">
                  <p className="font-pixel text-[7px] text-tavern-parchment-dim mb-1">Rate</p>
                  <p className="font-pixel text-[14px] text-retro-cyan">{dailyStats.completionRate}%</p>
                </div>
                <div className="tavern-card p-3 text-center">
                  <p className="font-pixel text-[7px] text-tavern-parchment-dim mb-1">Streak</p>
                  <p className="font-pixel text-[14px] text-retro-lime">{dailyStats.currentCompletionStreak}</p>
                </div>
                <div className="tavern-card p-3 text-center">
                  <p className="font-pixel text-[7px] text-tavern-parchment-dim mb-1">Notes</p>
                  <p className="font-pixel text-[14px] text-tavern-parchment">{dailyStats.reflectionsWritten}</p>
                </div>
              </div>
              <Link href="/profile" className="tavrn-button block text-center mt-3 !bg-tavern-oak !text-tavern-parchment text-[8px] !py-1.5">
                View Adventure Log
              </Link>
            </div>
          )}

          {/* Daily Habits Widget — inline completion */}
          <Suspense fallback={<div className="tavrn-panel p-4 h-32 animate-pulse" />}>
            <DailyHabitsWidget maxDisplay={8} />
          </Suspense>

          {/* Quick links */}
          <div className="tavrn-panel p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            <Link href="/profile" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">🧙</div>
              <p className="font-pixel text-[8px] text-tavern-parchment">My Saga</p>
            </Link>
            <Link href="/board" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">📋</div>
              <p className="font-pixel text-[8px] text-tavern-parchment">Quest Board</p>
            </Link>
            <Link href="/habits" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">⚡</div>
              <p className="font-pixel text-[8px] text-tavern-parchment">All Habits</p>
            </Link>
            <Link href="/packs" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">🎴</div>
              <p className="font-pixel text-[8px] text-tavern-parchment">Quest Packs</p>
            </Link>
            <Link href="/nearby" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">🗺</div>
              <p className="font-pixel text-[8px] text-tavern-parchment">Nearby</p>
            </Link>
          </div>
        </aside>
      </div>

      {showOnboarding && heroName && (
        <Suspense fallback={null}>
          <OnboardingModal
            heroName={heroName}
            onDismiss={() => {
              localStorage.setItem("tavrn_onboarding_done", "1");
              setShowOnboarding(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
