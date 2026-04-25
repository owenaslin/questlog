"use client";

import React, { useEffect, useRef, useState } from "react";
import { Milestone, getMilestoneColor } from "@/lib/milestones";

interface MilestoneCelebrationProps {
  milestones: Milestone[];
  onComplete: () => void;
}

export default function MilestoneCelebration({
  milestones,
  onComplete,
}: MilestoneCelebrationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  // Track the final auto-close timer so it can be cancelled on unmount.
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (milestones.length === 0) return;
    setShowParticles(true);
    const timer = setTimeout(() => {
      if (currentIndex < milestones.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        finalTimerRef.current = setTimeout(onComplete, 2000);
      }
    }, 4000);
    return () => {
      clearTimeout(timer);
      if (finalTimerRef.current) {
        clearTimeout(finalTimerRef.current);
        finalTimerRef.current = null;
      }
    };
  }, [currentIndex, milestones.length, onComplete]);

  if (milestones.length === 0) {
    return null;
  }

  const currentMilestone = milestones[currentIndex];
  const color = getMilestoneColor(currentMilestone.rarity);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(10,8,5,0.95)" }}
    >
      {/* Main Content */}
      <div className="text-center px-4"
        >
          {/* Rarity Badge */}
          <div className="mb-4"
          >
            <span
              className="font-pixel text-[8px] px-3 py-1 border-2"
              style={{ color, borderColor: color }}
            >
              {currentMilestone.rarity.toUpperCase()} MILESTONE
            </span>
          </div>

          {/* Icon based on type */}
          <div className="text-6xl mb-4"
          >
            {getMilestoneEmoji(currentMilestone.type)}
          </div>

          {/* Title */}
          <h2 className="font-pixel text-2xl mb-3"
            style={{ color }}
          >
            {currentMilestone.title}
          </h2>

          {/* Description */}
          <p className="font-pixel text-tavern-parchment text-[10px] leading-relaxed max-w-md mx-auto"
          >
            {currentMilestone.description}
          </p>

          {/* Progress dots for multiple milestones */}
          {milestones.length > 1 && (
            <div className="flex justify-center gap-2 mt-6"
            >
              {milestones.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentIndex ? "bg-tavern-gold" : "bg-tavern-smoke"
                  }`}
                />
              ))}
            </div>
          )}
      </div>

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 font-pixel text-tavern-smoke-light text-[8px] hover:text-tavern-parchment"
      >
        Press to skip →
      </button>
    </div>
  );
}

function getMilestoneEmoji(type: Milestone["type"]): string {
  switch (type) {
    case "streak":
      return "🔥";
    case "category_mastery":
      return "🏆";
    case "level_up":
      return "⬆️";
    case "first_quest":
      return "⚔️";
    case "total_quests":
      return "📜";
    default:
      return "✨";
  }
}

