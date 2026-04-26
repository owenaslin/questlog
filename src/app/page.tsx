"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getUserDashboardSnapshot,
  getUserCreatedActiveQuests,
  type ProfileProgressSummary,
  type UserStreak,
} from "@/lib/quest-progress";
import { getDailyQuests, ALL_QUESTS, getRandomQuests } from "@/lib/quests";
import type { Quest } from "@/lib/types";
import XPBar from "@/components/XPBar";
import StreakDisplay from "@/components/StreakDisplay";
import DailyHabitsWidget from "@/components/DailyHabitsWidget";
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
  // Guest "Tonight's Hand" state
  const [tonightQuests,  setTonightQuests]  = useState<Quest[]>([]);
  const [pickedId,       setPickedId]       = useState<string | null>(null);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadData = async (mounted: { current: boolean }) => {
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
      const [snapshot, customActive] = await Promise.all([
        getUserDashboardSnapshot(),
        getUserCreatedActiveQuests(),
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

      const activeEntries = Object.entries(progressMap).filter(([, p]) => p.status === "active");
      const activeIdSet = new Set(activeEntries.map(([id]) => id));

      const activePredefined = ALL_QUESTS.filter((q) => activeIdSet.has(q.id));
      const allActiveQuests: Quest[] = [
        ...activePredefined.map((q) => ({ ...q, status: "active" as const })),
        ...customActive,
      ];

      const mainQuest = allActiveQuests.find((q) => q.type === "main") ?? null;
      const sideQuests = allActiveQuests.filter((q) => q.type === "side");

      setActiveMainQuest(mainQuest);
      setActiveSideQuests(sideQuests);

      // Picker quests: exclude completed + currently active
      const allActiveIds = new Set(allActiveQuests.map((q) => q.id));
      const pickerPool = getDailyQuests([...completedIds, ...Array.from(allActiveIds)]);
      setPickerQuests(pickerPool);
    } catch (err) {
      console.error("[home] data fetch failed:", err);
      if (!mounted.current) return;
      setPickerQuests(getDailyQuests());
    } finally {
      if (mounted.current) setDataLoading(false);
    }
  };

  useEffect(() => {
    const mounted = { current: true };
    loadData(mounted);
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoggedIn = authChecked && heroName !== null;
  const hasActiveMain = !!activeMainQuest;

  // ── Guest view ────────────────────────────────────────────────────────────
  if (!authChecked || (!isLoggedIn && authChecked)) {
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
            <p className="text-[12px] text-[#cfb88f] mt-2">Level up by finishing one quest tonight.</p>
            <div className="mt-4 h-2 bg-black/40 border border-tavern-oak">
              <div className="h-full bg-tavern-gold" style={{ width: "24%" }} />
            </div>
          </div>
          <div className="tavern-card p-4" style={{ background: "linear-gradient(180deg, #3a1a3a, #1a0820)" }}>
            <p className="font-pixel text-[8px] text-tavern-gold mb-2">⚡ The Quest Giver</p>
            <p className="text-[13px] text-[#e8d4a0] leading-relaxed mb-3">
              Ask for a quest shaped to your current mood, location, and goals.
            </p>
            <Link href="/generate" className="tavrn-button block text-center !bg-[#8b2a8b] !text-white">
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
            <Link href="/generate" className="tavrn-button !bg-[#8b2a8b] !text-white text-[8px] !py-1.5 !px-3">
              ⚡ Quest Giver
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
        {/* ── Main column ── */}
        <div className="flex flex-col gap-5">
          {/* Active main quest or picker */}
          {dataLoading ? (
            <div className="tavern-card p-5 animate-pulse space-y-3">
              <div className="h-3 w-1/4 bg-tavern-oak/60 rounded" />
              <div className="h-4 w-3/4 bg-tavern-oak/50 rounded" />
              <div className="h-2 bg-tavern-oak/40 rounded" />
              <div className="h-8 bg-tavern-oak/30 rounded mt-2" />
            </div>
          ) : hasActiveMain ? (
            <ActiveQuestPanel quest={activeMainQuest!} />
          ) : (
            <QuestPickerPanel
              quests={pickerQuests}
              onAccepted={(quest) => {
                if (quest.type === "main") {
                  setActiveMainQuest({ ...quest, status: "active" });
                } else {
                  setActiveSideQuests((prev) => [...prev, { ...quest, status: "active" }]);
                }
                // Remove from picker list
                setPickerQuests((prev) => prev.filter((q) => q.id !== quest.id));
              }}
            />
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
                      <p className="text-[10px] text-[#bda780]">+{quest.xp_reward} XP · {quest.category}</p>
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
              <p className="text-[12px] text-[#bda780]">No side quests in progress.</p>
              <Link href="/board" className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px] !py-1.5 !px-3">
                Browse Side Quests
              </Link>
            </div>
          )}
        </div>

        {/* ── Sidebar column ── */}
        <aside className="flex flex-col gap-4">
          {/* Daily Habits Widget — inline completion */}
          <DailyHabitsWidget maxDisplay={8} />

          {/* Quick links */}
          <div className="tavrn-panel p-4 grid grid-cols-2 gap-2">
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
            <Link href="/questlines" className="tavern-card p-3 text-center hover:border-tavern-gold/50 transition-none">
              <div className="text-lg mb-1">📜</div>
              <p className="font-pixel text-[8px] text-tavern-parchment">Questlines</p>
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
