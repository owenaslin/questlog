"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import { getQuestStepProgress, markQuestStep, unmarkQuestStep } from "@/lib/quest-progress";

interface ActiveQuestPanelProps {
  quest: Quest;
}

export default function ActiveQuestPanel({ quest }: ActiveQuestPanelProps) {
  const steps = quest.steps ?? [];
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const mountedRef = useRef(true);

  const loadSteps = useCallback(async () => {
    const progress = await getQuestStepProgress(quest.id);
    if (!mountedRef.current) return;
    setCompletedStepIds(progress);
    setHydrated(true);
  }, [quest.id]);

  useEffect(() => {
    mountedRef.current = true;
    loadSteps();
    return () => { mountedRef.current = false; };
  }, [loadSteps]);

  const toggleStep = async (stepId: string) => {
    if (loadingStepId) return;
    setLoadingStepId(stepId);

    const isChecked = completedStepIds.has(stepId);
    // Optimistic update
    setCompletedStepIds((prev) => {
      const next = new Set(prev);
      if (isChecked) next.delete(stepId);
      else next.add(stepId);
      return next;
    });

    const result = isChecked
      ? await unmarkQuestStep(quest.id, stepId)
      : await markQuestStep(quest.id, stepId);

    if (!result.success) {
      // Rollback
      setCompletedStepIds((prev) => {
        const next = new Set(prev);
        if (isChecked) next.add(stepId);
        else next.delete(stepId);
        return next;
      });
    }
    setLoadingStepId(null);
  };

  const completedCount = completedStepIds.size;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const difficultyStars = "★".repeat(quest.difficulty) + "☆".repeat(5 - quest.difficulty);

  return (
    <div className="tavern-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-pixel text-[7px] text-tavern-ember uppercase">
          {quest.type === "main" ? "⚔ Main Quest" : "🗡 Side Quest"}
        </span>
        <span className="font-pixel text-[7px] text-retro-lime ml-auto">+{quest.xp_reward} XP</span>
      </div>

      <h2 className="font-pixel text-[11px] text-tavern-gold leading-relaxed mb-1">
        {quest.title}
      </h2>

      <div className="flex items-center gap-3 mb-3">
        <span className="font-pixel text-[8px] text-tavern-ember">{difficultyStars}</span>
        <span className="text-[11px] text-[#bda780]">{quest.category}</span>
        <span className="text-[11px] text-[#bda780]">{quest.duration_label}</span>
      </div>

      {/* Step progress bar */}
      {totalSteps > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-[#bda780] mb-1">
            <span>{completedCount}/{totalSteps} steps</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-black/40 border border-tavern-oak/50">
            <div
              className="h-full bg-tavern-gold transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Step checklist (first 4 steps inline) */}
      {hydrated && steps.length > 0 && (
        <ul className="space-y-1.5 mb-4">
          {steps.slice(0, 4).map((step) => {
            const done = completedStepIds.has(step.id);
            const loading = loadingStepId === step.id;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  disabled={!!loadingStepId}
                  className="flex items-center gap-2 w-full text-left group disabled:cursor-wait"
                >
                  <div
                    className={`w-3.5 h-3.5 border-2 flex-shrink-0 flex items-center justify-center transition-none ${
                      done
                        ? "border-retro-lime bg-retro-darkgreen"
                        : "border-tavern-oak group-hover:border-tavern-parchment"
                    } ${loading ? "opacity-50" : ""}`}
                  >
                    {done && <span className="font-pixel text-[7px] text-retro-lime leading-none">✓</span>}
                  </div>
                  <span
                    className={`text-[11px] leading-tight ${
                      done ? "line-through text-[#7a6a50]" : "text-[#cdb68f] group-hover:text-tavern-parchment"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
          {steps.length > 4 && (
            <li className="text-[10px] text-[#7a6a50]">
              +{steps.length - 4} more — <Link href={`/quests/${quest.id}`} className="underline hover:text-tavern-gold">view all</Link>
            </li>
          )}
        </ul>
      )}

      <Link
        href={`/quests/${quest.id}`}
        className="tavrn-button block text-center"
      >
        Continue Quest →
      </Link>
    </div>
  );
}
