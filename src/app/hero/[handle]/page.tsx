"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import HeroPortrait from "@/components/HeroPortrait";
import { BadgeShowcase } from "@/components/BadgeGrid";
import XPBar from "@/components/XPBar";
import DesktopRightRail from "@/components/DesktopRightRail";
import AmbientScene from "@/components/AmbientScene";
import { useViewMode } from "@/components/ViewModeProvider";
import { BADGES } from "@/lib/badges";
import { AVATAR_PORTRAITS, AvatarKey, HeroProfile, PinnedQuest, deriveTitle } from "@/lib/types";
import {
  getHeroByHandle,
  getHeroDashboard,
} from "@/lib/hero";
import { getSupabaseClient } from "@/lib/supabase";

export default function HeroPage() {
  const params = useParams();
  const handle = typeof params?.handle === "string" ? params.handle : "";
  const { isDesktopActive } = useViewMode();

  const [hero, setHero]                 = useState<HeroProfile | null>(null);
  const [notFound, setNotFound]         = useState(false);
  const [isLoading, setIsLoading]       = useState(true);
  const [pinnedQuests, setPinnedQuests] = useState<PinnedQuest[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [longestStreak, setLongestStreak]   = useState(0);
  const [isOwner, setIsOwner]           = useState(false);

  useEffect(() => {
    if (!handle) return;
    let alive = true;

    const load = async () => {
      setIsLoading(true);

      const heroData = await getHeroByHandle(handle);
      if (!alive) return;

      if (!heroData) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setHero(heroData);

      // Check if viewer is the owner
      const supabase = getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id === heroData.id) setIsOwner(true);

      // Load all dashboard data in single RPC call
      const dashboard = await getHeroDashboard(heroData.id);

      if (!alive) return;
      setPinnedQuests(dashboard.pinnedQuests);
      setEarnedBadgeIds(dashboard.badgeIds);
      setCompletedCount(dashboard.completedCount);
      setLongestStreak(dashboard.longestStreak);
      setIsLoading(false);
    };

    load();
    return () => { alive = false; };
  }, [handle]);

  const handleShare = () => {
    const url = `https://tarvn.xyz/hero/${handle}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `${hero?.display_name ?? handle}'s Hero Page`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  };

  /* ── 404 ─────────────────────────────────────────────────────── */
  if (!isLoading && notFound) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-5xl mb-4">🏚</div>
        <h1 className="font-pixel text-tavern-gold text-sm mb-3">Hero Not Found</h1>
        <p className="font-pixel text-tavern-smoke-light text-[8px] leading-loose mb-6">
          No adventurer answers to &ldquo;{handle}&rdquo;.<br />
          They may have set their page to private.
        </p>
        <Link href="/board">
          <span className="font-pixel text-tavern-gold text-[9px] hover:text-tavern-candle underline">
            ⚔ Return to The Board
          </span>
        </Link>
      </div>
    );
  }

  /* ── Loading skeleton ─────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="tavern-card p-6 flex gap-5 items-center">
          <div className="w-24 h-24 bg-tavern-smoke" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-40 bg-tavern-smoke" />
            <div className="h-3 w-28 bg-tavern-smoke" />
            <div className="h-2 w-full bg-tavern-smoke" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="tavern-card h-20" />)}
        </div>
      </div>
    );
  }

  if (!hero) return null;

  const portrait = AVATAR_PORTRAITS[hero.avatar_sprite as AvatarKey] ?? AVATAR_PORTRAITS.wizard;
  const displayTitle = hero.title ?? deriveTitle(null, hero.level);

  return (
    <div className={isDesktopActive ? "max-w-6xl mx-auto" : "max-w-2xl mx-auto"}>
      <AmbientScene scene="hall-of-fame" />
      <div className={isDesktopActive ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_288px] gap-6" : ""}>
      <div>

      {/* ── Character sheet header ─────────────────────────────── */}
      <div className="tavern-card p-6 mb-6 relative">
        {/* Owner controls */}
        {isOwner && (
          <div className="absolute top-4 right-4 flex gap-2">
            <Link
              href="/hero/edit"
              className="font-pixel text-[7px] px-2 py-1 border border-tavern-oak text-tavern-parchment hover:border-tavern-gold"
            >
              ✏ Edit Hero
            </Link>
          </div>
        )}

        <div className="flex items-start gap-5">
          {/* Portrait */}
          <HeroPortrait spriteKey={hero.avatar_sprite} size="xl" />

          <div className="flex-1 min-w-0">
            {/* Name + title */}
            <h1 className="font-pixel text-tavern-gold text-sm leading-relaxed mb-0.5">
              {hero.display_name}
            </h1>
            <p className="font-pixel text-tavern-parchment text-[8px] mb-3 opacity-80">
              {displayTitle}
            </p>

            {/* Level + XP */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-pixel text-tavern-gold text-[10px]">
                Level {hero.level}
              </span>
              <span className="font-pixel text-tavern-smoke-light text-[7px]">
                {hero.xp_total} XP
              </span>
            </div>
            <XPBar xpTotal={hero.xp_total} showLabel={false} />

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="font-pixel text-[7px] mt-3 px-3 py-1.5 border border-tavern-oak text-tavern-parchment hover:border-tavern-gold"
            >
              🔗 Share Hero
            </button>
          </div>
        </div>

        {/* Handle pill */}
        <div className="mt-4 flex items-center gap-2">
          <Image src="/tavern/scroll.svg" alt="" width={16} height={14} />
          <span className="font-pixel text-tavern-smoke-light text-[7px]">
            tarvn.xyz/hero/{handle}
          </span>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { value: hero.xp_total, label: "Total XP",     color: "text-tavern-gold",  icon: "⭐" },
          { value: completedCount, label: "Quests Done", color: "text-retro-lime",   icon: "✓" },
          { value: longestStreak,  label: "Best Streak", color: "text-tavern-ember", icon: "🔥" },
        ].map(({ value, label, color, icon }) => (
          <div key={label} className="tavern-card p-4 text-center">
            <div className="text-lg mb-1">{icon}</div>
            <div className={`font-pixel text-xl ${color}`}>{value}</div>
            <div className="font-pixel text-tavern-smoke-light text-[7px] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Pinned Triumphs ─────────────────────────────────────── */}
      {pinnedQuests.length > 0 && (
        <div className="mb-6">
          <h2 className="font-pixel text-tavern-gold text-[11px] mb-3 flex items-center gap-2">
            <Image src="/tavern/board.svg" alt="" width={18} height={16} />
            Pinned Triumphs
          </h2>
          <div className="flex flex-col gap-2">
            {pinnedQuests.map((pq) => (
              <div
                key={pq.id}
                className="flex items-center justify-between px-4 py-3"
                style={{ border: "2px solid #5c3a1a", background: "#1f1608" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-pixel text-tavern-gold text-[10px]">📌</span>
                  <span className="font-pixel text-tavern-parchment text-[8px] truncate">
                    {pq.quest_title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-pixel text-[6px] px-1.5 py-0.5 ${
                    pq.quest_type === "main"
                      ? "bg-tavern-ember text-retro-white"
                      : "bg-retro-blue text-retro-white"
                  }`}>
                    {pq.quest_type === "main" ? "Main" : "Side"}
                  </span>
                  <span className="font-pixel text-tavern-gold text-[7px]">
                    +{pq.quest_xp_reward} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trophy wall ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-tavern-gold text-[11px] flex items-center gap-2">
            🏅 Trophy Wall
          </h2>
          <span className="font-pixel text-tavern-smoke-light text-[7px]">
            {earnedBadgeIds.length} / {BADGES.length} earned
          </span>
        </div>

        {earnedBadgeIds.length === 0 ? (
          <div className="parchment-card p-4 text-center">
            <p className="font-pixel text-tavern-parchment text-[8px]">
              No trophies yet — the board awaits this adventurer.
            </p>
          </div>
        ) : (
          <div className="tavern-card p-4">
            <BadgeShowcase
              badges={BADGES}
              earnedBadgeIds={earnedBadgeIds}
              maxDisplay={8}
              onSeeAll={() => {}}
            />
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4">
        <Link href="/board" className="font-pixel text-tavern-gold text-[7px] hover:text-tavern-candle">
          ← Back to the Tavern
        </Link>
        <p className="font-pixel text-tavern-smoke-light text-[7px]">
          🍺 tarvn.xyz
        </p>
      </div>
      </div>

      <DesktopRightRail title="Hero Ledger">
        <div className="bg-retro-black border-2 border-retro-darkgray p-3">
          <p className="font-pixel text-retro-gray text-[7px] uppercase mb-2">Legend Summary</p>
          <p className="font-pixel text-tavern-gold text-[7px] mb-1">Level: {hero.level}</p>
          <p className="font-pixel text-retro-cyan text-[7px] mb-1">XP: {hero.xp_total}</p>
          <p className="font-pixel text-retro-lime text-[7px] mb-1">Completed: {completedCount}</p>
          <p className="font-pixel text-tavern-ember text-[7px]">Best Streak: {longestStreak}</p>
        </div>
        <div className="bg-retro-black border-2 border-retro-darkgray p-3">
          <p className="font-pixel text-retro-gray text-[7px] uppercase mb-2">Quick Actions</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="text-left font-pixel text-[7px] text-tavern-gold hover:text-tavern-candle"
            >
              🔗 Share Hero Link
            </button>
            {isOwner && (
              <Link href="/hero/edit" className="font-pixel text-[7px] text-retro-lightblue hover:text-retro-white">
                ✏ Edit Hero
              </Link>
            )}
            <Link href="/board" className="font-pixel text-[7px] text-retro-lime hover:text-retro-white">
              ⚔ Visit Board
            </Link>
          </div>
        </div>
      </DesktopRightRail>
      </div>
    </div>
  );
}
