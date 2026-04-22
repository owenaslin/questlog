"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface StreakWarningBannerProps {
  streakDays: number;
}

export default function StreakWarningBanner({ streakDays }: StreakWarningBannerProps) {
  const todayKey = `streakWarningDismissed_${new Date().toISOString().slice(0, 10)}`;
  const [dismissed, setDismissed] = useState(false);

  // Check if already dismissed today (SSR-safe: only run on client)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(todayKey) === "true");
    }
  }, [todayKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(todayKey, "true");
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-4 mb-6"
      style={{ border: "2px solid #c44a36", background: "#1a0d05" }}
      role="alert"
    >
      <span className="text-xl flex-shrink-0" aria-hidden>⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="font-pixel text-tavern-ember text-[8px] leading-loose">
          Your {streakDays}-day streak is at risk!
        </p>
        <p className="font-pixel text-tavern-smoke-light text-[7px] leading-loose mt-0.5">
          Complete any quest before midnight to keep it alive.
        </p>
        <Link
          href="/board"
          className="font-pixel text-tavern-gold text-[7px] hover:text-tavern-candle mt-1 inline-block"
        >
          ⚔ Browse The Board →
        </Link>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="font-pixel text-tavern-smoke-light text-[8px] hover:text-tavern-parchment flex-shrink-0 px-1"
        aria-label="Dismiss streak warning"
      >
        ✕
      </button>
    </div>
  );
}
