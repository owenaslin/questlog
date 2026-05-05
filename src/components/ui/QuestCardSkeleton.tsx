"use client";

import React from "react";

interface QuestCardSkeletonProps {
  count?: number;
}

export default function QuestCardSkeleton({ count = 3 }: QuestCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="
            bg-retro-darkgray border-4 border-retro-black
            p-4 flex flex-col gap-3
            animate-pulse
          "
        >
          {/* Header badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-16 bg-retro-black" />
            <div className="h-5 w-12 bg-retro-black" />
          </div>

          {/* Title */}
          <div className="h-4 w-3/4 bg-retro-black" />

          {/* Description lines */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-retro-black" />
            <div className="h-3 w-2/3 bg-retro-black" />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3 w-2 bg-retro-black" />
              ))}
            </div>
            <div className="h-3 w-10 bg-retro-black" />
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-retro-black" />
            <div className="h-5 w-20 bg-retro-black" />
          </div>
        </div>
      ))}
    </>
  );
}
