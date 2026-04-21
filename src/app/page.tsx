"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getProfileProgressSummary,
  getUserStreak,
  getUserQuestProgressMap,
  getUserCreatedActiveQuests,
  type ProfileProgressSummary,
  type UserStreak,
} from "@/lib/quest-progress";
import { getDailyQuests, ALL_QUESTS } from "@/lib/quests";
import type { Quest } from "@/lib/types";
import XPBar from "@/components/XPBar";
import StreakDisplay from "@/components/StreakDisplay";

export default function HomePage() {
  const [heroName,      setHeroName]      = useState<string | null>(null);
  const [authChecked,   setAuthChecked]   = useState(false);
  const [profile,       setProfile]       = useState<ProfileProgressSummary | null>(null);
  const [streak,        setStreak]        = useState<UserStreak | null>(null);
  const [activeQuest,   setActiveQuest]   = useState<Quest | null>(null);
  const [tonightQuests, setTonightQuests] = useState<Quest[]>([]);
  const [pickedId,      setPickedId]      = useState<string | null>(null);
  const [dataLoading,   setDataLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session  = data.session;

      if (session) {
        const meta = session.user.user_metadata;
        setHeroName(meta?.display_name || meta?.name || "Adventurer");
      }
      setAuthChecked(true);

      if (!session) {
        // Guest: show today's quests with no exclusions
        const quests = getDailyQuests();
        setTonightQuests(quests);
        setPickedId(quests[1]?.id ?? quests[0]?.id ?? null);
        setDataLoading(false);
        return;
      }

      // Logged-in: fetch profile, streak, and quest progress in parallel
      try {
        const [profileData, streakData, progressMap, customActive] = await Promise.all([
          getProfileProgressSummary(),
          getUserStreak(),
          getUserQuestProgressMap(),
          getUserCreatedActiveQuests(),
        ]);

        setProfile(profileData);
        setStreak(streakData);

        const completedIds = Object.entries(progressMap)
          .filter(([, p]) => p.status === "completed")
          .map(([id]) => id);
        const activeIdSet = new Set(
          Object.entries(progressMap)
            .filter(([, p]) => p.status === "active")
            .map(([id]) => id)
        );

        const activePredefined = ALL_QUESTS.find((q) => activeIdSet.has(q.id)) ?? null;
        setActiveQuest(activePredefined ?? customActive[0] ?? null);

        const quests = getDailyQuests(completedIds);
        setTonightQuests(quests);
        setPickedId(quests[1]?.id ?? quests[0]?.id ?? null);
      } catch (err) {
        console.error("[tonight] data fetch failed:", err);
        // Show real daily quests even if personal data failed to load
        const quests = getDailyQuests();
        setTonightQuests(quests);
        setPickedId(quests[1]?.id ?? quests[0]?.id ?? null);
      } finally {
        setDataLoading(false);
      }
    };

    load();
  }, []);

  const isLoggedIn  = authChecked && heroName !== null;
  const pickedQuest = tonightQuests.find((q) => q.id === pickedId) ?? tonightQuests[0] ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
      {/* ── Main panel ─────────────────────────────────────────────────────── */}
      <section className="tavrn-panel p-5 md:p-7">
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#4b3b2e] pb-4">
            <div>
              <h1 className="tavrn-wordmark text-4xl leading-none">tavrn</h1>
              <p className="text-[11px] text-[#cdb68f] mt-2 tracking-wide">a quiet corner of your life</p>
            </div>
            <div className="tavrn-kicker">Tonight&apos;s Hand · Three Drawn Quests</div>
          </header>

          {/* Barkeep greeting */}
          <div className="tavern-card p-4 md:p-5">
            <p className="font-pixel text-tavern-gold text-[8px] mb-2">🍺 The barkeep speaks</p>
            <p className="text-[14px] leading-relaxed text-[#dbc59a]">
              {isLoggedIn
                ? `Welcome back, ${heroName}. Three quests are on the table tonight. Pick one and make it count.`
                : "Welcome, adventurer. Three quests are laid out tonight. Choose your path and begin your legend."}
            </p>
          </div>

          {/* Tonight's quest cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dataLoading
              ? /* Loading skeletons */
                [0, 1, 2].map((i) => (
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
                  const blurb  = quest.description.length > 100
                    ? quest.description.slice(0, 97) + "…"
                    : quest.description;
                  return (
                    <button
                      key={quest.id}
                      type="button"
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
                      <p className="font-pixel text-[9px] text-tavern-parchment mb-2 leading-relaxed">
                        {quest.title}
                      </p>
                      <p className="text-[12px] text-[#cdb68f] leading-relaxed">{blurb}</p>
                    </button>
                  );
                })}
          </div>

          {/* Today's Quest CTA */}
          <div className="tavern-card p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="tavrn-kicker mb-2">Today&apos;s Quest</p>
              {dataLoading
                ? <div className="h-3 w-48 bg-tavern-oak/60 rounded animate-pulse" />
                : <p className="font-pixel text-[9px] text-tavern-gold">{pickedQuest?.title ?? "—"}</p>
              }
            </div>
            <div className="flex gap-2">
              <Link href="/board" className="tavrn-button !bg-tavern-oak !text-tavern-parchment">
                Draw Again
              </Link>
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

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col gap-4">
        {/* Hero Ledger */}
        <div className="tavrn-panel p-4">
          <p className="tavrn-kicker mb-3">Hero Ledger</p>
          <p className="font-pixel text-[10px] text-tavern-gold">
            {isLoggedIn ? heroName : "Adventurer"}
          </p>

          {isLoggedIn ? (
            <div className="mt-3">
              {dataLoading
                ? <div className="h-2 bg-black/40 border border-tavern-oak animate-pulse" />
                : <XPBar xpTotal={profile?.xp_total ?? 0} showLabel />
              }
              {!dataLoading && streak && streak.current_streak > 0 && (
                <div className="mt-3">
                  <StreakDisplay
                    currentStreak={streak.current_streak}
                    longestStreak={streak.longest_streak}
                    size="sm"
                    showLongest={false}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-[12px] text-[#cfb88f] mt-2">Level up by finishing one quest tonight.</p>
              <div className="mt-4 h-2 bg-black/40 border border-tavern-oak">
                <div className="h-full bg-tavern-gold" style={{ width: "24%" }} />
              </div>
            </>
          )}
        </div>

        {/* In Progress */}
        <div className="tavrn-panel p-4">
          <p className="tavrn-kicker mb-3">In Progress</p>
          {dataLoading && isLoggedIn ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-3/4 bg-tavern-oak/60 rounded" />
              <div className="h-2 w-1/2 bg-tavern-oak/40 rounded" />
            </div>
          ) : activeQuest ? (
            <Link href={`/board/${activeQuest.id}`} className="block group">
              <p className="font-pixel text-[8px] text-tavern-parchment group-hover:text-tavern-gold transition-none leading-relaxed">
                {activeQuest.title}
              </p>
              <p className="text-[11px] text-[#bda780] mt-1">
                {activeQuest.type === "main" ? "main quest" : "side quest"} · +{activeQuest.xp_reward} XP
              </p>
            </Link>
          ) : isLoggedIn ? (
            <p className="text-[12px] text-[#bda780]">
              No active quests —{" "}
              <Link href="/board" className="underline hover:text-tavern-parchment transition-none">
                visit the board
              </Link>{" "}
              to accept one.
            </p>
          ) : (
            /* Guest placeholder */
            <div className="space-y-3">
              <p className="font-pixel text-[8px] text-tavern-parchment">Your saga awaits</p>
              <p className="text-[11px] text-[#bda780]">sign in to track your quests</p>
            </div>
          )}
        </div>

        {/* Quest Giver */}
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
