"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Questline, QuestlineStep } from "@/lib/types";
import { getCategoryByKey } from "@/lib/quests";
import QuestlineProgress from "@/components/QuestlineProgress";
import PixelButton from "@/components/PixelButton";
import BadgeIcon from "@/components/BadgeIcon";
import { getQuestlineProgressMap, getUserQuestProgressMap } from "@/lib/quest-progress";
import { getErrorMessage } from "@/lib/errors";

interface QuestlineDetailClientProps {
  questline: Questline;
}

export default function QuestlineDetailClient({ questline }: QuestlineDetailClientProps) {
  const category = useMemo(
    () => getCategoryByKey(questline.category),
    [questline.category]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stepsWithProgress, setStepsWithProgress] = useState<QuestlineStep[]>(questline.steps);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadProgress = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [questlineProgressMap, userQuestMap] = await Promise.all([
          getQuestlineProgressMap(),
          getUserQuestProgressMap(),
        ]);

        if (!isMountedRef.current) return;

        const progress = questlineProgressMap[questline.id];
        const completedStepIds = new Set<string>();

        // Check each step's quest status
        const mergedSteps = questline.steps.map((step) => {
          const questProgress = userQuestMap[step.quest_id];
          const isStepCompleted = questProgress?.status === "completed";

          if (isStepCompleted) {
            completedStepIds.add(step.id);
          }

          return {
            ...step,
            is_completed: isStepCompleted,
            is_unlocked: step.is_starting_step || completedStepIds.has(step.parent_step_id || ""),
          };
        });

        setStepsWithProgress(mergedSteps);
        setCompletedCount(completedStepIds.size);
        setIsCompleted(progress?.is_completed || completedStepIds.size === questline.steps.length);
      } catch (err) {
        if (isMountedRef.current) {
          setLoadError(getErrorMessage(err, "Failed to load questline progress."));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadProgress();
  }, [questline.id, questline.steps]);

  const questlineWithProgress: Questline = {
    ...questline,
    steps: stepsWithProgress,
    progress: {
      completed_steps: completedCount,
      total_steps: questline.steps.length,
      is_completed: isCompleted,
      current_step_id: stepsWithProgress.find((s) => !s.is_completed && s.is_unlocked)?.id,
    },
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/questlines"
        className="font-pixel text-retro-lightgray text-[8px] hover:text-retro-white mb-4 inline-block"
      >
        ← Back to Questlines
      </Link>

      {/* Header */}
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel-lg p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Category Icon */}
          <div
            className="w-16 h-16 border-4 border-retro-black flex items-center justify-center text-3xl flex-shrink-0"
            style={{ backgroundColor: category?.color || "#6b7280" }}
          >
            {category?.icon || "📜"}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`
                  font-pixel text-[8px] px-3 py-1 uppercase
                  ${questline.type === "linear"
                    ? "bg-retro-blue text-retro-white"
                    : "bg-retro-purple text-retro-white"}
                `}
              >
                {questline.type === "linear" ? "📋 Linear" : "🌳 Skill Tree"}
              </span>
              <span className="font-pixel text-[8px] px-2 py-1 bg-retro-darkgray text-retro-lightgray uppercase border border-retro-gray">
                {questline.difficulty}
              </span>
            </div>

            <h1 className="font-pixel text-retro-yellow text-lg leading-tight">
              {questline.title}
            </h1>
          </div>
        </div>

        <p className="font-pixel text-retro-lightgray text-[10px] leading-loose mb-6">
          {questline.description}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between py-4 border-t-2 border-b-2 border-retro-black">
          <div className="text-center flex-1">
            <span className="font-pixel text-retro-gray text-[8px] block">Category</span>
            <span className="font-pixel text-retro-lightgray text-xs">
              {questline.category}
            </span>
          </div>
          <div className="text-center flex-1 border-x-2 border-retro-black">
            <span className="font-pixel text-retro-gray text-[8px] block">Steps</span>
            <span className="font-pixel text-retro-cyan text-xs">
              {questline.steps.length}
            </span>
          </div>
          <div className="text-center flex-1 border-r-2 border-retro-black">
            <span className="font-pixel text-retro-gray text-[8px] block">Total XP</span>
            <span className="font-pixel text-retro-lime text-xs">
              +{questline.total_xp}
            </span>
          </div>
          <div className="text-center flex-1">
            <span className="font-pixel text-retro-gray text-[8px] block">Reward</span>
            {questline.badge_reward ? (
              <div className="flex items-center justify-center gap-1">
                <BadgeIcon badge={questline.badge_reward} size="sm" />
              </div>
            ) : (
              <span className="font-pixel text-retro-gray text-xs">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-retro-darkgray border-4 border-retro-black p-6">
        {loadError && (
          <div className="bg-retro-black border-2 border-retro-red p-3 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-retro-red text-lg">⚠</span>
              <p className="font-pixel text-retro-red text-[8px] leading-relaxed flex-1">
                {loadError}
              </p>
            </div>
          </div>
        )}

        <h2 className="font-pixel text-retro-cyan text-sm mb-6">
          {isLoading
            ? "Loading progress..."
            : loadError
            ? "⚠ Error Loading Progress"
            : isCompleted
            ? "✓ Questline Complete!"
            : completedCount > 0
            ? "▶ Continue Your Journey"
            : "🚀 Ready to Begin?"}
        </h2>

        <QuestlineProgress
          questline={questlineWithProgress}
          onStepClick={(step) => {
            // Navigate to quest detail
            if (step.quest) {
              window.location.href = `/quests/${step.quest_id}`;
            }
          }}
        />
      </div>
    </div>
  );
}
