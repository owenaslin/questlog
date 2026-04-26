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
            bg-tavern-cream-2 border-4 border-tavern-stroke
            p-4 flex flex-col gap-3
            animate-pulse
          "
        >
          {/* Header badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-16 bg-tavern-stroke" />
            <div className="h-5 w-12 bg-tavern-stroke" />
          </div>

          {/* Title */}
          <div className="h-4 w-3/4 bg-tavern-stroke" />

          {/* Description lines */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-tavern-stroke" />
            <div className="h-3 w-2/3 bg-tavern-stroke" />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3 w-2 bg-tavern-stroke" />
              ))}
            </div>
            <div className="h-3 w-10 bg-tavern-stroke" />
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-tavern-stroke" />
            <div className="h-5 w-20 bg-tavern-stroke" />
          </div>
        </div>
      ))}
    </>
  );
}
