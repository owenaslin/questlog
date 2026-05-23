"use client";

import React from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import ActiveQuestPanel from "@/components/quest/ActiveQuestPanel";
import SideQuestProgressCard from "@/components/quest/SideQuestProgressCard";
import QuestPickerPanel from "@/components/quest/QuestPickerPanel";

interface ActiveQuestTrackerProps {
  mainQuest: Quest | null;
  sideQuests: Quest[];
  loading?: boolean;
  pickerQuests?: Quest[];
  onQuestAccepted?: (quest: Quest) => void;
}

export default function ActiveQuestTracker({
  mainQuest,
  sideQuests,
  loading = false,
  pickerQuests = [],
  onQuestAccepted,
}: ActiveQuestTrackerProps) {
  const totalActive = (mainQuest ? 1 : 0) + sideQuests.length;

  return (
    <div className="tavrn-panel p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="kicker flex items-center gap-2">
          ⚔ Active Quests
          {!loading && totalActive > 0 && (
            <span className="badge badge-lime">{totalActive}</span>
          )}
        </p>
        <Link href="/board" className="text-body-sm text-tavern-gold hover:underline">
          View Board →
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 bg-tavern-oak/60 rounded" />
          <div className="h-2 w-full bg-tavern-oak/40 rounded" />
          <div className="h-2 w-5/6 bg-tavern-oak/40 rounded" />
          <div className="h-16 bg-tavern-oak/30 rounded mt-2" />
        </div>
      )}

      {/* No active quests — empty state */}
      {!loading && totalActive === 0 && (
        <div>
          <p className="text-[12px] text-[--parchment-dim] mb-4">
            No quests in progress. Choose a main quest below, or browse the board to begin your adventure.
          </p>
          {pickerQuests.filter((q) => q.type === "main").length > 0 && (
            <QuestPickerPanel
              quests={pickerQuests.filter((q) => q.type === "main").slice(0, 2)}
              onAccepted={onQuestAccepted ?? (() => {})}
            />
          )}
          <div className="mt-3 pt-3 border-t border-tavern-oak/30">
            <Link href="/board" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              📋 Browse the Board
            </Link>
          </div>
        </div>
      )}

      {/* Active quests */}
      {!loading && totalActive > 0 && (
        <div className="space-y-4">
          {/* Main quest — full panel */}
          {mainQuest && (
            <ActiveQuestPanel quest={mainQuest} />
          )}

          {/* Side quests — compact progress cards */}
          {sideQuests.length > 0 && (
            <div className={mainQuest ? "pt-1" : ""}>
              {mainQuest && (
                <p className="kicker mb-3">Side Quests In Progress</p>
              )}
              <div className="space-y-3">
                {sideQuests.map((quest) => (
                  <SideQuestProgressCard key={quest.id} quest={quest} />
                ))}
              </div>
            </div>
          )}

          {/* Browse more link */}
          <div className="pt-1 border-t border-tavern-oak/30">
            <Link href="/board" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              📋 Browse Board
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
