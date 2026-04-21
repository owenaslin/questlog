"use client";

import React, { useEffect, useMemo, useState } from "react";
import BadgeGrid from "@/components/BadgeGrid";
import { BADGES, getBadgesByRarity } from "@/lib/badges";
import { Badge, BadgeRarity } from "@/lib/types";
import { getUserEarnedBadgeIds, getUserBadgeProgress, UserBadgeProgress } from "@/lib/quest-progress";

type SortMode = "default" | "closest";

export default function BadgesPage() {
  const [filter, setFilter] = useState<BadgeRarity | "all">("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<UserBadgeProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      setIsLoading(true);
      const [ids, progress] = await Promise.all([
        getUserEarnedBadgeIds(),
        getUserBadgeProgress(),
      ]);
      setEarnedBadgeIds(ids);
      setBadgeProgress(progress);
      setIsLoading(false);
    };

    loadBadges();
  }, []);

  const earnedIdSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

  const filteredBadges = useMemo(() => {
    const base = filter === "all" ? BADGES : getBadgesByRarity(filter);
    if (sort !== "closest") return base;

    // Sort unearned badges by progress ratio descending; earned always last
    return [...base].sort((a, b) => {
      const aEarned = earnedIdSet.has(a.id);
      const bEarned = earnedIdSet.has(b.id);
      if (aEarned && bEarned) return 0;
      if (aEarned) return 1; // earned goes to bottom
      if (bEarned) return -1;
      const aRatio = getProgressRatio(a, badgeProgress);
      const bRatio = getProgressRatio(b, badgeProgress);
      return bRatio - aRatio;
    });
  }, [filter, sort, earnedIdSet, badgeProgress]);

  const earnedCount = earnedBadgeIds.length;
  const totalCount = BADGES.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const rarityCounts = useMemo(() => {
    return {
      common:    { total: getBadgesByRarity("common").length,    earned: getBadgesByRarity("common").filter((b)    => earnedIdSet.has(b.id)).length },
      rare:      { total: getBadgesByRarity("rare").length,      earned: getBadgesByRarity("rare").filter((b)      => earnedIdSet.has(b.id)).length },
      epic:      { total: getBadgesByRarity("epic").length,      earned: getBadgesByRarity("epic").filter((b)      => earnedIdSet.has(b.id)).length },
      legendary: { total: getBadgesByRarity("legendary").length, earned: getBadgesByRarity("legendary").filter((b) => earnedIdSet.has(b.id)).length },
    };
  }, [earnedIdSet]);

  const isEarned = selectedBadge ? earnedIdSet.has(selectedBadge.id) : false;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-pixel text-retro-yellow text-xl mb-2">
          🏅 Badge Collection
        </h1>
        <p className="font-pixel text-retro-lightgray text-[10px] max-w-2xl mx-auto leading-loose">
          Complete quests and earn badges! Collect them all to become a true Legend of the Board.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-retro-darkgray border-4 border-retro-black p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="font-pixel text-retro-lightgray text-xs">
            Collection Progress
          </span>
          <span className="font-pixel text-retro-cyan text-xs">
            {earnedCount} / {totalCount} Badges
          </span>
        </div>
        <div className="w-full h-4 bg-retro-black border-2 border-retro-darkgray mb-4">
          <div
            className="h-full bg-gradient-to-r from-retro-lime via-retro-cyan to-retro-yellow transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-retro-gray bg-opacity-30 p-2">
            <span className="font-pixel text-retro-gray text-[7px] block">Common</span>
            <span className="font-pixel text-retro-lightgray text-xs">{rarityCounts.common.earned}/{rarityCounts.common.total}</span>
          </div>
          <div className="bg-retro-blue bg-opacity-30 p-2">
            <span className="font-pixel text-retro-blue text-[7px] block">Rare</span>
            <span className="font-pixel text-retro-lightgray text-xs">{rarityCounts.rare.earned}/{rarityCounts.rare.total}</span>
          </div>
          <div className="bg-retro-purple bg-opacity-30 p-2">
            <span className="font-pixel text-retro-purple text-[7px] block">Epic</span>
            <span className="font-pixel text-retro-lightgray text-xs">{rarityCounts.epic.earned}/{rarityCounts.epic.total}</span>
          </div>
          <div className="bg-retro-yellow bg-opacity-30 p-2">
            <span className="font-pixel text-retro-yellow text-[7px] block">Legendary</span>
            <span className="font-pixel text-retro-lightgray text-xs">{rarityCounts.legendary.earned}/{rarityCounts.legendary.total}</span>
          </div>
        </div>
      </div>

      {/* Filters + Sort row */}
      <div className="flex flex-wrap items-center gap-2 justify-between mb-8">
        <div className="flex flex-wrap gap-2">
          {(["all", "common", "rare", "epic", "legendary"] as const).map((r) => {
            const labels: Record<string, string> = {
              all: `📜 All (${totalCount})`,
              common: `⚪ Common (${rarityCounts.common.total})`,
              rare: `🔵 Rare (${rarityCounts.rare.total})`,
              epic: `🟣 Epic (${rarityCounts.epic.total})`,
              legendary: `🟡 Legendary (${rarityCounts.legendary.total})`,
            };
            const activeClass =
              r === "common" ? "bg-retro-gray text-retro-white border-retro-darkgray" :
              r === "rare"   ? "bg-retro-blue text-retro-white border-retro-darkblue" :
              r === "epic"   ? "bg-retro-purple text-retro-white border-retro-darkpurple" :
              r === "legendary" ? "bg-gradient-to-r from-retro-yellow to-retro-orange text-retro-black border-retro-yellow" :
              "bg-retro-darkpurple text-retro-yellow border-retro-yellow";
            return (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`font-pixel text-[10px] px-4 py-2 border-b-4 transition-none ${
                  filter === r ? activeClass : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        {/* Sort toggle */}
        <button
          onClick={() => setSort((s) => s === "closest" ? "default" : "closest")}
          className={`font-pixel text-[9px] px-3 py-2 border-2 transition-none ${
            sort === "closest"
              ? "border-retro-cyan text-retro-cyan bg-retro-black"
              : "border-retro-darkgray text-retro-gray bg-retro-darkgray hover:border-retro-gray"
          }`}
          title="Sort unearned badges by how close you are to unlocking them"
        >
          {sort === "closest" ? "✓ Closest first" : "▲ Sort: Closest"}
        </button>
      </div>

      {/* Badge Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="font-pixel text-retro-lightgray text-[8px]">Loading badges...</p>
        </div>
      ) : (
        <BadgeGrid
          badges={filteredBadges}
          earnedBadgeIds={earnedBadgeIds}
          onBadgeClick={(badge) => setSelectedBadge(badge)}
          columns={2}
        />
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-retro-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-retro-darkgray border-4 border-retro-black shadow-pixel-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-4xl ${isEarned ? "" : "opacity-40 grayscale"}`}>{selectedBadge.icon}</span>
                <div>
                  <h3 className="font-pixel text-retro-yellow text-sm">
                    {selectedBadge.name}
                  </h3>
                  <span
                    className={`
                      font-pixel text-[8px] px-2 py-0.5 uppercase
                      ${selectedBadge.rarity === "common" && "bg-retro-gray text-retro-white"}
                      ${selectedBadge.rarity === "rare" && "bg-retro-blue text-retro-white"}
                      ${selectedBadge.rarity === "epic" && "bg-retro-purple text-retro-white"}
                      ${selectedBadge.rarity === "legendary" && "bg-retro-yellow text-retro-black"}
                    `}
                  >
                    {selectedBadge.rarity}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBadge(null)}
                className="font-pixel text-retro-gray hover:text-retro-white text-lg"
              >
                ×
              </button>
            </div>

            <p className="font-pixel text-retro-lightgray text-[10px] leading-relaxed mb-4">
              {selectedBadge.description}
            </p>

            <div className="bg-retro-black p-3 mb-4">
              <span className="font-pixel text-retro-gray text-[8px] block mb-1">
                Requirement
              </span>
              <p className="font-pixel text-retro-cyan text-[9px]">
                {getRequirementText(selectedBadge)}
              </p>
            </div>

            {/* Progress indicator for unearned badges */}
            {!isEarned && badgeProgress && (
              <BadgeProgressBar badge={selectedBadge} progress={badgeProgress} />
            )}

            {isEarned && (
              <div className="bg-retro-black border-2 border-retro-lime p-2 mb-4">
                <p className="font-pixel text-retro-lime text-[8px] text-center">✓ Earned!</p>
              </div>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full font-pixel text-[10px] bg-retro-darkgray text-retro-lightgray py-2 border-2 border-retro-gray hover:bg-retro-gray"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getRequirementText(badge: Badge): string {
  switch (badge.requirement_type) {
    case "total_quests":
      return `Complete ${badge.requirement_value} quests`;
    case "category_count":
      return `Complete ${badge.requirement_value} ${badge.requirement_category || ""} quests`;
    case "main_quests":
      return `Complete ${badge.requirement_value} main quest${badge.requirement_value > 1 ? "s" : ""}`;
    case "questlines_completed":
      return `Complete ${badge.requirement_value} questline${badge.requirement_value > 1 ? "s" : ""}`;
    case "level_reached":
      return `Reach Level ${badge.requirement_value}`;
    case "unique_categories":
      return `Complete quests in ${badge.requirement_value} different categories`;
    case "side_quests":
      return `Complete ${badge.requirement_value} side quest${badge.requirement_value > 1 ? "s" : ""}`;
    case "streak_days":
      return `Maintain a ${badge.requirement_value}-day quest streak`;
    default:
      return "Complete special requirements";
  }
}

/** Returns a 0–1 ratio of the user's progress toward a given badge. */
function getProgressRatio(badge: Badge, progress: UserBadgeProgress | null): number {
  if (!progress) return 0;
  const val = badge.requirement_value || 1;
  switch (badge.requirement_type) {
    case "total_quests":
      return Math.min(progress.totalCompleted / val, 1);
    case "category_count": {
      const cat = badge.requirement_category ?? "";
      const done = progress.completedByCategory[cat] ?? 0;
      return Math.min(done / val, 1);
    }
    case "main_quests":
      return Math.min(progress.completedMain / val, 1);
    case "side_quests":
      return Math.min(progress.completedSide / val, 1);
    case "level_reached":
      return Math.min(progress.level / val, 1);
    case "streak_days":
      return Math.min(progress.longestStreak / val, 1);
    case "unique_categories": {
      const uniqueCats = Object.keys(progress.completedByCategory).length;
      return Math.min(uniqueCats / val, 1);
    }
    default:
      return 0;
  }
}

function getUserProgressValue(badge: Badge, progress: UserBadgeProgress): { current: number; total: number; label: string } {
  const total = badge.requirement_value;
  switch (badge.requirement_type) {
    case "total_quests":
      return { current: progress.totalCompleted, total, label: "quests completed" };
    case "category_count": {
      const cat = badge.requirement_category ?? "";
      return { current: progress.completedByCategory[cat] ?? 0, total, label: `${cat} quests` };
    }
    case "main_quests":
      return { current: progress.completedMain, total, label: "main quests" };
    case "side_quests":
      return { current: progress.completedSide, total, label: "side quests" };
    case "level_reached":
      return { current: progress.level, total, label: "level" };
    case "streak_days":
      return { current: progress.longestStreak, total, label: "day streak (best)" };
    case "unique_categories": {
      const uniqueCats = Object.keys(progress.completedByCategory).length;
      return { current: uniqueCats, total, label: "categories explored" };
    }
    default:
      return { current: 0, total, label: "progress" };
  }
}

function BadgeProgressBar({ badge, progress }: { badge: Badge; progress: UserBadgeProgress }) {
  const { current, total, label } = getUserProgressValue(badge, progress);
  const pct = Math.min((current / total) * 100, 100);

  return (
    <div className="bg-retro-black p-3 mb-4">
      <div className="flex justify-between mb-1">
        <span className="font-pixel text-retro-gray text-[7px] uppercase">Your Progress</span>
        <span className="font-pixel text-retro-cyan text-[7px]">{current} / {total} {label}</span>
      </div>
      <div className="w-full h-3 bg-retro-darkgray border border-retro-gray">
        <div
          className="h-full bg-retro-cyan transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
