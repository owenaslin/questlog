"use client";

import React from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import { useQuestStepProgress } from "@/lib/hooks/useQuestStepProgress";

interface ActiveQuestPanelProps {
  quest: Quest;
}

export default function ActiveQuestPanel({ quest }: ActiveQuestPanelProps) {
  const steps = quest.steps ?? [];
  const { completedStepIds, loadingStepId, hydrated, toggleStep } = useQuestStepProgress(quest.id);

  const completedCount = completedStepIds.size;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const nextStep = hydrated ? steps.find((step) => !completedStepIds.has(step.id)) ?? null : null;

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
        <span className="text-[11px] text-tavern-parchment-dim">{quest.category}</span>
        <span className="text-[11px] text-tavern-parchment-dim">{quest.duration_label}</span>
      </div>

      {quest.type === "main" && (
        <div className="mb-3 p-3 border border-tavern-oak/60 bg-black/20">
          <p className="font-pixel text-[7px] text-tavern-gold mb-2">Today&apos;s Action</p>
          {steps.length === 0 ? (
            <p className="text-[11px] text-tavern-parchment-dark leading-relaxed">Open the quest and choose the smallest next step.</p>
          ) : nextStep ? (
            <p className="text-[12px] text-tavern-parchment leading-relaxed">{nextStep.title}</p>
          ) : (
            <p className="text-[12px] text-retro-lime leading-relaxed">All steps are checked. Finish the quest when you&apos;re ready.</p>
          )}
        </div>
      )}

      {/* Step progress bar */}
      {totalSteps > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-tavern-parchment-dim mb-1">
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
                      done ? "line-through text-tavern-oak" : "text-tavern-parchment-dark group-hover:text-tavern-parchment"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
          {steps.length > 4 && (
            <li className="text-[10px] text-tavern-oak">
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
