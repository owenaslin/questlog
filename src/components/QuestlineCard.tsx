"use client";

import React from "react";
import Link from "next/link";
import { Questline } from "@/lib/types";
import { getCategoryByKey } from "@/lib/quests";
import PixelButton from "./PixelButton";

interface QuestlineCardProps {
  questline: Questline;
  onStart?: () => void;
}

export default function QuestlineCard({ questline, onStart }: QuestlineCardProps) {
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
            <span
              className={`
                mobile-caption px-2 py-1 uppercase tracking-wider
                ${questline.type === "linear"
                  ? "bg-retro-blue text-retro-white"
                  : "bg-retro-purple text-retro-white"}
              `}
            >
              {questline.type === "linear" ? "📋 Linear" : "🌳 Skill Tree"}
            </span>

            {/* Difficulty */}
            <span className="mobile-caption px-2 py-1 bg-retro-darkgray text-retro-lightgray uppercase ml-2">
              {questline.difficulty}
            </span>
            
            <h3 className="font-pixel text-retro-yellow text-sm mt-2 leading-tight">
              {questline.title}
            </h3>
          </div>
        </div>

        {/* Completion Badge */}
        {isCompleted && (
          <div className="bg-retro-yellow border-2 border-retro-black px-2 py-1">
            <span className="mobile-caption text-retro-black">✓ COMPLETE</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="mobile-body text-retro-lightgray leading-relaxed">
        {questline.description}
      </p>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="mobile-caption text-retro-gray">
            Progress
          </span>
          <span className="mobile-caption text-retro-cyan">
            {completedSteps}/{totalSteps} Steps
          </span>
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
          <span className="mobile-label text-retro-gray block">Category</span>
          <span className="mobile-caption text-retro-lightgray">
            {questline.category}
          </span>
        </div>
        <div className="text-center">
          <span className="mobile-label text-retro-gray block">Total XP</span>
          <span className="mobile-caption text-retro-lime">
            +{questline.total_xp}
          </span>
        </div>
        <div className="text-center">
          <span className="mobile-label text-retro-gray block">Reward</span>
          <span className="mobile-caption text-retro-yellow">
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
