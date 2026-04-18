"use client";

import React from "react";
import { WeeklyRecap as WeeklyRecapType } from "@/lib/quest-progress";

interface WeeklyRecapProps {
  recap: WeeklyRecapType | null;
  isLoading?: boolean;
}

export default function WeeklyRecap({ recap, isLoading }: WeeklyRecapProps) {
  if (isLoading) {
    return (
      <div className="bg-retro-darkgray border-4 border-retro-black p-4">
        <p className="font-pixel text-retro-lightgray text-[8px]">Loading weekly recap...</p>
      </div>
    );
  }

  const hasActivity = recap && (recap.quests_completed > 0 || recap.xp_earned > 0);

  // Format week label
  const getWeekLabel = (weekStart: string) => {
    const start = new Date(weekStart);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return "This Week";
    if (diffDays < 14) return "Last Week";
    return `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  return (
    <div className="bg-retro-darkgray border-4 border-retro-black p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-pixel text-retro-cyan text-xs">
          📊 {recap ? getWeekLabel(recap.week_start) : "Weekly Recap"}
        </h3>
        {hasActivity && (
          <span className="font-pixel text-retro-green text-[8px]">✓ Active</span>
        )}
      </div>

      {!hasActivity ? (
        <div className="text-center py-4">
          <p className="font-pixel text-retro-gray text-[8px]">
            No quests completed this week yet.
          </p>
          <p className="font-pixel text-retro-lightgray text-[7px] mt-2">
            Complete one today to start your week strong!
          </p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-retro-black p-3 text-center">
              <span className="font-pixel text-retro-gray text-[7px] block mb-1">
                Quests Done
              </span>
              <span className="font-pixel text-retro-yellow text-lg">
                {recap.quests_completed}
              </span>
            </div>
            <div className="bg-retro-black p-3 text-center">
              <span className="font-pixel text-retro-gray text-[7px] block mb-1">
                XP Earned
              </span>
              <span className="font-pixel text-retro-lime text-lg">
                +{recap.xp_earned}
              </span>
            </div>
          </div>

          {/* Categories */}
          {recap.categories.length > 0 && (
            <div>
              <span className="font-pixel text-retro-gray text-[7px] block mb-2">
                Categories Explored
              </span>
              <div className="flex flex-wrap gap-2">
                {recap.categories.map((category, i) => (
                  <span
                    key={i}
                    className="font-pixel text-[7px] px-2 py-1 bg-retro-darkpurple text-retro-lightgray"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
