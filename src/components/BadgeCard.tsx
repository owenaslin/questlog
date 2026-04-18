"use client";

import React from "react";
import { Badge } from "@/lib/types";
import { getRequirementHint } from "@/lib/badge-utils";
import BadgeIcon from "./BadgeIcon";
import { BadgeRarityBadge } from "./BadgeIcon";

interface BadgeCardProps {
  badge: Badge;
  isLocked?: boolean;
  isNew?: boolean;
  onClick?: () => void;
}

export default function BadgeCard({
  badge,
  isLocked = false,
  isNew = false,
  onClick,
}: BadgeCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-retro-darkgray border-4 
        ${isLocked ? "border-retro-gray opacity-70" : "border-retro-black shadow-pixel"}
        p-4 flex items-center gap-4
        transition-all duration-200
        ${onClick ? "cursor-pointer hover:-translate-x-[2px] hover:-translate-y-[2px]" : ""}
        ${onClick && !isLocked ? "hover:shadow-pixel-lg" : ""}
        relative
      `}
    >
      {/* New indicator */}
      {isNew && (
        <div className="absolute -top-2 -left-2 bg-retro-yellow text-retro-black font-pixel text-[8px] px-2 py-1 border-2 border-retro-black">
          NEW!
        </div>
      )}

      {/* Badge Icon */}
      <BadgeIcon badge={badge} size="md" showRarity={false} isLocked={isLocked} />

      {/* Badge Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-pixel text-retro-yellow text-xs truncate">
            {isLocked ? "Locked Badge" : badge.name}
          </h3>
          {!isLocked && <BadgeRarityBadge rarity={badge.rarity} />}
        </div>
        
        <p className="font-pixel text-retro-lightgray text-[8px] leading-relaxed line-clamp-2">
          {isLocked ? "Complete the required challenge to unlock this badge." : badge.description}
        </p>

        {/* Requirement hint for locked badges */}
        {isLocked && (
          <p className="font-pixel text-retro-gray text-[7px] mt-2 italic">
            Hint: {getRequirementHint(badge)}
          </p>
        )}

        {/* Earned date */}
        {!isLocked && badge.earned_at && (
          <p className="font-pixel text-retro-gray text-[7px] mt-2">
            Earned {new Date(badge.earned_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
