"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { Quest } from "@/lib/types";
import { getCategoryByKey } from "@/lib/quests";

interface SwipeableQuestCardProps {
  quest: Quest;
  onAccept?: (questId: string) => void;
  onComplete?: (questId: string) => void;
}

export default function SwipeableQuestCard({
  quest,
  onAccept,
  onComplete,
}: SwipeableQuestCardProps) {
  const [{ x }, api] = useSpring(() => ({ x: 0 }));
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], down, cancel }) => {
      // Only enable on mobile
      if (window.innerWidth >= 768) return;

      const trigger = Math.abs(mx) > 100 || Math.abs(vx) > 0.5;

      if (!down && trigger) {
        // Swipe completed
        if (dx > 0 && onAccept) {
          // Right swipe - accept
          onAccept(quest.id);
          if (navigator.vibrate) navigator.vibrate(50);
        } else if (dx < 0 && onComplete) {
          // Left swipe - complete
          onComplete(quest.id);
          if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
        }
        api.start({ x: 0 });
        setSwipeDirection(null);
      } else {
        // Still dragging
        api.start({
          x: down ? mx : 0,
          immediate: down,
        });
        setSwipeDirection(mx > 30 ? "right" : mx < -30 ? "left" : null);
      }
    },
    {
      axis: "x",
      bounds: { left: -150, right: 150 },
      rubberband: true,
    }
  );

  const categoryData = getCategoryByKey(quest.category);

  return (
    <div className="relative overflow-hidden md:overflow-visible">
      {/* Swipe action backgrounds */}
      <div
        className={`absolute inset-y-0 left-0 w-full flex items-center px-4 rounded-lg transition-opacity duration-200 ${
          swipeDirection === "right" ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "#38b764" }}
      >
        <span className="font-pixel text-retro-white text-sm">⚔ Accept</span>
      </div>
      <div
        className={`absolute inset-y-0 right-0 w-full flex items-center justify-end px-4 rounded-lg transition-opacity duration-200 ${
          swipeDirection === "left" ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "#b13e53" }}
      >
        <span className="font-pixel text-retro-white text-sm">Complete ✓</span>
      </div>

      {/* Card content */}
      <animated.div
        {...bind()}
        className="relative bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4 md:cursor-default touch-pan-y"
        style={{ x }}
      >
        <Link href={`/quests/${quest.id}`} className="block focus-visible:outline-none">
          <div className="flex items-start gap-3">
            {/* Category icon */}
            <span
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-sm border-2 border-retro-black"
              style={{ backgroundColor: categoryData?.color || "#6b7280" }}
            >
              {categoryData?.icon || "📜"}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`font-pixel text-[7px] px-1.5 py-0.5 ${
                    quest.type === "main"
                      ? "bg-retro-red text-retro-white"
                      : "bg-retro-blue text-retro-white"
                  }`}
                >
                  {quest.type === "main" ? "⚔" : "🗡"}
                </span>
                <h3 className="font-pixel text-retro-yellow text-xs truncate">
                  {quest.title}
                </h3>
              </div>

              <p className="text-retro-lightgray text-[10px] font-pixel line-clamp-1 mb-2">
                {quest.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="font-pixel text-retro-cyan text-[8px]">
                  {quest.duration_label}
                </span>
                <span className="font-pixel text-retro-lime text-[8px]">
                  +{quest.xp_reward} XP
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Swipe hint for first-time users */}
        <div className="md:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-40">
          <span className="text-[8px]">←</span>
          <span className="font-pixel text-[6px]">SWIPE</span>
          <span className="text-[8px]">→</span>
        </div>
      </animated.div>
    </div>
  );
}
