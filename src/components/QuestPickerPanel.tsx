"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Quest } from "@/lib/types";
import { acceptQuest, abandonAndAccept } from "@/lib/quest-progress";

interface QuestPickerPanelProps {
  quests: Quest[];
  onAccepted?: (quest: Quest) => void;
}

export default function QuestPickerPanel({ quests, onAccepted }: QuestPickerPanelProps) {
  const router = useRouter();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictQuest, setConflictQuest] = useState<{ questId: string; title: string } | null>(null);
  const [pendingAccept, setPendingAccept] = useState<Quest | null>(null);

  const handleAccept = async (quest: Quest) => {
    setAcceptingId(quest.id);
    setError(null);

    const result = await acceptQuest(quest.id, quest.type, quest.category);

    if (result.conflict) {
      setConflictQuest(result.conflict);
      setPendingAccept(quest);
      setAcceptingId(null);
      return;
    }

    if (!result.success) {
      setError(result.error || "Could not accept quest.");
      setAcceptingId(null);
      return;
    }

    setAcceptingId(null);
    onAccepted?.(quest);
    router.refresh();
  };

  const handleAbandonAndAccept = async () => {
    if (!conflictQuest || !pendingAccept) return;
    setAcceptingId(pendingAccept.id);

    const result = await abandonAndAccept(conflictQuest.questId, pendingAccept.id, pendingAccept.type, pendingAccept.category);

    setConflictQuest(null);
    setPendingAccept(null);

    if (result.success) {
      onAccepted?.(pendingAccept);
      router.refresh();
    } else {
      setError(result.error || "Could not switch quest.");
    }
    setAcceptingId(null);
  };

  return (
    <div className="tavern-card p-4 md:p-5">
      <div className="mb-4">
        <p className="font-pixel text-tavern-gold text-[8px] mb-1">⚔ Choose Your Next Adventure</p>
        <p className="text-[12px] text-[#cdb68f]">Pick a quest to begin. You can always browse more on the board.</p>
      </div>

      {error && (
        <div className="mb-3 p-2 border border-retro-red bg-retro-black/40 font-pixel text-retro-red text-[8px]">
          {error}
        </div>
      )}

      {/* Abandon conflict modal */}
      {conflictQuest && pendingAccept && (
        <div className="mb-4 p-3 border-2 border-tavern-ember bg-black/60">
          <p className="font-pixel text-[8px] text-tavern-parchment leading-relaxed mb-3">
            You&apos;re already on <span className="text-tavern-gold">{conflictQuest.title}</span>. Abandon it and start <span className="text-tavern-gold">{pendingAccept.title}</span> instead?
          </p>
          <p className="text-[10px] text-[#bda780] mb-3">Abandoning will not erase any XP you&apos;ve already earned.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAbandonAndAccept}
              disabled={!!acceptingId}
              className="tavrn-button !bg-tavern-ember !text-white text-[8px]"
            >
              Abandon &amp; Switch
            </button>
            <button
              type="button"
              onClick={() => { setConflictQuest(null); setPendingAccept(null); }}
              className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px]"
            >
              Keep Current
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {quests.map((quest) => {
          const isAccepting = acceptingId === quest.id;
          const blurb = quest.description.length > 90
            ? quest.description.slice(0, 87) + "…"
            : quest.description;

          return (
            <div key={quest.id} className="border border-tavern-oak/60 bg-black/20 p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-pixel text-[7px] text-tavern-gold">
                    {quest.type === "main" ? "⚔ Main" : "🗡 Side"}
                  </span>
                  <span className="font-pixel text-[7px] text-retro-lime">+{quest.xp_reward} XP</span>
                </div>
                <p className="font-pixel text-[9px] text-tavern-parchment leading-relaxed mb-1">{quest.title}</p>
                <p className="text-[11px] text-[#bda780] leading-snug">{blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => handleAccept(quest)}
                disabled={!!acceptingId}
                className="tavrn-button flex-shrink-0 !text-[8px] !py-1.5 !px-3 disabled:opacity-50"
              >
                {isAccepting ? "…" : "Accept"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-tavern-oak/30 flex items-center justify-between">
        <span className="text-[11px] text-[#7a6a50]">Not feeling these?</span>
        <Link href="/board" className="text-[11px] text-tavern-gold hover:text-tavern-candle underline">
          Browse the board →
        </Link>
      </div>
    </div>
  );
}
