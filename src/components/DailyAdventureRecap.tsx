"use client";

import React from "react";
import type { DailyAdventureHistoryItem, DailyAdventureStats } from "@/lib/daily-adventure";

interface DailyAdventureRecapProps {
  stats: DailyAdventureStats | null;
  history: DailyAdventureHistoryItem[];
  isLoading?: boolean;
}

function formatAdventureDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DailyAdventureRecap({ stats, history, isLoading }: DailyAdventureRecapProps) {
  if (isLoading) {
    return (
      <div className="bg-retro-darkgray border-4 border-retro-black p-4">
        <p className="font-pixel text-retro-lightgray text-[8px]">Loading adventure log...</p>
      </div>
    );
  }

  const hasHistory = history.length > 0;

  return (
    <div className="bg-retro-darkgray border-4 border-retro-black p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-pixel text-retro-cyan text-xs">🕯 Adventure Log</h3>
        {stats && stats.currentCompletionStreak > 0 && (
          <span className="font-pixel text-retro-lime text-[8px]">{stats.currentCompletionStreak} day loop</span>
        )}
      </div>

      {!stats || !hasHistory ? (
        <div className="text-center py-4">
          <p className="font-pixel text-retro-gray text-[8px]">No daily adventures logged yet.</p>
          <p className="font-pixel text-retro-lightgray text-[7px] mt-2">Complete today&apos;s loop to start your record.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-retro-black p-3 text-center">
              <span className="font-pixel text-retro-gray text-[7px] block mb-1">Started</span>
              <span className="font-pixel text-retro-yellow text-lg">{stats.totalStarted}</span>
            </div>
            <div className="bg-retro-black p-3 text-center">
              <span className="font-pixel text-retro-gray text-[7px] block mb-1">Complete</span>
              <span className="font-pixel text-retro-lime text-lg">{stats.totalCompleted}</span>
            </div>
            <div className="bg-retro-black p-3 text-center">
              <span className="font-pixel text-retro-gray text-[7px] block mb-1">Rate</span>
              <span className="font-pixel text-retro-cyan text-lg">{stats.completionRate}%</span>
            </div>
            <div className="bg-retro-black p-3 text-center">
              <span className="font-pixel text-retro-gray text-[7px] block mb-1">Notes</span>
              <span className="font-pixel text-tavern-gold text-lg">{stats.reflectionsWritten}</span>
            </div>
          </div>

          <div className="space-y-2">
            {history.map(({ adventure, mainQuest, sideQuest }) => (
              <div key={adventure.id} className="bg-retro-black p-3 border border-retro-darkpurple">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-pixel text-retro-lightgray text-[8px]">{formatAdventureDate(adventure.adventure_date)}</span>
                  <span className={`font-pixel text-[7px] ${adventure.completed_at ? "text-retro-lime" : "text-tavern-parchment-dim"}`}>
                    {adventure.completed_at ? "Complete" : "Open"}
                  </span>
                </div>
                <p className="font-pixel text-tavern-parchment text-[8px] leading-relaxed">
                  {sideQuest?.title ?? mainQuest?.title ?? "Daily loop created"}
                </p>
                {adventure.reflection_answer && (
                  <p className="text-[11px] text-tavern-parchment-dark leading-relaxed mt-2">
                    “{adventure.reflection_answer}”
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
