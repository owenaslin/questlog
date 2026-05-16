"use client";

import React from "react";
import Link from "next/link";
import { Questline } from "@/lib/types";
import { getCategoryByKey } from "@/lib/quests";
import PixelButton from "@/components/ui/PixelButton";

interface QuestlineCardProps {
  questline: Questline;
}

export default function QuestlineCard({ questline }: QuestlineCardProps) {
  const category = getCategoryByKey(questline.category);
  const completedSteps = questline.progress?.completed_steps || 0;
  const totalSteps = questline.steps?.length || 0;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isCompleted = questline.progress?.is_completed || false;
  const isStarted = completedSteps > 0;

  return (
    <div
      className={`
        bg-retro-darkgray border-4 
        ${isCompleted ? "border-retro-yellow shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "border-retro-black shadow-pixel"}
        p-5 flex flex-col gap-4
        transition-all duration-200 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pixel-lg
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Category Icon */}
          <div
            className="w-12 h-12 border-4 border-retro-black flex items-center justify-center text-2xl"
            style={{ backgroundColor: category?.color || "#6b7280" }}
          >
            {category?.icon || "📜"}
          </div>
          
          <div>
            {/* Type Badge */}
            <span className={`badge ${questline.type === "linear" ? "badge-blue" : "badge-purple"}`}>
              {questline.type === "linear" ? "📋 Linear" : "🌳 Skill Tree"}
            </span>
            <span className="badge badge-muted ml-2">{questline.difficulty}</span>

            <h3 className="text-subhead text-retro-yellow mt-2 leading-tight">
              {questline.title}
            </h3>
          </div>
        </div>

        {/* Completion Badge */}
        {isCompleted && (
          <div className="bg-retro-yellow border-2 border-retro-black px-2 py-1">
            <span className="kicker text-retro-black">✓ COMPLETE</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-body-sm text-retro-lightgray leading-relaxed">
        {questline.description}
      </p>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="kicker">Progress</span>
          <span className="text-body-sm text-retro-cyan">{completedSteps}/{totalSteps} Steps</span>
        </div>
        <div className="w-full h-3 bg-retro-black border-2 border-retro-darkgray">
          <div
            className={`h-full transition-all duration-500 ${
              isCompleted ? "bg-retro-yellow" : "bg-retro-lime"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between py-2 border-t-2 border-b-2 border-retro-black">
        <div className="text-center">
          <span className="kicker block mb-1">Category</span>
          <span className="text-body-sm text-retro-lightgray">{questline.category}</span>
        </div>
        <div className="text-center">
          <span className="kicker block mb-1">Total XP</span>
          <span className="badge badge-lime">+{questline.total_xp}</span>
        </div>
        <div className="text-center">
          <span className="kicker block mb-1">Reward</span>
          <span className="text-body-sm text-retro-yellow">
            {questline.badge_reward ? "🏅 Badge" : "None"}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <Link href={`/questlines/${questline.id}`} className="mt-auto">
        <PixelButton
          variant={isCompleted ? "secondary" : isStarted ? "primary" : "success"}
          size="md"
          className="w-full"
        >
          {isCompleted ? "View Completed" : isStarted ? "Continue" : "Start Questline"}
        </PixelButton>
      </Link>
    </div>
  );
}
