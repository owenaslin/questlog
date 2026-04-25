"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useDragControls } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  const y = useMotionValue(0);
  const indicatorHeight = useTransform(y, (val) => Math.max(val, 0));
  const indicatorOpacity = useTransform(y, (val) => Math.min(val / 40, 1));

  const handleDrag = (_: unknown, info: { offset: { y: number } }) => {
    // Only enable on mobile and when at top of scroll
    if (disabled || typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (window.scrollY > 0) return;

    const pullY = Math.max(0, info.offset.y);
    const progress = Math.min(Math.max(pullY / THRESHOLD, 0), 1);
    setPullProgress(progress);
  };

  const handleDragEnd = async (_: unknown, info: { offset: { y: number } }) => {
    if (disabled || typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;

    const pullY = info.offset.y;

    if (pullY > THRESHOLD && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      y.set(THRESHOLD);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        y.set(0);
        setPullProgress(0);
      }
    } else {
      // Cancel pull
      y.set(0);
      setPullProgress(0);
    }
  };

  // Tavern-themed refresh indicator (filling mug)
  const mugFillHeight = Math.min(pullProgress * 100, 100);

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center overflow-hidden"
        style={{ height: indicatorHeight, opacity: indicatorOpacity }}
      >
        <div className="flex flex-col items-center">
          {/* Mug icon with fill animation */}
          <div className="relative w-8 h-8 border-2 border-tavern-oak bg-tavern-smoke rounded-b-lg overflow-hidden">
            <div
              className="absolute bottom-0 left-0 right-0 bg-tavern-gold transition-all"
              style={{ height: `${mugFillHeight}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs">
              {isRefreshing ? "✨" : "🍺"}
            </span>
          </div>
          <span className="font-pixel text-[8px] text-tavern-gold mt-2">
            {isRefreshing ? "Refreshing..." : pullProgress > 1 ? "Release!" : "Pull to refresh"}
          </span>
        </div>
      </motion.div>

      {/* Content with drag */}
      <motion.div
        drag={disabled ? false : "y"}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: MAX_PULL }}
        dragElastic={0.3}
        dragDirectionLock
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
