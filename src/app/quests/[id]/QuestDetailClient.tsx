"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PixelButton from "@/components/PixelButton";
import XPBar from "@/components/XPBar";
import CompletionModal from "@/components/CompletionModal";
import { Quest } from "@/lib/types";
import {
  acceptQuest,
  completeQuest,
  getProfileProgressSummary,
  getUserQuestProgressMap,
  updateStreakOnCompletion,
} from "@/lib/quest-progress";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { calculateLevel } from "@/lib/types";

interface QuestDetailClientProps {
  quest: Quest;
}

const difficultyLabels = ["", "Easy", "Medium", "Hard", "Very Hard", "Legendary"];

export default function QuestDetailClient({ quest }: QuestDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(quest.status);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [profileXpTotal, setProfileXpTotal] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<number | null>(null);

  useEffect(() => {
    const hydrateStatus = async () => {
      const progressMap = await getUserQuestProgressMap();
      const progress = progressMap[quest.id];
      if (progress?.status) {
        setStatus(progress.status);
      }

      const summary = await getProfileProgressSummary();
      if (summary) {
        setProfileXpTotal(summary.xp_total);
      }
    };

    hydrateStatus();
  }, [quest.id]);

  const handleAccept = async () => {
    setIsWorking(true);
    setActionError(null);
    const previousStatus = status;
    setStatus("active");

    try {
      const result = await acceptQuest(quest.id, quest.type, quest.category);
      if (!result.success) {
        setStatus(previousStatus);
        if (result.error?.toLowerCase().includes("log in")) {
          router.push(buildAuthUrl("login", pathname || `/quests/${quest.id}`));
        }
        setActionError(result.error || "Could not accept quest.");
      }
    } catch (err) {
      setStatus(previousStatus);
      setActionError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleComplete = async () => {
    setIsWorking(true);
    setActionError(null);
    const previousStatus = status;
    setStatus("completed");

    try {
      // Capture level before completion
      const beforeSummary = await getProfileProgressSummary();
      const beforeLevel = beforeSummary?.level || calculateLevel(beforeSummary?.xp_total || 0);
      setPreviousLevel(beforeLevel);

      const result = await completeQuest(quest.id, quest.xp_reward, quest.type, quest.category);
      if (!result.success) {
        setStatus(previousStatus);
        if (result.error?.toLowerCase().includes("log in")) {
          router.push(buildAuthUrl("login", pathname || `/quests/${quest.id}`));
        }
        setActionError(result.error || "Could not complete quest.");
        return;
      }

      if (result.alreadyCompleted) {
        const summary = await getProfileProgressSummary();
        if (summary) {
          setProfileXpTotal(summary.xp_total);
        }
        setActionError("This quest is already completed. No additional XP awarded.");
        return;
      }

      setXpEarned(quest.xp_reward);
      setShowXpAnimation(true);

      const summary = await getProfileProgressSummary();
      if (summary) {
        setProfileXpTotal(summary.xp_total);
        const afterLevel = summary.level || calculateLevel(summary.xp_total);
        setNewLevel(afterLevel > beforeLevel ? afterLevel : null);
      }

      // Update streak tracking
      await updateStreakOnCompletion();

      // Show completion modal
      setTimeout(() => {
        setShowCompletionModal(true);
        setShowXpAnimation(false);
      }, 1000);
    } catch (err) {
      setStatus(previousStatus);
      setActionError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <Link
        href="/quests"
        className="font-pixel text-retro-lightgray text-[8px] hover:text-retro-white mb-6 inline-block"
      >
        ← Back to Quest Board
      </Link>

      {/* Quest Card */}
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel-lg p-8">
        {/* Type & Source badges */}
        <div className="flex items-center gap-3 mb-6">
          <span
            className={`font-pixel text-[9px] px-3 py-1 uppercase ${
              quest.type === "main" ? "bg-retro-red text-retro-white" : "bg-retro-blue text-retro-white"
            }`}
          >
            {quest.type === "main" ? "⚔ Main Quest" : "🗡 Side Quest"}
          </span>
          <span className="font-pixel text-[8px] px-2 py-1 bg-retro-darkgreen text-retro-white uppercase">
            {quest.source === "predefined" ? "★ Curated" : quest.source === "ai" ? "⚡ AI" : "✎ Custom"}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-pixel text-retro-yellow text-lg leading-relaxed mb-4">
          {quest.title}
        </h1>

        {/* Description */}
        <p className="font-pixel text-retro-lightgray text-[10px] leading-loose mb-6">
          {quest.description}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-retro-black p-3 text-center">
            <div className="font-pixel text-retro-gray text-[7px] mb-1 uppercase">Difficulty</div>
            <div className="flex justify-center gap-1 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-xs ${i < quest.difficulty ? "text-retro-yellow" : "text-retro-darkgray"}`}>
                  ★
                </span>
              ))}
            </div>
            <div className="font-pixel text-retro-white text-[8px]">{difficultyLabels[quest.difficulty]}</div>
          </div>

          <div className="bg-retro-black p-3 text-center">
            <div className="font-pixel text-retro-gray text-[7px] mb-1 uppercase">XP Reward</div>
            <div className="font-pixel text-retro-lime text-sm">+{quest.xp_reward}</div>
          </div>

          <div className="bg-retro-black p-3 text-center">
            <div className="font-pixel text-retro-gray text-[7px] mb-1 uppercase">Duration</div>
            <div className="font-pixel text-retro-cyan text-[9px]">{quest.duration_label}</div>
          </div>

          <div className="bg-retro-black p-3 text-center">
            <div className="font-pixel text-retro-gray text-[7px] mb-1 uppercase">Category</div>
            <div className="font-pixel text-retro-orange text-[9px]">{quest.category}</div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="border-t-4 border-retro-black pt-6">
          {actionError && (
            <div className="bg-retro-black border-2 border-retro-red p-3 mb-4 animate-in slide-in-from-top-2">
              <div className="flex items-start gap-2">
                <span className="text-retro-red text-lg">⚠</span>
                <div className="flex-1">
                  <p className="font-pixel text-retro-red text-[8px] leading-relaxed">
                    {actionError}
                  </p>
                </div>
                <button
                  onClick={() => setActionError(null)}
                  className="font-pixel text-retro-gray hover:text-retro-white text-[8px] px-1"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {status === "available" && (
            <div className="flex flex-col items-center gap-4">
              <p className="font-pixel text-retro-lightgray text-[9px]">Ready to begin this quest?</p>
              <PixelButton variant="success" size="lg" onClick={handleAccept} disabled={isWorking}>
                {isWorking ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span> Accepting...
                  </span>
                ) : (
                  "▶ Accept Quest"
                )}
              </PixelButton>
            </div>
          )}

          {status === "active" && (
            <div className="flex flex-col items-center gap-4">
              <div className="font-pixel text-retro-orange text-[10px] bg-retro-black px-4 py-2 animate-pulse">
                ▶ Quest In Progress
              </div>
              <PixelButton variant="primary" size="lg" onClick={handleComplete} disabled={isWorking}>
                {isWorking ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span> Completing...
                  </span>
                ) : (
                  "✓ Complete Quest"
                )}
              </PixelButton>
            </div>
          )}

          {status === "completed" && (
            <div className="flex flex-col items-center gap-4">
              <div className="font-pixel text-retro-green text-xs bg-retro-black px-4 py-2">✓ Quest Completed!</div>
              {showXpAnimation && (
                <div className="font-pixel text-retro-lime text-lg animate-bounce-8bit">+{xpEarned} XP!</div>
              )}
              <XPBar xpTotal={profileXpTotal ?? xpEarned} />
              <div className="flex gap-2">
                <Link href="/quests">
                  <PixelButton variant="secondary">Find More Quests</PixelButton>
                </Link>
                <button
                  onClick={() => setShowCompletionModal(true)}
                  className="font-pixel text-retro-cyan text-[8px] hover:text-retro-lightblue underline"
                >
                  View Reward
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Celebration Modal */}
      {showCompletionModal && profileXpTotal !== null && (
        <CompletionModal
          quest={quest}
          xpEarned={xpEarned}
          newXpTotal={profileXpTotal}
          newLevel={newLevel ?? undefined}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
}
