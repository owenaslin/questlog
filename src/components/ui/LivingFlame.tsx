"use client";

import React from "react";

interface LivingFlameProps {
  streakDays: number;
  size?: "sm" | "md" | "lg";
}

interface FlameState {
  color: string;
  glowColor: string;
  scale: number;
  animationSpeed: number;
  name: string;
}

const FLAME_STATES: Record<number, FlameState> = {
  0: {
    color: "#4b5563",
    glowColor: "rgba(75, 85, 99, 0.3)",
    scale: 0.5,
    animationSpeed: 0,
    name: "Ember",
  },
  1: {
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.4)",
    scale: 0.7,
    animationSpeed: 3,
    name: "Flicker",
  },
  7: {
    color: "#fb923c",
    glowColor: "rgba(251, 146, 60, 0.5)",
    scale: 0.85,
    animationSpeed: 2,
    name: "Flame",
  },
  30: {
    color: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.6)",
    scale: 1,
    animationSpeed: 1.5,
    name: "Inferno",
  },
  100: {
    color: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.8)",
    scale: 1.2,
    animationSpeed: 1,
    name: "Eternal",
  },
};

function getFlameState(streakDays: number): FlameState {
  if (streakDays >= 100) return FLAME_STATES[100];
  if (streakDays >= 30) return FLAME_STATES[30];
  if (streakDays >= 7) return FLAME_STATES[7];
  if (streakDays >= 1) return FLAME_STATES[1];
  return FLAME_STATES[0];
}

const sizeClasses = {
  sm: { container: "w-12 h-12", flame: "w-6 h-8" },
  md: { container: "w-16 h-16", flame: "w-8 h-10" },
  lg: { container: "w-24 h-24", flame: "w-12 h-16" },
};

export default function LivingFlame({ streakDays, size = "md" }: LivingFlameProps) {
  const state = getFlameState(streakDays);
  const classes = sizeClasses[size];

  if (streakDays === 0) {
    return (
      <div className={`${classes.container} flex items-center justify-center`}>
        <div
          className="rounded-full bg-gray-600 opacity-30"
          style={{ width: "30%", height: "30%" }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${classes.container} relative flex items-center justify-center`}
      style={{
        filter: `drop-shadow(0 0 ${10 * state.scale}px ${state.glowColor})`,
      }}
    >
      {/* Glow background */}
      <div
        className="absolute rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${state.glowColor} 0%, transparent 70%)`,
          width: "120%",
          height: "120%",
          animation: `pulse ${state.animationSpeed}s infinite`,
        }}
      />

      {/* Main flame body */}
      <div
        className="relative"
        style={{
          width: classes.flame.split(" ")[0].replace("w-", ""),
          height: classes.flame.split(" ")[1].replace("h-", ""),
          animation: `flame-flicker ${state.animationSpeed * 0.5}s infinite ease-in-out`,
        }}
      >
        {/* Flame SVG */}
        <svg
          viewBox="0 0 24 32"
          fill="none"
          className="w-full h-full"
          style={{ filter: `drop-shadow(0 0 8px ${state.color})` }}
        >
          <path
            d="M12 2C12 2 6 8 6 16C6 22 8 26 12 30C16 26 18 22 18 16C18 8 12 2 12 2Z"
            fill={state.color}
          />
          {/* Inner core */}
          <path
            d="M12 8C12 8 9 12 9 17C9 21 10 24 12 26C14 24 15 21 15 17C15 12 12 8 12 8Z"
            fill={streakDays >= 30 ? "#ffffff" : "#fef3c7"}
            opacity={0.8}
          />
        </svg>
      </div>

      {/* Flame name label (only for lg size) */}
      {size === "lg" && (
        <div className="absolute -bottom-6 text-center">
          <span
            className="kicker"
            style={{ color: state.color }}
          >
            {state.name}
          </span>
        </div>
      )}
    </div>
  );
}
