"use client";

import React from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import { useQuestStepProgress } from "@/lib/hooks/useQuestStepProgress";

interface SideQuestProgressCardProps {
  quest: Quest;
}

export default function SideQuestProgressCard({ quest }: SideQuestProgressCardProps) {
  const steps = quest.steps ?? [];
  const { completedStepIds, hydrated } = useQuestStepProgress(quest.id);

  const completedCount = completedStepIds.size;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const nextStep = hydrated ? steps.find((s) => !completedStepIds.has(s.id)) ?? null : null;

  return (
    <Link
      href={`/board/${quest.id}`}
      className="block tavern-card p-3 md:p-4 hover:border-tavern-gold/50 group transition-none"
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="badge badge-lime ml-auto">+{quest.xp_reward} XP</span>
      </div>

      {/* Title */}
      <p className="text-body-sm font-semibold text-tavern-parchment group-hover:text-tavern-gold leading-snug mb-1">
        {quest.title}
      </p>

      {/* Meta */}
      <p className="text-[11px] text-[--parchment-dim] mb-2">
        {quest.category}
        {quest.duration_label ? ` · ${quest.duration_label}` : ""}
      </p>

      {/* Step progress */}
      {totalSteps > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-[11px] text-[--parchment-dim] mb-1">
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

      {/* Next step hint */}
      {hydrated && nextStep && (
        <p className="text-[11px] text-[--parchment-dim] leading-snug mb-2 truncate">
          <span className="text-tavern-gold">Next:</span> {nextStep.title}
        </p>
      )}

      {/* Continue arrow */}
      <div className="flex justify-end">
        <span className="text-body-sm text-tavern-gold opacity-60 group-hover:opacity-100 transition-opacity">
          Continue →
        </span>
      </div>
    </Link>
  );
}
