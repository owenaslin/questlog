"use client";

import React from "react";
import Link from "next/link";
import { Questline, QuestlineStep } from "@/lib/types";
import PixelButton from "./PixelButton";

interface QuestlineProgressProps {
  questline: Questline;
  onStepClick?: (step: QuestlineStep) => void;
}

export default function QuestlineProgress({ questline, onStepClick }: QuestlineProgressProps) {
  if (questline.type === "linear") {
    return <LinearProgress steps={questline.steps} onStepClick={onStepClick} />;
  }
  
  return <SkillTreeProgress steps={questline.steps} onStepClick={onStepClick} />;
}

// Linear questline - horizontal progress
function LinearProgress({
  steps,
  onStepClick,
}: {
  steps: QuestlineStep[];
  onStepClick?: (step: QuestlineStep) => void;
}) {
  const sortedSteps = [...steps].sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

  return (
    <div className="flex flex-col gap-4">
      {sortedSteps.map((step, index) => {
        const isLast = index === sortedSteps.length - 1;
        const quest = step.quest;

        if (!quest) return null;

        return (
          <div key={step.id} className="flex items-start gap-4">
            {/* Step Node */}
            <StepNode step={step} />

            {/* Step Card */}
            <div className="flex-1">
              <div
                onClick={() => onStepClick?.(step)}
                className={`
                  bg-retro-darkgray border-4 
                  ${step.is_completed ? "border-retro-green" : step.is_unlocked ? "border-retro-black" : "border-retro-gray"}
                  p-4
                  ${onStepClick && step.is_unlocked ? "cursor-pointer hover:shadow-pixel transition-shadow" : ""}
                  ${!step.is_unlocked ? "opacity-60" : ""}
                `}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-pixel text-retro-yellow text-xs">
                    Step {step.step_number}: {quest.title}
                  </h4>
                  <StepStatusBadge step={step} />
                </div>

                <p className="font-pixel text-retro-lightgray text-[8px] leading-relaxed mb-3">
                  {step.is_unlocked || step.is_completed
                    ? quest.description
                    : "Complete the previous step to unlock."}
                </p>

                <div className="flex items-center justify-between">
                  <span className="font-pixel text-retro-lime text-[8px]">
                    +{quest.xp_reward} XP
                  </span>
                  <span className="font-pixel text-retro-cyan text-[8px]">
                    {quest.duration_label}
                  </span>
                </div>

                {step.is_unlocked && !step.is_completed && (
                  <Link href={`/quests/${quest.id}`} className="mt-3 block">
                    <PixelButton variant="primary" size="sm">
                      Accept Quest
                    </PixelButton>
                  </Link>
                )}
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex justify-center py-2">
                  <div
                    className={`
                      w-[2px] h-6
                      ${step.is_completed ? "bg-retro-green" : "bg-retro-darkgray"}
                    `}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Skill tree - branching layout (fully dynamic — no hardcoded branch names or column counts)
function SkillTreeProgress({
  steps,
  onStepClick,
}: {
  steps: QuestlineStep[];
  onStepClick?: (step: QuestlineStep) => void;
}) {
  const rootStep = steps.find((s) => s.is_starting_step);
  const rootCompleted = rootStep?.is_completed ?? false;

  // Extract unique branch names in order of first appearance from step data.
  const branches = Array.from(
    new Set(steps.filter((s) => s.branch_name).map((s) => s.branch_name!))
  );

  if (!rootStep && branches.length === 0) {
    return (
      <p className="font-pixel text-retro-gray text-[8px]">No steps defined.</p>
    );
  }

  const lineColor = rootCompleted ? "bg-retro-green" : "bg-retro-darkgray";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Root Node */}
      {rootStep && (
        <div className="w-full max-w-md">
          <SkillTreeNode step={rootStep} onStepClick={onStepClick} isRoot />
        </div>
      )}

      {/* Connector: vertical drop → full-width horizontal bar → per-branch drops */}
      {branches.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className={`w-[2px] h-6 ${lineColor}`} />
          <div className={`w-full h-[2px] ${lineColor}`} />
          <div className="w-full flex justify-around">
            {branches.map((b) => (
              <div key={b} className={`w-[2px] h-4 ${lineColor}`} />
            ))}
          </div>
        </div>
      )}

      {/* Branch Columns — horizontal-scroll on narrow screens */}
      {branches.length > 0 && (
        <div className="w-full overflow-x-auto">
          <div
            className="grid gap-4 min-w-[480px] sm:min-w-0"
            style={{ gridTemplateColumns: `repeat(${branches.length}, minmax(0, 1fr))` }}
          >
            {branches.map((branch) => {
              const branchSteps = steps
                .filter((s) => s.branch_name === branch)
                .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

              return (
                <div key={branch} className="flex flex-col items-center gap-2">
                  <h4 className="font-pixel text-retro-cyan text-[8px] uppercase tracking-wider text-center mb-1">
                    {branch}
                  </h4>
                  {branchSteps.map((step, index) => (
                    <div key={step.id} className="w-full">
                      <SkillTreeNode step={step} onStepClick={onStepClick} />
                      {index < branchSteps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div
                            className={`w-[2px] h-4 ${
                              step.is_completed ? "bg-retro-green" : "bg-retro-darkgray"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Step Node (circle indicator)
function StepNode({ step }: { step: QuestlineStep }) {
  return (
    <div
      className={`
        w-10 h-10 border-4 flex items-center justify-center flex-shrink-0
        ${
          step.is_completed
            ? "border-retro-green bg-retro-green text-retro-black"
            : step.is_unlocked
            ? "border-retro-lime bg-retro-darkgray text-retro-lime"
            : "border-retro-darkgray bg-retro-darkgray text-retro-gray"
        }
      `}
    >
      <span className="font-pixel text-sm">
        {step.is_completed ? "✓" : step.is_unlocked ? "○" : "●"}
      </span>
    </div>
  );
}

// Skill tree node (card style)
function SkillTreeNode({
  step,
  onStepClick,
  isRoot = false,
}: {
  step: QuestlineStep;
  onStepClick?: (step: QuestlineStep) => void;
  isRoot?: boolean;
}) {
  const quest = step.quest;
  if (!quest) return null;

  return (
    <div
      onClick={() => onStepClick?.(step)}
      className={`
        bg-retro-darkgray border-4 p-3
        ${step.is_completed ? "border-retro-green" : step.is_unlocked ? "border-retro-black" : "border-retro-gray"}
        ${onStepClick && step.is_unlocked ? "cursor-pointer hover:shadow-pixel transition-shadow" : ""}
        ${!step.is_unlocked ? "opacity-60" : ""}
        ${isRoot ? "w-full max-w-md mx-auto" : ""}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <StepNode step={step} />
        <h4 className="font-pixel text-retro-yellow text-xs">{quest.title}</h4>
      </div>

      {(step.is_unlocked || step.is_completed) && (
        <p className="font-pixel text-retro-lightgray text-[8px] leading-relaxed line-clamp-2">
          {quest.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="font-pixel text-retro-lime text-[7px]">+{quest.xp_reward} XP</span>
        <StepStatusBadge step={step} small />
      </div>
    </div>
  );
}

// Status badge
function StepStatusBadge({ step, small = false }: { step: QuestlineStep; small?: boolean }) {
  const className = small ? "text-[6px] px-1 py-0.5" : "text-[8px] px-2 py-1";

  if (step.is_completed) {
    return (
      <span className={`font-pixel ${className} bg-retro-green text-retro-black`}>
        ✓ Done
      </span>
    );
  }

  if (step.is_unlocked) {
    return (
      <span className={`font-pixel ${className} bg-retro-lime text-retro-black`}>
        ▶ Available
      </span>
    );
  }

  return (
    <span className={`font-pixel ${className} bg-retro-darkgray text-retro-gray`}>
      🔒 Locked
    </span>
  );
}
