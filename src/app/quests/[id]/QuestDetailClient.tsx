"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PixelButton from "@/components/PixelButton";
import XPBar from "@/components/XPBar";
import CompletionModal from "@/components/CompletionModal";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import AmbientScene from "@/components/AmbientScene";
import { Quest, QuestStep } from "@/lib/types";
import { detectMilestones, type Milestone } from "@/lib/milestones";
import {
  acceptQuest,
  completeQuestStep,
  completeQuest,
  getCompletedCategoryCounts,
  getUserDashboardSnapshot,
  getUserQuestStepProgress,
  updateStreakOnCompletion,
} from "@/lib/quest-progress";
import { getOwnHeroProfile } from "@/lib/hero";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { calculateLevel } from "@/lib/types";

interface QuestDetailClientProps {
  quest: Quest;
}

const difficultyLabels = ["", "Easy", "Medium", "Hard", "Very Hard", "Legendary"];

// Module-level constant to avoid recreating array on each render
const DIFFICULTY_STARS = [0, 1, 2, 3, 4];

export default function QuestDetailClient({ quest }: QuestDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(quest.status);
  const [isWorking, setIsWorking] = useState(false);
  // Guard against double-tap: ensures handleComplete can't fire concurrently.
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
  const [stepChecked, setStepChecked] = useState<Record<string, boolean>>({});
  const [savingSteps, setSavingSteps] = useState<Record<string, boolean>>({});

  const steps = quest.steps ?? [];
  const requiredSteps = useMemo(
    () => steps.filter((step) => !step.optional),
    [steps]
  );

  const stepXpById = useMemo(() => {
    const rewards: Record<string, number> = {};
    const requiredCount = requiredSteps.length;

    if (requiredCount === 0) {
      for (const step of steps) {
        rewards[step.id] = 0;
      }
      return rewards;
    }

    const base = Math.floor(quest.xp_reward / requiredCount);
    let remainder = quest.xp_reward % requiredCount;

    for (const step of steps) {
      if (step.optional) {
        rewards[step.id] = 0;
        continue;
      }
      const bonus = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      rewards[step.id] = base + bonus;
    }

    return rewards;
  }, [quest.xp_reward, requiredSteps, steps]);

  // Memoize completed count to avoid filtering on every render
  const completedStepsCount = useMemo(
    () => steps.filter((s) => stepChecked[s.id]).length,
    [steps, stepChecked]
  );

  const completedRequiredStepXp = useMemo(
    () => requiredSteps.reduce((sum, step) => sum + (stepChecked[step.id] ? (stepXpById[step.id] ?? 0) : 0), 0),
    [requiredSteps, stepChecked, stepXpById]
  );

  const allRequiredStepsComplete = useMemo(
    () => requiredSteps.every((step) => stepChecked[step.id]),
    [requiredSteps, stepChecked]
  );

  const storageKey = useMemo(() => `quest-steps-${quest.id}`, [quest.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, boolean>;
      const normalized = steps.reduce<Record<string, boolean>>((acc, step) => {
        acc[step.id] = Boolean(stored[step.id]);
        return acc;
      }, {});
      setStepChecked(normalized);
    } catch {
      const empty = steps.reduce<Record<string, boolean>>((acc, step) => {
        acc[step.id] = false;
        return acc;
      }, {});
      setStepChecked(empty);
    }
  }, [storageKey, steps]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(stepChecked));
  }, [storageKey, stepChecked]);

  useEffect(() => {
    let mounted = true;
    const hydrateStatus = async () => {
      const [snapshot, heroProfile] = await Promise.all([
        getUserDashboardSnapshot(),
        getOwnHeroProfile(),
      ]);
      const stepProgressMap = steps.length ? await getUserQuestStepProgress(quest.id) : {};

      if (!mounted) return;
      const progressMap = snapshot?.progressMap ?? {};
      const summary = snapshot?.profileSummary ?? null;
      const progress = progressMap[quest.id];
      if (progress?.status) setStatus(progress.status);
      if (summary) setProfileXpTotal(summary.xp_total);
      if (heroProfile?.handle) setHeroHandle(heroProfile.handle);
      if (steps.length) {
        setStepChecked((prev) => {
          const next = steps.reduce<Record<string, boolean>>((acc, step) => {
            acc[step.id] = Boolean(stepProgressMap[step.id]);
            return acc;
          }, {});

          const hasAnyRemote = Object.keys(stepProgressMap).length > 0;
          if (!hasAnyRemote) {
            return prev;
          }

          return next;
        });
      }
    };

    hydrateStatus();
    return () => { mounted = false; };
  }, [quest.id, steps]);

  const handleStepComplete = async (step: QuestStep) => {
    if (stepChecked[step.id] || savingSteps[step.id]) {
      return;
    }

    setActionError(null);
    setSavingSteps((prev) => ({ ...prev, [step.id]: true }));
    setStepChecked((prev) => ({ ...prev, [step.id]: true }));

    try {
      const stepXp = stepXpById[step.id] ?? 0;
      const result = await completeQuestStep(quest.id, step.id, stepXp, quest.type, quest.category);

      if (!result.success) {
        setStepChecked((prev) => ({ ...prev, [step.id]: false }));
        if (result.error?.toLowerCase().includes("log in")) {
          router.push(buildAuthUrl("login", pathname || `/quests/${quest.id}`));
        }
        setActionError(result.error || "Could not complete step.");
        return;
      }

      if (result.nextXp !== undefined) {
        setProfileXpTotal(result.nextXp);
      }
    } catch (err) {
      setStepChecked((prev) => ({ ...prev, [step.id]: false }));
      setActionError(err instanceof Error ? err.message : "Could not complete step.");
    } finally {
      setSavingSteps((prev) => ({ ...prev, [step.id]: false }));
    }
  };

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
    if (isCompletingRef.current) return; // prevent double-tap
    isCompletingRef.current = true;
    setIsWorking(true);
    setActionError(null);
    const previousStatus = status;
    setStatus("completed");

    try {
      // Capture level before completion
      const beforeSnapshot = await getUserDashboardSnapshot();
      const beforeSummary = beforeSnapshot?.profileSummary ?? null;
      const beforeLevel = beforeSummary?.level || calculateLevel(beforeSummary?.xp_total || 0);

      const remainingQuestXp = Math.max(0, quest.xp_reward - completedRequiredStepXp);
      const result = await completeQuest(quest.id, remainingQuestXp, quest.type, quest.category);
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
        if (summary) {
          setProfileXpTotal(summary.xp_total);
        }
        setActionError("This quest is already completed. No additional XP awarded.");
        return;
      }

      setXpEarned(remainingQuestXp);
      setShowXpAnimation(remainingQuestXp > 0);

      // Update streak tracking
      const streakResult = await updateStreakOnCompletion();
      if (streakResult.success) {
        setNewStreak(streakResult.newStreak);
        setIsNewLongest(streakResult.isNewLongest ?? false);
      }

      // Detect milestones based on latest completion state
      const [afterSnapshot, completedByCategory] = await Promise.all([
        getUserDashboardSnapshot(),
        getCompletedCategoryCounts(),
      ]);
      const summary = afterSnapshot?.profileSummary ?? null;
      const updatedProgressMap = afterSnapshot?.progressMap ?? {};
      const totalCompleted = Object.values(updatedProgressMap).filter(
        (p) => p.status === "completed"
      ).length;
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

      // Show milestone celebration first, then completion modal
      setTimeout(() => {
        if (detectedMilestones.length > 0) {
          setShowMilestoneCelebration(true);
        } else {
          setShowCompletionModal(true);
        }
        setShowXpAnimation(false);
      }, remainingQuestXp > 0 ? 1000 : 250);
    } catch (err) {
      setStatus(previousStatus);
      setActionError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsWorking(false);
      isCompletingRef.current = false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto relative">
      <AmbientScene scene="quest-alcove" />
      {/* Close button */}
      <button
        type="button"
        onClick={() => router.push("/board")} // always /board — router.back() would exit the app on cold URL load
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-tavern-parchment hover:text-tavern-gold text-xl transition-colors z-10"
        aria-label="Close"
      >
        ✕
      </button>

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

        {/* Objectives (Steps) */}
        {steps.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-pixel text-retro-gray text-[7px] uppercase tracking-widest">
                Objectives
              </span>
              <div className="flex-1 h-px bg-retro-darkgray" />
              <span className="font-pixel text-retro-gray text-[7px]">
                {completedStepsCount}/{steps.length}
              </span>
            </div>
            <ul className="space-y-2">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className={`flex items-start gap-3 group ${stepChecked[step.id] ? "cursor-default" : "cursor-pointer"}`}
                  onClick={() => handleStepComplete(step)}
                >
                  {/* Retro pixel checkbox */}
                  <div
                    className={`
                      mt-0.5 w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center
                      transition-none cursor-pointer
                      ${stepChecked[step.id]
                        ? "border-retro-lime bg-retro-darkgreen"
                        : "border-retro-gray bg-retro-black group-hover:border-retro-lightgray"
                      }
                    `}
                    style={{ imageRendering: "pixelated" }}
                  >
                    {stepChecked[step.id] && (
                      <span className="font-pixel text-retro-lime text-[8px] leading-none">✓</span>
                    )}
                  </div>
                  <span
                    className={`
                      font-pixel text-[9px] leading-relaxed
                      ${stepChecked[step.id]
                        ? "text-retro-gray line-through"
                        : "text-retro-lightgray"
                      }
                    `}
                  >
                    {step.title}
                    {step.optional && (
                      <span className="ml-2 text-[7px] text-retro-darkgray">(optional)</span>
                    )}
                    {!stepChecked[step.id] && (stepXpById[step.id] ?? 0) > 0 && (
                      <span className="ml-2 text-[7px] text-retro-lime">+{stepXpById[step.id]} XP</span>
                    )}
                    {savingSteps[step.id] && (
                      <span className="ml-2 text-[7px] text-retro-cyan">Saving...</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-retro-black p-3 text-center">
            <div className="font-pixel text-retro-gray text-[7px] mb-1 uppercase">Difficulty</div>
            <div className="flex justify-center gap-1 mb-1">
              {DIFFICULTY_STARS.map((i) => (
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
              {requiredSteps.length > 0 && !allRequiredStepsComplete && (
                <p className="font-pixel text-retro-lightgray text-[8px] text-center">
                  Complete all required objectives first.
                </p>
              )}
              <PixelButton
                variant="primary"
                size="lg"
                onClick={handleComplete}
                disabled={isWorking || (requiredSteps.length > 0 && !allRequiredStepsComplete)}
              >
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

      {/* Milestone Celebration (full-screen) */}
      {showMilestoneCelebration && milestones.length > 0 && (
        <MilestoneCelebration
          milestones={milestones}
          onComplete={() => {
            setShowMilestoneCelebration(false);
            setShowCompletionModal(true);
          }}
        />
      )}

      {/* Completion Celebration Modal */}
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
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
}
