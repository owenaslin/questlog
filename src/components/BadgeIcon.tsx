"use client";

import React from "react";
import { Badge } from "@/lib/types";
import { BADGE_RARITY_COLORS, BADGE_RARITY_LABELS } from "@/lib/badges";

interface BadgeIconProps {
  badge: Badge;
  size?: "sm" | "md" | "lg" | "xl";
  showRarity?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
}

const sizeStyles = {
  sm: { container: "w-12 h-12", icon: "text-xl", label: "mobile-label" },
  md: { container: "w-16 h-16", icon: "text-2xl", label: "mobile-label" },
  lg: { container: "w-20 h-20", icon: "text-3xl", label: "mobile-caption" },
  xl: { container: "w-24 h-24", icon: "text-4xl", label: "mobile-caption" },
};

export default function BadgeIcon({
  badge,
  size = "md",
  showRarity = true,
  isLocked = false,
  onClick,
}: BadgeIconProps) {
  const colors = BADGE_RARITY_COLORS[badge.rarity];
  const styles = sizeStyles[size];

  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-1
        ${onClick ? "cursor-pointer" : ""}
      `}
    >
      {/* Badge Container */}
      <div
        className={`
          ${styles.container}
          ${colors.bg}
          border-4 ${colors.border}
          ${colors.glow}
          flex items-center justify-center
          transition-all duration-200
          ${isLocked ? "opacity-40 grayscale" : "hover:scale-105"}
          ${onClick && !isLocked ? "active:scale-95" : ""}
        `}
      >
        {/* Icon */}
        <span className={`${styles.icon} ${isLocked ? "blur-[2px]" : ""}`}>
          {isLocked ? "🔒" : badge.icon}
        </span>

        {/* Rarity indicator (small dot in corner) */}
        {showRarity && !isLocked && (
          <div
            className={`
              absolute -top-1 -right-1 w-4 h-4 
              ${colors.bg} ${colors.border}
              border-2 rounded-full
              flex items-center justify-center
            `}
          >
            <span className={`${styles.label} ${colors.text} font-pixel`}>
              {badge.rarity === "legendary" ? "L" : badge.rarity === "epic" ? "E" : badge.rarity === "rare" ? "R" : "C"}
            </span>
          </div>
        )}
      </div>

      {/* Badge Name (only on larger sizes) */}
      {(size === "lg" || size === "xl") && (
        <span className="mobile-caption text-retro-lightgray text-center max-w-[80px] leading-tight">
          {isLocked ? "???" : badge.name}
        </span>
      )}
    </div>
  );
}

// Badge rarity badge component
export function BadgeRarityBadge({ rarity }: { rarity: Badge["rarity"] }) {
  const colors = BADGE_RARITY_COLORS[rarity];
  const label = BADGE_RARITY_LABELS[rarity];

  return (
    <span
      className={`
        mobile-caption px-2 py-1 uppercase tracking-wider
        ${colors.bg} ${colors.text}
        border-2 ${colors.border}
      `}
    >
      {label}
    </span>
  );
}
