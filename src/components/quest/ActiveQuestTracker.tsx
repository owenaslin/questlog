"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import ActiveQuestPanel from "@/components/quest/ActiveQuestPanel";
import SideQuestProgressCard from "@/components/quest/SideQuestProgressCard";
import QuestPickerPanel from "@/components/quest/QuestPickerPanel";

const SIDE_QUEST_INITIAL_DISPLAY = 3;

interface ActiveQuestTrackerProps {
  mainQuest: Quest | null;
  sideQuests: Quest[];
  loading?: boolean;
  pickerQuests?: Quest[];
  /** Called only when a main quest is accepted from the empty-state picker. */
  onMainQuestAccepted?: (quest: Quest) => void;
}

export default function ActiveQuestTracker({
  mainQuest,
  sideQuests,
  loading = false,
  pickerQuests = [],
  onMainQuestAccepted,
}: ActiveQuestTrackerProps) {
  const [showAllSideQuests, setShowAllSideQuests] = useState(false);
  const totalActive = (mainQuest ? 1 : 0) + sideQuests.length;

  const visibleSideQuests = showAllSideQuests
    ? sideQuests
    : sideQuests.slice(0, SIDE_QUEST_INITIAL_DISPLAY);
  const hiddenCount = sideQuests.length - SIDE_QUEST_INITIAL_DISPLAY;

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
              onAccepted={onMainQuestAccepted ?? (() => {})}
            />
          )}
          <div className="mt-3 pt-3 border-t border-tavern-oak/30 flex flex-wrap gap-2">
            <Link href="/board" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              📋 Browse the Board
            </Link>
            <Link href="/board?type=side" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              🗡 Browse Side Quests
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
                {visibleSideQuests.map((quest) => (
                  <SideQuestProgressCard key={quest.id} quest={quest} />
                ))}
              </div>

              {/* Show more / collapse toggle */}
              {sideQuests.length > SIDE_QUEST_INITIAL_DISPLAY && (
                <button
                  type="button"
                  onClick={() => setShowAllSideQuests((v) => !v)}
                  className="mt-2 text-body-sm text-tavern-gold hover:underline"
                >
                  {showAllSideQuests
                    ? "Show fewer side quests ↑"
                    : `+${hiddenCount} more side quest${hiddenCount === 1 ? "" : "s"} ↓`}
                </button>
              )}
            </div>
          )}

          {/* Footer — no active side quests hint + browse links */}
          <div className="pt-1 border-t border-tavern-oak/30 flex flex-wrap gap-2">
            <Link href="/board" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              📋 Browse Board
            </Link>
            {sideQuests.length === 0 && (
              <Link href="/board?type=side" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
                🗡 Find Side Quests
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
