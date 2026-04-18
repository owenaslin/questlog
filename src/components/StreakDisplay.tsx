"use client";

import React from "react";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  size?: "sm" | "md" | "lg";
  showLongest?: boolean;
}

export default function StreakDisplay({
  currentStreak,
  longestStreak,
  size = "md",
  showLongest = true,
}: StreakDisplayProps) {
  const sizeClasses = {
    sm: {
      container: "px-2 py-1 gap-1",
      icon: "text-sm",
      number: "text-sm",
      label: "text-[6px]",
    },
    md: {
      container: "px-3 py-2 gap-2",
      icon: "text-lg",
      number: "text-base",
      label: "text-[8px]",
    },
    lg: {
      container: "px-4 py-3 gap-3",
      icon: "text-2xl",
      number: "text-lg",
      label: "text-[9px]",
    },
  };

  const isActive = currentStreak > 0;
  const isRecord = currentStreak >= longestStreak && currentStreak > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Current Streak */}
      <div
        className={`
          flex items-center gap-2 rounded border-2
          ${sizeClasses[size].container}
          ${isActive
            ? "bg-retro-orange border-retro-yellow text-retro-white"
            : "bg-retro-darkgray border-retro-gray text-retro-lightgray"
          }
          ${isRecord ? "animate-pulse" : ""}
        `}
      >
        <span className={sizeClasses[size].icon}>🔥</span>
        <div className="flex flex-col items-start">
          <span className={`font-pixel ${sizeClasses[size].number} leading-none`}>
            {currentStreak}
          </span>
          <span className={`font-pixel ${sizeClasses[size].label} uppercase`}>
            Day{currentStreak !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Longest Streak */}
      {showLongest && (
        <div
          className={`
            flex items-center gap-2 rounded border-2
            ${sizeClasses[size].container}
            bg-retro-darkpurple border-retro-purple text-retro-lightgray
          `}
        >
          <span className={sizeClasses[size].icon}>🏆</span>
          <div className="flex flex-col items-start">
            <span className={`font-pixel ${sizeClasses[size].number} leading-none`}>
              {longestStreak}
            </span>
            <span className={`font-pixel ${sizeClasses[size].label} uppercase`}>
              Best
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
