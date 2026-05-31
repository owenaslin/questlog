"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import ActiveQuestPanel from "@/components/quest/ActiveQuestPanel";
import SideQuestProgressCard from "@/components/quest/SideQuestProgressCard";
import QuestPickerPanel from "@/components/quest/QuestPickerPanel";

const ACTIVE_QUEST_INITIAL_DISPLAY = 4;

interface ActiveQuestTrackerProps {
  activeQuests: Quest[];
  loading?: boolean;
  pickerQuests?: Quest[];
  /** Called when a quest is accepted from the empty-state picker. */
  onQuestAccepted?: (quest: Quest) => void;
}

export default function ActiveQuestTracker({
  activeQuests,
  loading = false,
  pickerQuests = [],
  onQuestAccepted,
}: ActiveQuestTrackerProps) {
  const [showAll, setShowAll] = useState(false);
  const totalActive = activeQuests.length;

  const [primaryQuest, ...restQuests] = activeQuests;
  const visibleRest = showAll ? restQuests : restQuests.slice(0, ACTIVE_QUEST_INITIAL_DISPLAY);
  const hiddenCount = restQuests.length - ACTIVE_QUEST_INITIAL_DISPLAY;

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
            No quests in progress. Pick one below, or browse the board to begin your adventure.
          </p>
          {pickerQuests.length > 0 && (
            <QuestPickerPanel
              quests={pickerQuests.slice(0, 2)}
              onAccepted={onQuestAccepted ?? (() => {})}
            />
          )}
          <div className="mt-3 pt-3 border-t border-tavern-oak/30 flex flex-wrap gap-2">
            <Link href="/board" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              📋 Browse the Board
            </Link>
          </div>
        </div>
      )}

      {/* Active quests */}
      {!loading && totalActive > 0 && (
        <div className="space-y-4">
          {/* Primary quest — full panel with inline steps */}
          {primaryQuest && <ActiveQuestPanel quest={primaryQuest} />}

          {/* Remaining quests — compact progress cards */}
          {restQuests.length > 0 && (
            <div className="pt-1">
              <div className="space-y-3">
                {visibleRest.map((quest) => (
                  <SideQuestProgressCard key={quest.id} quest={quest} />
                ))}
              </div>

              {restQuests.length > ACTIVE_QUEST_INITIAL_DISPLAY && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-2 text-body-sm text-tavern-gold hover:underline"
                >
                  {showAll
                    ? "Show fewer quests ↑"
                    : `+${hiddenCount} more quest${hiddenCount === 1 ? "" : "s"} ↓`}
                </button>
              )}
            </div>
          )}

          {/* Footer — browse link */}
          <div className="pt-1 border-t border-tavern-oak/30 flex flex-wrap gap-2">
            <Link href="/board" className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
              📋 Browse Board
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
