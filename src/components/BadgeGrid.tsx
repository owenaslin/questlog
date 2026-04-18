"use client";

import React from "react";
import { Badge } from "@/lib/types";
import { rarityBgClasses } from "@/lib/badge-utils";
import BadgeCard from "./BadgeCard";

interface BadgeGridProps {
  badges: Badge[];
  earnedBadgeIds?: string[];
  newBadgeIds?: string[];
  onBadgeClick?: (badge: Badge) => void;
  columns?: 1 | 2 | 3 | 4;
}

export default function BadgeGrid({
  badges,
  earnedBadgeIds = [],
  newBadgeIds = [],
  onBadgeClick,
  columns = 2,
}: BadgeGridProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={`grid ${colClass} gap-4`}>
      {badges.map((badge) => {
        const isLocked = !earnedBadgeIds.includes(badge.id);
        const isNew = newBadgeIds.includes(badge.id);

        return (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isLocked={isLocked}
            isNew={isNew}
            onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined}
          />
        );
      })}
    </div>
  );
}

// Compact badge showcase (for profile)
interface BadgeShowcaseProps {
  badges: Badge[];
  earnedBadgeIds: string[];
  maxDisplay?: number;
  onSeeAll?: () => void;
}

export function BadgeShowcase({
  badges,
  earnedBadgeIds,
  maxDisplay = 6,
  onSeeAll,
}: BadgeShowcaseProps) {
  const earnedBadges = badges.filter((b) => earnedBadgeIds.includes(b.id));
  const displayBadges = earnedBadges.slice(0, maxDisplay);
  const remaining = earnedBadges.length - maxDisplay;

  if (earnedBadges.length === 0) {
    return (
      <div className="bg-retro-darkgray border-4 border-retro-black p-6 text-center">
        <div className="text-3xl mb-2">🏅</div>
        <p className="font-pixel text-retro-lightgray text-[10px]">
          No badges yet. Complete quests to earn your first badge!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-retro-darkgray border-4 border-retro-black p-4">
      <div className="flex flex-wrap justify-center gap-4">
        {displayBadges.map((badge) => (
          <div key={badge.id} className="flex flex-col items-center gap-1">
            <div
              className={`
                w-14 h-14 flex items-center justify-center text-2xl
                ${rarityBgClasses[badge.rarity]}
                border-4 border-retro-black
                shadow-pixel
              `}
            >
              {badge.icon}
            </div>
            <span className="font-pixel text-retro-lightgray text-[7px] text-center max-w-[60px]">
              {badge.name}
            </span>
          </div>
        ))}
        
        {remaining > 0 && (
          <button
            onClick={onSeeAll}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 flex items-center justify-center bg-retro-gray border-4 border-retro-black shadow-pixel group-hover:bg-retro-darkgray transition-colors">
              <span className="font-pixel text-retro-lightgray text-lg">+{remaining}</span>
            </div>
            <span className="font-pixel text-retro-cyan text-[7px]">See All</span>
          </button>
        )}
      </div>
    </div>
  );
}
