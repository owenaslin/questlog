"use client";

import React, { useEffect, useMemo, useState } from "react";
import BadgeGrid from "@/components/BadgeGrid";
import { BADGES, getBadgesByRarity } from "@/lib/badges";
import { Badge, BadgeRarity } from "@/lib/types";
import { getUserEarnedBadgeIds } from "@/lib/quest-progress";

export default function BadgesPage() {
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

  const filteredBadges = useMemo(() => {
    if (filter === "all") return BADGES;
    return getBadgesByRarity(filter);
  }, [filter]);

  const earnedCount = earnedBadgeIds.length;
  const totalCount = BADGES.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const rarityCounts = useMemo(() => {
    const earnedIdSet = new Set(earnedBadgeIds);
    return {
      common: {
        total: getBadgesByRarity("common").length,
        earned: getBadgesByRarity("common").filter((b) => earnedIdSet.has(b.id)).length,
      },
      rare: {
        total: getBadgesByRarity("rare").length,
        earned: getBadgesByRarity("rare").filter((b) => earnedIdSet.has(b.id)).length,
      },
      epic: {
        total: getBadgesByRarity("epic").length,
        earned: getBadgesByRarity("epic").filter((b) => earnedIdSet.has(b.id)).length,
      },
      legendary: {
        total: getBadgesByRarity("legendary").length,
        earned: getBadgesByRarity("legendary").filter((b) => earnedIdSet.has(b.id)).length,
      },
    };
  }, [earnedBadgeIds]);

  return (
    <div className="tavrn-panel p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="tavrn-wordmark text-4xl leading-none mb-2">
          🏅 Badge Collection
        </h1>
        <p className="font-pixel text-retro-lightgray text-[10px] max-w-2xl mx-auto leading-loose">
          Complete quests and earn badges! Collect them all to become a true Legend of the Board.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="tavern-card p-6 mb-8">
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

      {/* Rarity Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
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
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
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
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
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
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
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
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
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
            className="tavern-card shadow-pixel-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedBadge.icon}</span>
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
    default:
      return "Complete special requirements";
  }
}
