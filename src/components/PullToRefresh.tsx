"use client";

import React, { useState, useCallback } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

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

  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  const bind = useDrag(
    ({ movement: [, my], velocity: [, vy], down, first, last }) => {
      // Only enable on mobile and when at top of scroll
      if (disabled || window.innerWidth >= 768) return;
      if (window.scrollY > 0) return;

      if (first) {
        setPullProgress(0);
      }

      // Calculate progress (0-1)
      const progress = Math.min(Math.max(my / THRESHOLD, 0), 1);
      setPullProgress(progress);

      if (last) {
        if (my > THRESHOLD && !isRefreshing) {
          // Trigger refresh
          setIsRefreshing(true);
          api.start({ y: THRESHOLD });
          
          onRefresh().finally(() => {
            setIsRefreshing(false);
            api.start({ y: 0 });
            setPullProgress(0);
          });
        } else {
          // Cancel pull
          api.start({ y: 0 });
          setPullProgress(0);
        }
      } else {
        // Still pulling
        const pullY = Math.min(my, MAX_PULL);
        api.start({ y: down ? pullY : 0, immediate: down });
      }
    },
    {
      axis: "y",
      bounds: { top: 0, bottom: MAX_PULL },
      rubberband: true,
      from: () => [0, y.get()],
    }
  );

  // Tavern-themed refresh indicator (filling mug)
  const mugFillHeight = Math.min(pullProgress * 100, 100);

  return (
    <div className="relative" {...bind()}>
      {/* Pull indicator */}
      <animated.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center overflow-hidden"
        style={{
          height: y.to((val) => Math.max(val, 0)),
          opacity: y.to((val) => Math.min(val / 40, 1)),
        }}
      >
        <div className="flex flex-col items-center">
          {/* Mug icon with fill animation */}
          <div className="relative w-8 h-8 border-2 border-tavern-oak bg-tavern-smoke rounded-b-lg overflow-hidden">
            <animated.div
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
      </animated.div>

      {/* Content with transform */}
      <animated.div style={{ y }}>
        {children}
      </animated.div>
    </div>
  );
}
