"use client";

import { useEffect, useLayoutEffect, useRef, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import {
  acceptQuest,
  getUserDashboardSnapshot,
  type ProfileProgressSummary,
  type UserStreak,
} from "@/lib/quest-progress";
import { getTimeOfDayLabel, isStreakStillActive } from "@/lib/time-of-day";
import {
  getOrCreateTodayAdventure,
  rerollTodaySideQuest,
  type DailyAdventureLoadout,
} from "@/lib/daily-adventure";
import { getDailyQuests, getRandomQuests } from "@/lib/quests";
import type { Quest } from "@/lib/types";
import XPBar from "@/components/ui/XPBar";
import StreakDisplay from "@/components/ui/StreakDisplay";
import DailyHabitsWidget from "@/components/habit/DailyHabitsWidget";
import ActiveQuestTracker from "@/components/quest/ActiveQuestTracker";

const OnboardingModal = lazy(() => import("@/components/modals/OnboardingModal"));

export default function HomePage() {
  const [heroName,       setHeroName]       = useState<string | null>(null);
  const [authChecked,    setAuthChecked]    = useState(false);
  const [profile,        setProfile]        = useState<ProfileProgressSummary | null>(null);
  const [streak,         setStreak]         = useState<UserStreak | null>(null);
  const [activeQuests,   setActiveQuests]   = useState<Quest[]>([]);
  const [pickerQuests,   setPickerQuests]   = useState<Quest[]>([]);
  const [dailyLoadout,   setDailyLoadout]   = useState<DailyAdventureLoadout | null>(null);
  const [actionMessage,  setActionMessage]  = useState<string | null>(null);
  // Guest "Tonight's Hand" state
  const [tonightQuests,  setTonightQuests]  = useState<Quest[]>([]);
  const [pickedId,       setPickedId]       = useState<string | null>(null);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [timeLabel, setTimeLabel] = useState<"Morning" | "Afternoon" | "Tonight">("Tonight");
  const [isDailyAccepting, setIsDailyAccepting] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [drawMessage, setDrawMessage] = useState<string | null>(null);
  const pendingAcceptRef = useRef(false);

  useLayoutEffect(() => {
    setTimeLabel(getTimeOfDayLabel());
  }, []);

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
        const [snapshot, todayAdventure] = await Promise.all([
          getUserDashboardSnapshot(),
          getOrCreateTodayAdventure(),
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

        const adventureActiveQuests = todayAdventure?.activeQuests ?? [];
        const allActiveIds = new Set(adventureActiveQuests.map((q) => q.id));
        if (!pendingAcceptRef.current) {
          setActiveQuests(adventureActiveQuests);
        }
        setPickerQuests(getDailyQuests([...completedIds, ...Array.from(allActiveIds)]));
        setDailyLoadout(todayAdventure);
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

  const handleRerollSuggestedQuest = async () => {
    setDrawMessage(null);
    setIsRerolling(true);
    try {
      const result = await rerollTodaySideQuest();
      if (!result.success) {
        setDrawMessage(result.error || "Could not reroll today's quest.");
        return;
      }
      setDailyLoadout(result.loadout ?? null);
    } catch (err) {
      setDrawMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsRerolling(false);
    }
  };

  const handleAcceptSuggestedQuest = async () => {
    if (!dailyLoadout?.suggestedQuest) return;
    pendingAcceptRef.current = true;
    setIsDailyAccepting(true);
    setDrawMessage(null);
    const quest = dailyLoadout.suggestedQuest;
    try {
      const result = await acceptQuest(quest.id, quest.category);
      if (!result.success) {
        setDrawMessage(result.error || "Could not accept today's quest.");
        return;
      }
      setActiveQuests((prev) => prev.some((q) => q.id === quest.id) ? prev : [...prev, { ...quest, status: "active" }]);
      setActionMessage("Quest accepted.");
    } catch (err) {
      setDrawMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      pendingAcceptRef.current = false;
      setIsDailyAccepting(false);
    }
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
    const timeAdverb = timeLabel === "Morning" ? "this morning" : timeLabel === "Afternoon" ? "this afternoon" : "tonight";
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
              <div className="kicker">{timeLabel}&apos;s Hand · Three Drawn Quests</div>
            </header>

            <div className="tavern-card p-4 md:p-5">
              <p className="kicker text-tavern-gold mb-2">🍺 The barkeep speaks</p>
              <p className="text-[14px] leading-relaxed text-[#dbc59a]">
                Welcome, adventurer. Three quests are laid out {timeAdverb}. Choose your path and begin your legend.
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
                          <span className="badge badge-blue">📜 Quest</span>
                          <span className="badge badge-lime">+{quest.xp_reward} XP</span>
                        </div>
                        <p className="text-body-sm font-medium text-tavern-parchment mb-2 leading-snug">{quest.title}</p>
                        <p className="text-[12px] text-[#cdb68f] leading-relaxed">{blurb}</p>
                      </button>
                    );
                  })}
            </div>

            <div className="tavern-card p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="kicker mb-2">Today&apos;s Quest</p>
                {dataLoading
                  ? <div className="h-3 w-48 bg-tavern-oak/60 rounded animate-pulse" />
                  : <p className="text-body-sm font-semibold text-tavern-gold">{pickedQuest?.title ?? "—"}</p>
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
                  className="tavrn-btn tavrn-btn-ghost"
                >
                  Draw Again
                </button>
                <Link
                  href={pickedQuest ? `/board/${pickedQuest.id}` : "/board"}
                  className="tavrn-btn tavrn-btn-primary"
                >
                  Accept
                </Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="tavrn-panel p-4">
            <p className="kicker mb-3">Hero Ledger</p>
            <p className="text-body-sm font-semibold text-tavern-gold">Adventurer</p>
            <p className="text-body-sm text-tavern-parchment mt-2">Level up by finishing one quest {timeAdverb}.</p>
            <div className="mt-4 h-2 bg-black/40 border border-tavern-oak">
              <div className="h-full bg-tavern-gold" style={{ width: "24%" }} />
            </div>
          </div>
          <div className="tavern-card p-4 !bg-tavern-mystic/20">
            <p className="kicker text-tavern-gold mb-2">⚡ The Quest Giver</p>
            <p className="text-body-sm text-tavern-parchment leading-relaxed mb-3">
              Ask for a quest shaped to your current mood, location, and goals.
            </p>
            <Link href="/generate" className="tavrn-btn tavrn-btn-mystic w-full justify-center">
              Ask The Giver
            </Link>
          </div>
        </aside>
      </div>
    );
  }

  // ── Logged-in view ────────────────────────────────────────────────────────
  const suggestedQuest = dailyLoadout?.suggestedQuest ?? null;
  const showSuggestedQuest = suggestedQuest !== null && !activeQuests.some((q) => q.id === suggestedQuest.id);
  const rerollsUsed = dailyLoadout?.adventure.side_quest_rerolls_used ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero header */}
      <div className="tavrn-panel p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-subhead text-tavern-gold mb-1">
              {dataLoading ? "…" : heroName}
            </p>
            {dataLoading ? (
              <div className="h-4 w-48 bg-tavern-oak/30 rounded animate-pulse mt-1" />
            ) : profile ? (
              <XPBar xpTotal={profile.xp_total} showLabel />
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            {!dataLoading && streak && streak.current_streak > 0 && isStreakStillActive(streak.last_activity_date) && (
              <StreakDisplay
                currentStreak={streak.current_streak}
                longestStreak={streak.longest_streak}
                size="sm"
                showLongest={false}
              />
            )}
            <Link href="/generate" className="tavrn-btn tavrn-btn-mystic tavrn-btn-sm">
              ⚡ Quest Giver
            </Link>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-2 border border-tavern-oak bg-black/30 text-body-sm text-tavern-parchment">
          {actionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
        {/* ── Main column: open tasks ── */}
        <div className="flex flex-col gap-5">

          {/* Active quests — close steps here */}
          <ActiveQuestTracker
            activeQuests={activeQuests}
            loading={dataLoading}
            pickerQuests={pickerQuests}
            onQuestAccepted={(quest) =>
              setActiveQuests((prev) => prev.some((q) => q.id === quest.id) ? prev : [...prev, { ...quest, status: "active" }])
            }
          />

          {/* Today's habits — confirm completions here */}
          <DailyHabitsWidget maxDisplay={20} />
        </div>

        {/* ── Sidebar: get a new quest ── */}
        <aside className="flex flex-col gap-4">
          <div className="tavrn-panel p-4">
            <p className="kicker mb-3">
              🎯 Get a New Quest
              {!dataLoading && showSuggestedQuest && (
                <span className="text-[--parchment-dim] ml-2 normal-case tracking-normal font-normal text-[11px]">
                  ({rerollsUsed}/1 reroll)
                </span>
              )}
            </p>

            {!dataLoading && showSuggestedQuest && suggestedQuest && (
              <div className="border border-tavern-oak/60 bg-black/20 p-3 mb-3">
                <p className="text-[11px] text-[--parchment-dim] mb-1">Suggested for today</p>
                <p className="text-body-sm font-medium text-tavern-parchment leading-snug mb-1">
                  {suggestedQuest.title}
                </p>
                <p className="text-[11px] text-[--parchment-dim] mb-2">
                  +{suggestedQuest.xp_reward} XP · {suggestedQuest.category} · {suggestedQuest.duration_label}
                </p>
                {drawMessage && (
                  <p className="text-body-sm text-tavern-ember mb-2">{drawMessage}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptSuggestedQuest}
                    disabled={isDailyAccepting}
                    aria-busy={isDailyAccepting}
                    className="tavrn-btn tavrn-btn-primary tavrn-btn-sm disabled:opacity-50"
                  >
                    {isDailyAccepting ? "…" : "Accept"}
                  </button>
                  <Link href={`/board/${suggestedQuest.id}`} className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
                    Details
                  </Link>
                  <button
                    type="button"
                    onClick={handleRerollSuggestedQuest}
                    disabled={rerollsUsed >= 1 || isRerolling}
                    className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm disabled:opacity-50"
                  >
                    {isRerolling ? "…" : rerollsUsed >= 1 ? "Rerolled" : "Surprise Me"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link href="/board" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
                <div className="text-lg mb-1">📋</div>
                <p className="text-body-sm text-tavern-parchment">Quest Board</p>
              </Link>
              <Link href="/discover" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
                <div className="text-lg mb-1">⚡</div>
                <p className="text-body-sm text-tavern-parchment">Discover</p>
              </Link>
              <Link href="/packs" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
                <div className="text-lg mb-1">🎴</div>
                <p className="text-body-sm text-tavern-parchment">Draw by Vibe</p>
              </Link>
              <Link href="/nearby" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
                <div className="text-lg mb-1">🗺</div>
                <p className="text-body-sm text-tavern-parchment">Nearby</p>
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="tavrn-panel p-4 grid grid-cols-2 gap-2">
            <Link href="/hero/edit" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">🧙</div>
              <p className="text-body-sm text-tavern-parchment">My Saga</p>
            </Link>
            <Link href="/habits" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">⚡</div>
              <p className="text-body-sm text-tavern-parchment">All Habits</p>
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
