"use client";

import React, { useEffect, useMemo, useState } from "react";
import BadgeGrid from "@/components/badge/BadgeGrid";
import { BADGES, getBadgesByRarity } from "@/lib/badges";
import { Badge, BadgeRarity } from "@/lib/types";
import { getUserEarnedBadgeIds } from "@/lib/quest-progress";
import { getRequirementHint } from "@/lib/badges";

export default function TrophiesPage() {
  const [filter, setFilter] = useState<BadgeRarity | "all">("all");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      setIsLoading(true);
      const ids = await getUserEarnedBadgeIds();
      setEarnedBadgeIds(ids);
      setIsLoading(false);
    };

    loadBadges();
  }, []);

  const earnedIdSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

  const filteredBadges = useMemo(() => {
    const badges = filter === "all" ? BADGES : getBadgesByRarity(filter);
    return [...badges].sort((a, b) => {
      const aEarned = earnedIdSet.has(a.id) ? 0 : 1;
      const bEarned = earnedIdSet.has(b.id) ? 0 : 1;
      return aEarned - bEarned;
    });
  }, [filter, earnedIdSet]);

  const earnedCount = earnedBadgeIds.length;
  const totalCount = BADGES.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const rarityCounts = useMemo(() => {
    const byRarity = {
      common: getBadgesByRarity("common"),
      rare: getBadgesByRarity("rare"),
      epic: getBadgesByRarity("epic"),
      legendary: getBadgesByRarity("legendary"),
    } as const;
    return {
      common: { total: byRarity.common.length, earned: byRarity.common.filter((b) => earnedIdSet.has(b.id)).length },
      rare: { total: byRarity.rare.length, earned: byRarity.rare.filter((b) => earnedIdSet.has(b.id)).length },
      epic: { total: byRarity.epic.length, earned: byRarity.epic.filter((b) => earnedIdSet.has(b.id)).length },
      legendary: { total: byRarity.legendary.length, earned: byRarity.legendary.filter((b) => earnedIdSet.has(b.id)).length },
    };
  }, [earnedBadgeIds]);

  return (
    <div className="tavrn-panel p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="tavrn-wordmark text-4xl leading-none mb-2">
          🏅 Badge Collection
        </h1>
        <p className="text-body text-retro-lightgray max-w-2xl mx-auto leading-relaxed">
          Complete quests and earn badges! Collect them all to become a true Legend of the Board.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="tavern-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-body-sm text-retro-lightgray">Collection Progress</span>
          <span className="text-body-sm text-retro-cyan">{earnedCount} / {totalCount} Badges</span>
        </div>
        <div className="w-full h-4 bg-retro-black border-2 border-retro-darkgray mb-4">
          <div
            className="h-full bg-gradient-to-r from-retro-lime via-retro-cyan to-retro-yellow transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-retro-gray bg-opacity-30 p-2 overflow-hidden min-w-0">
            <span className="kicker block mb-0.5 truncate">Common</span>
            <span className="text-body-sm text-retro-lightgray">{rarityCounts.common.earned}/{rarityCounts.common.total}</span>
          </div>
          <div className="bg-retro-blue bg-opacity-30 p-2 overflow-hidden min-w-0">
            <span className="kicker text-retro-blue block mb-0.5 truncate">Rare</span>
            <span className="text-body-sm text-retro-lightgray">{rarityCounts.rare.earned}/{rarityCounts.rare.total}</span>
          </div>
          <div className="bg-retro-purple bg-opacity-30 p-2 overflow-hidden min-w-0">
            <span className="kicker text-retro-purple block mb-0.5 truncate">Epic</span>
            <span className="text-body-sm text-retro-lightgray">{rarityCounts.epic.earned}/{rarityCounts.epic.total}</span>
          </div>
          <div className="bg-retro-yellow bg-opacity-30 p-2 overflow-hidden min-w-0">
            <span className="kicker text-retro-yellow block mb-0.5 truncate">Legendary</span>
            <span className="text-body-sm text-retro-lightgray">{rarityCounts.legendary.earned}/{rarityCounts.legendary.total}</span>
          </div>
        </div>
      </div>

      {/* Rarity Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`
            text-body-sm font-medium px-4 py-2 min-h-[40px] border-b-4 transition-none
            ${filter === "all"
              ? "bg-retro-darkpurple text-retro-yellow border-retro-yellow"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          📜 All ({totalCount})
        </button>
        <button
          onClick={() => setFilter("common")}
          className={`
            text-body-sm font-medium px-4 py-2 min-h-[40px] border-b-4 transition-none
            ${filter === "common"
              ? "bg-retro-gray text-retro-white border-retro-darkgray"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          ⚪ Common ({rarityCounts.common.total})
        </button>
        <button
          onClick={() => setFilter("rare")}
          className={`
            text-body-sm font-medium px-4 py-2 min-h-[40px] border-b-4 transition-none
            ${filter === "rare"
              ? "bg-retro-blue text-retro-white border-retro-darkblue"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          🔵 Rare ({rarityCounts.rare.total})
        </button>
        <button
          onClick={() => setFilter("epic")}
          className={`
            text-body-sm font-medium px-4 py-2 min-h-[40px] border-b-4 transition-none
            ${filter === "epic"
              ? "bg-retro-purple text-retro-white border-retro-darkpurple"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          🟣 Epic ({rarityCounts.epic.total})
        </button>
        <button
          onClick={() => setFilter("legendary")}
          className={`
            text-body-sm font-medium px-4 py-2 min-h-[40px] border-b-4 transition-none
            ${filter === "legendary"
              ? "bg-gradient-to-r from-retro-yellow to-retro-orange text-retro-black border-retro-yellow"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          🟡 Legendary ({rarityCounts.legendary.total})
        </button>
      </div>

      {/* Badge Grid */}
      <BadgeGrid
        badges={filteredBadges}
        earnedBadgeIds={earnedBadgeIds}
        onBadgeClick={(badge) => setSelectedBadge(badge)}
        columns={2}
      />

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-retro-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="tavern-card shadow-pixel-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedBadge.icon}</span>
                <div>
                  <h3 className="text-subhead text-retro-yellow">
                    {selectedBadge.name}
                  </h3>
                  <span
                    className={`
                      badge
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
                className="text-retro-gray hover:text-retro-white text-xl leading-none p-1"
              >
                ×
              </button>
            </div>

            <p className="text-body text-retro-lightgray leading-relaxed mb-4">
              {selectedBadge.description}
            </p>

            <div className="bg-retro-black p-3 mb-4">
              <span className="kicker block mb-1">Requirement</span>
              <p className="text-body-sm text-retro-cyan">
                {getRequirementHint(selectedBadge)}
              </p>
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full text-body-sm bg-retro-darkgray text-retro-lightgray py-2 min-h-[40px] border-2 border-retro-gray hover:bg-retro-gray"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

