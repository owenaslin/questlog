"use client";

import React from "react";
import { xpForNextLevel, calculateLevel } from "@/lib/types";

interface XPBarProps {
  xpTotal: number;
  showLabel?: boolean;
}

export default function XPBar({ xpTotal, showLabel = true }: XPBarProps) {
  const level = calculateLevel(xpTotal);
  const { current, needed } = xpForNextLevel(xpTotal);
  const percentage = Math.min((current / needed) * 100, 100);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="font-pixel text-retro-yellow text-[10px]">
            LVL {level}
          </span>
          <span className="font-pixel text-retro-lightgray text-[8px]">
            {current}/{needed} XP
          </span>
        </div>
      )}
      <div className="w-full h-4 bg-retro-darkgray border-2 border-retro-black">
        <div
          className="h-full bg-retro-lime transition-none"
          style={{ width: `${percentage}%` }}
        >
          <div className="h-full w-full bg-gradient-to-b from-retro-lime to-retro-green" />
        </div>
      </div>
    </div>
  );
}
