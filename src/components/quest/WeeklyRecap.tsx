"use client";

import React from "react";
import { WeeklyRecap as WeeklyRecapType } from "@/lib/quest-progress";
import { LIFE_AREAS } from "@/lib/life-areas";

interface WeeklyRecapProps {
  recap: WeeklyRecapType | null;
  isLoading?: boolean;
}

export default function WeeklyRecap({ recap, isLoading }: WeeklyRecapProps) {
  if (isLoading) {
    return (
      <div className="bg-retro-darkgray border-4 border-retro-black p-4">
        <p className="text-body-sm text-retro-lightgray">Loading weekly recap...</p>
      </div>
    );
  }

  const hasActivity = recap && (recap.quests_completed > 0 || recap.xp_earned > 0);
  const categoryCounts = (recap?.categories ?? []).reduce<Record<string, number>>((acc, category) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const bestCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const neglectedArea = LIFE_AREAS.find((area) => !area.categories.some((category) => recap?.categories.includes(category))) ?? null;
  const suggestedFocus = neglectedArea?.categories[0] ?? "one small quest";

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
        <h3 className="text-body-sm font-semibold text-retro-cyan">
          📊 {recap ? getWeekLabel(recap.week_start) : "Weekly Recap"}
        </h3>
        {hasActivity && (
          <span className="badge badge-lime">✓ Active</span>
        )}
      </div>

      {!hasActivity ? (
        <div className="text-center py-4">
          <p className="text-body-sm text-retro-gray">
            No quests completed this week yet.
          </p>
          <p className="text-body-sm text-retro-lightgray mt-2">
            Complete one today to start your week strong!
          </p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-retro-black p-3 text-center">
              <span className="kicker block mb-1">
                Quests Done
              </span>
              <span className="font-pixel text-retro-yellow text-lg">
                {recap.quests_completed}
              </span>
            </div>
            <div className="bg-retro-black p-3 text-center">
              <span className="kicker block mb-1">
                XP Earned
              </span>
              <span className="font-pixel text-retro-lime text-lg">
                +{recap.xp_earned}
              </span>
            </div>
          </div>

          {/* Categories */}
          {recap.categories.length > 0 && (
            <div className="mb-4">
              <span className="kicker block mb-2">
                Categories Explored
              </span>
              <div className="flex flex-wrap gap-2">
                {recap.categories.map((category, i) => (
                  <span
                    key={i}
                    className="badge badge-purple"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-retro-black p-3 mb-3">
            <span className="kicker block mb-2">
              Weekly Insight
            </span>
            <p className="text-body text-retro-lightgray leading-relaxed">
              {bestCategory
                ? `Most of your momentum was in ${bestCategory}. Next week, try ${suggestedFocus} to keep your character balanced.`
                : `Try ${suggestedFocus} next week to start building a balanced character.`}
            </p>
          </div>

          <div className="border-t border-retro-black pt-3">
            <span className="kicker block mb-1">
              Reflection
            </span>
            <p className="text-body-sm text-retro-cyan leading-relaxed">
              What gave you the most energy this week?
            </p>
          </div>
        </>
      )}
    </div>
  );
}
