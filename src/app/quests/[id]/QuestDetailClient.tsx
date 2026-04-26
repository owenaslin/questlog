"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PixelButton from "@/components/PixelButton";
import XPBar from "@/components/XPBar";
import CompletionModal from "@/components/CompletionModal";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import AmbientScene from "@/components/AmbientScene";
import { Quest } from "@/lib/types";
import { detectMilestones, type Milestone } from "@/lib/milestones";
import {
  acceptQuest,
  abandonQuest,
  abandonAndAccept,
  completeQuest,
  getCompletedCategoryCounts,
  getUserDashboardSnapshot,
  updateStreakOnCompletion,
  getSuggestedNextQuests,
} from "@/lib/quest-progress";
import { useQuestStepProgress } from "@/lib/hooks/useQuestStepProgress";
import { getOwnHeroProfile } from "@/lib/hero";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { calculateLevel } from "@/lib/types";

interface QuestDetailClientProps {
  quest: Quest;
}

const difficultyLabels = ["", "Easy", "Medium", "Hard", "Very Hard", "Legendary"];
const DIFFICULTY_STARS = [0, 1, 2, 3, 4];

export default function QuestDetailClient({ quest }: QuestDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(quest.status);
  const [isWorking, setIsWorking] = useState(false);
  const isCompletingRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [profileXpTotal, setProfileXpTotal] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [newStreak, setNewStreak] = useState<number | undefined>(undefined);
  const [isNewLongest, setIsNewLongest] = useState(false);
  const [heroHandle, setHeroHandle] = useState<string | undefined>(undefined);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [suggestedQuests, setSuggestedQuests] = useState<Quest[]>([]);

  // Server-synced steps
  const steps = quest.steps ?? [];
  const {
    completedStepIds: stepChecked,
    loadingStepId: stepLoading,
    hydrated: stepsHydrated,
    toggleStep,
  } = useQuestStepProgress(quest.id);

  // Abandon confirmation
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [conflictQuest, setConflictQuest] = useState<{ questId: string; title: string } | null>(null);

  const completedStepsCount = stepChecked.size;
  const allStepsDone = steps.length > 0 && completedStepsCount >= steps.length;

  useEffect(() => {
    let mounted = true;
    const hydrateStatus = async () => {
      const [snapshot, heroProfile] = await Promise.all([
        getUserDashboardSnapshot(),
        getOwnHeroProfile(),
      ]);

      if (!mounted) return;
      const progressMap = snapshot?.progressMap ?? {};
      const summary = snapshot?.profileSummary ?? null;
      const progress = progressMap[quest.id];
      if (progress?.status) setStatus(progress.status);
      if (summary) setProfileXpTotal(summary.xp_total);
      if (heroProfile?.handle) setHeroHandle(heroProfile.handle);
    };

    hydrateStatus();
    return () => { mounted = false; };
  }, [quest.id]);

  const handleAccept = async () => {
    setIsWorking(true);
    setActionError(null);
    const previousStatus = status;
    setStatus("active");

    try {
      const result = await acceptQuest(quest.id, quest.type, quest.category);

      if (result.conflict) {
        setStatus(previousStatus);
        setConflictQuest(result.conflict);
        return;
      }

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

  const handleAbandonAndAccept = async () => {
    if (!conflictQuest) return;
    setIsWorking(true);
    setConflictQuest(null);
    const previousStatus = status;
    setStatus("active");

    try {
      const result = await abandonAndAccept(conflictQuest.questId, quest.id, quest.type, quest.category);
      if (!result.success) {
        setStatus(previousStatus);
        setActionError(result.error || "Could not accept quest.");
      }
    } catch (err) {
      setStatus(previousStatus);
      setActionError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleAbandon = async () => {
    setIsWorking(true);
    setShowAbandonConfirm(false);
    try {
      const result = await abandonQuest(quest.id);
      if (result.success) {
        router.push("/");
      } else {
        setActionError(result.error || "Could not abandon quest.");
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleComplete = async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    setIsWorking(true);
    setActionError(null);
    const previousStatus = status;
    setStatus("completed");

    try {
      const beforeSnapshot = await getUserDashboardSnapshot();
      const beforeSummary = beforeSnapshot?.profileSummary ?? null;
      const beforeLevel = beforeSummary?.level || calculateLevel(beforeSummary?.xp_total || 0);

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
        const summary = (await getUserDashboardSnapshot())?.profileSummary ?? null;
        if (summary) setProfileXpTotal(summary.xp_total);
        setActionError("This quest is already completed. No additional XP awarded.");
        return;
      }

      setXpEarned(quest.xp_reward);
      setShowXpAnimation(true);

      const streakResult = await updateStreakOnCompletion();
      if (streakResult.success) {
        setNewStreak(streakResult.newStreak);
        setIsNewLongest(streakResult.isNewLongest ?? false);
      }

      const [afterSnapshot, completedByCategory, suggested] = await Promise.all([
        getUserDashboardSnapshot(),
        getCompletedCategoryCounts(),
        getSuggestedNextQuests(quest.id),
      ]);
      setSuggestedQuests(suggested);

      const summary = afterSnapshot?.profileSummary ?? null;
      const updatedProgressMap = afterSnapshot?.progressMap ?? {};
      const totalCompleted = Object.values(updatedProgressMap).filter((p) => p.status === "completed").length;
      let afterSummaryLevel = beforeLevel;
      if (summary) {
        setProfileXpTotal(summary.xp_total);
        const afterLevel = summary.level || calculateLevel(summary.xp_total);
        afterSummaryLevel = afterLevel;
        setNewLevel(afterLevel > beforeLevel ? afterLevel : null);
      }

      const detectedMilestones = detectMilestones({
        questJustCompleted: quest,
        newStreak: streakResult.newStreak ?? 0,
        oldStreak: streakResult.previousStreak ?? 0,
        newLevel: afterSummaryLevel,
        oldLevel: beforeLevel,
        totalCompleted,
        completedByCategory,
        isFirstQuest: totalCompleted === 1,
      });
      setMilestones(detectedMilestones);

      setTimeout(() => {
        if (detectedMilestones.length > 0) {
          setShowMilestoneCelebration(true);
        } else {
          setShowCompletionModal(true);
        }
        setShowXpAnimation(false);
      }, 1000);
    } catch (err) {
      setStatus(previousStatus);
      setActionError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsWorking(false);
      isCompletingRef.current = false;
    }
  };

  const progressPct = steps.length > 0 ? Math.round((completedStepsCount / steps.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto relative">
      <AmbientScene scene="quest-alcove" />

      <button
        type="button"
        onClick={() => router.push("/board")}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-tavern-parchment hover:text-tavern-gold text-xl transition-colors z-10"
        aria-label="Close"
      >
        ✕
      </button>

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
        <h1 className="font-pixel text-retro-yellow text-lg leading-relaxed mb-2">
          {quest.title}
        </h1>

        {/* Step progress bar (shown when quest is active and has steps) */}
        {status === "active" && steps.length > 0 && stepsHydrated && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-retro-gray mb-1">
              <span>{completedStepsCount}/{steps.length} objectives</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 bg-retro-black border border-retro-darkgray">
              <div
                className="h-full bg-retro-lime transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <p className="font-pixel text-retro-lightgray text-[10px] leading-loose mb-6">
          {quest.description}
        </p>

        {/* Objectives (Steps) — server-synced */}
        {steps.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-pixel text-retro-gray text-[7px] uppercase tracking-widest">Objectives</span>
              <div className="flex-1 h-px bg-retro-darkgray" />
              <span className="font-pixel text-retro-gray text-[7px]">
                {completedStepsCount}/{steps.length}
              </span>
            </div>
            <ul className="space-y-2">
              {steps.map((step) => {
                const done = stepChecked.has(step.id);
                const loading = stepLoading === step.id;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      disabled={!!stepLoading}
                      className="flex items-start gap-3 w-full text-left group disabled:cursor-wait"
                    >
                      <div
                        className={`
                          mt-0.5 w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center
                          transition-none
                          ${done
                            ? "border-retro-lime bg-retro-darkgreen"
                            : "border-retro-gray bg-retro-black group-hover:border-retro-lightgray"
                          }
                          ${loading ? "opacity-50" : ""}
                        `}
                        style={{ imageRendering: "pixelated" }}
                      >
                        {done && <span className="font-pixel text-retro-lime text-[8px] leading-none">✓</span>}
                      </div>
                      <span
                        className={`font-pixel text-[9px] leading-relaxed ${
                          done ? "text-retro-gray line-through" : "text-retro-lightgray"
                        }`}
                      >
                        {step.title}
                        {step.optional && (
                          <span className="ml-2 text-[7px] text-retro-darkgray">(optional)</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-retro-black p-3 text-center">
            <div className="font-pixel text-retro-gray text-[7px] mb-1 uppercase">Difficulty</div>
            <div className="flex justify-center gap-1 mb-1">
              {DIFFICULTY_STARS.map((i) => (
                <span key={i} className={`text-xs ${i < quest.difficulty ? "text-retro-yellow" : "text-retro-darkgray"}`}>★</span>
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
                  <p className="font-pixel text-retro-red text-[8px] leading-relaxed">{actionError}</p>
                </div>
                <button
                  onClick={() => setActionError(null)}
                  className="font-pixel text-retro-gray hover:text-retro-white text-[8px] px-1"
                  aria-label="Dismiss error"
                >✕</button>
              </div>
            </div>
          )}

          {/* Conflict: already have a main quest */}
          {conflictQuest && (
            <div className="bg-retro-black border-2 border-retro-orange p-4 mb-4">
              <p className="font-pixel text-retro-orange text-[8px] leading-relaxed mb-3">
                You&apos;re already on <span className="text-retro-yellow">{conflictQuest.title}</span>.
                Abandon it and start this one? Your progress and XP are kept.
              </p>
              <div className="flex gap-2">
                <PixelButton variant="danger" size="sm" onClick={handleAbandonAndAccept} disabled={isWorking}>
                  Abandon &amp; Switch
                </PixelButton>
                <PixelButton variant="secondary" size="sm" onClick={() => setConflictQuest(null)} disabled={isWorking}>
                  Keep Current
                </PixelButton>
              </div>
            </div>
          )}

          {status === "available" && !conflictQuest && (
            <div className="flex flex-col items-center gap-4">
              <p className="font-pixel text-retro-lightgray text-[9px]">Ready to begin this quest?</p>
              <PixelButton variant="success" size="lg" onClick={handleAccept} disabled={isWorking}>
                {isWorking ? (
                  <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Accepting...</span>
                ) : "▶ Accept Quest"}
              </PixelButton>
            </div>
          )}

          {status === "active" && (
            <div className="flex flex-col items-center gap-4">
              <div className="font-pixel text-retro-orange text-[10px] bg-retro-black px-4 py-2 animate-pulse">
                ▶ Quest In Progress
              </div>

              {/* Desktop Complete button — hidden on mobile (sticky version handles that) */}
              {!showAbandonConfirm && !conflictQuest && (
                <div className="hidden md:flex w-full justify-center">
                  <PixelButton
                    variant="primary"
                    size="lg"
                    onClick={handleComplete}
                    disabled={isWorking}
                    className={allStepsDone ? "animate-pulse" : ""}
                  >
                    {isWorking ? (
                      <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Completing...</span>
                    ) : allStepsDone ? "✓ All done — Complete Quest!" : "✓ Complete Quest"}
                  </PixelButton>
                </div>
              )}

              {/* Abandon Quest (secondary) */}
              {showAbandonConfirm ? (
                <div className="w-full text-center space-y-2">
                  <p className="font-pixel text-retro-gray text-[8px]">Abandon this quest?</p>
                  <div className="flex justify-center gap-2">
                    <PixelButton variant="danger" size="sm" onClick={handleAbandon} disabled={isWorking}>
                      Yes, Abandon
                    </PixelButton>
                    <PixelButton variant="secondary" size="sm" onClick={() => setShowAbandonConfirm(false)}>
                      Cancel
                    </PixelButton>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAbandonConfirm(true)}
                  className="font-pixel text-retro-gray text-[8px] hover:text-retro-red underline"
                >
                  Abandon Quest
                </button>
              )}
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
                <Link href="/board">
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

      {/* Sticky Complete button on mobile — floats above bottom nav */}
      {status === "active" && !showAbandonConfirm && !conflictQuest && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 md:hidden z-40 pointer-events-none">
          <PixelButton
            variant="primary"
            size="lg"
            onClick={handleComplete}
            disabled={isWorking}
            className={`w-full pointer-events-auto ${allStepsDone ? "animate-pulse" : ""}`}
          >
            {isWorking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> Completing...
              </span>
            ) : allStepsDone ? "✓ All done — Complete Quest!" : "✓ Complete Quest"}
          </PixelButton>
        </div>
      )}


      {showMilestoneCelebration && milestones.length > 0 && (
        <MilestoneCelebration
          milestones={milestones}
          onComplete={() => {
            setShowMilestoneCelebration(false);
            setShowCompletionModal(true);
          }}
        />
      )}

      {showCompletionModal && profileXpTotal !== null && (
        <CompletionModal
          quest={quest}
          xpEarned={xpEarned}
          newXpTotal={profileXpTotal}
          newLevel={newLevel ?? undefined}
          newStreak={newStreak}
          isNewLongest={isNewLongest}
          heroHandle={heroHandle}
          milestones={milestones}
          suggestedQuests={suggestedQuests}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
}
