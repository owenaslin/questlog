"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LivingFlameProps {
  streakDays: number;
  size?: "sm" | "md" | "lg";
}

interface FlameState {
  color: string;
  glowColor: string;
  scale: number;
  particleCount: number;
  animationSpeed: number;
  name: string;
}

const FLAME_STATES: Record<number, FlameState> = {
  0: {
    color: "#4b5563",
    glowColor: "rgba(75, 85, 99, 0.3)",
    scale: 0.5,
    particleCount: 0,
    animationSpeed: 0,
    name: "Ember",
  },
  1: {
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.4)",
    scale: 0.7,
    particleCount: 3,
    animationSpeed: 3,
    name: "Flicker",
  },
  7: {
    color: "#fb923c",
    glowColor: "rgba(251, 146, 60, 0.5)",
    scale: 0.85,
    particleCount: 6,
    animationSpeed: 2,
    name: "Flame",
  },
  30: {
    color: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.6)",
    scale: 1,
    particleCount: 12,
    animationSpeed: 1.5,
    name: "Inferno",
  },
  100: {
    color: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.8)",
    scale: 1.2,
    particleCount: 20,
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

interface Particle {
  width: number;
  height: number;
  left: string;
  animY: number[];
  animX: number[];
  duration: number;
  delay: number;
}

export default function LivingFlame({ streakDays, size = "md" }: LivingFlameProps) {
  const state = getFlameState(streakDays);
  const classes = sizeClasses[size];

  // Particle random values are computed client-side only to avoid SSR/hydration
  // mismatches (same pattern used by ParticleLayer.tsx in this codebase).
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    if (state.particleCount === 0) { setParticles([]); return; }
    setParticles(
      Array.from({ length: state.particleCount }, (_, i) => ({
        width:    2 + Math.random() * 3,
        height:   2 + Math.random() * 3,
        left:     `${20 + Math.random() * 60}%`,
        animY:    [-10, -40 - Math.random() * 30],
        animX:    [(i % 2 === 0 ? 1 : -1) * Math.random() * 10, 0],
        duration: 1 + Math.random() * 2,
        delay:    Math.random() * 2,
      }))
    );
  }, [state.particleCount]);

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
      <motion.div
        className="absolute rounded-full"
        style={{
          background: `radial-gradient(circle, ${state.glowColor} 0%, transparent 70%)`,
          width: "120%",
          height: "120%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: state.animationSpeed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main flame body */}
      <motion.div
        className="relative"
        style={{
          width: classes.flame.split(" ")[0].replace("w-", ""),
          height: classes.flame.split(" ")[1].replace("h-", ""),
        }}
        animate={{
          scaleY: [1, 1.1, 0.95, 1],
          scaleX: [1, 0.95, 1.05, 1],
        }}
        transition={{
          duration: state.animationSpeed * 0.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Flame SVG */}
        <svg
          viewBox="0 0 24 32"
          fill="none"
          className="w-full h-full"
          style={{ filter: `drop-shadow(0 0 8px ${state.color})` }}
        >
          <motion.path
            d="M12 2C12 2 6 8 6 16C6 22 8 26 12 30C16 26 18 22 18 16C18 8 12 2 12 2Z"
            fill={state.color}
            animate={{
              d: [
                "M12 2C12 2 6 8 6 16C6 22 8 26 12 30C16 26 18 22 18 16C18 8 12 2 12 2Z",
                "M12 2C12 2 5 9 5 16C5 21 8 25 12 29C16 25 19 21 19 16C19 9 12 2 12 2Z",
                "M12 2C12 2 7 7 7 16C7 23 9 27 12 30C15 27 17 23 17 16C17 7 12 2 12 2Z",
                "M12 2C12 2 6 8 6 16C6 22 8 26 12 30C16 26 18 22 18 16C18 8 12 2 12 2Z",
              ],
            }}
            transition={{
              duration: state.animationSpeed * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Inner core */}
          <motion.path
            d="M12 8C12 8 9 12 9 17C9 21 10 24 12 26C14 24 15 21 15 17C15 12 12 8 12 8Z"
            fill={streakDays >= 30 ? "#ffffff" : "#fef3c7"}
            opacity={0.8}
            animate={{
              d: [
                "M12 8C12 8 9 12 9 17C9 21 10 24 12 26C14 24 15 21 15 17C15 12 12 8 12 8Z",
                "M12 8C12 8 8 13 8 17C8 20 10 23 12 25C14 23 16 20 16 17C16 13 12 8 12 8Z",
                "M12 8C12 8 10 11 10 17C10 22 11 25 12 27C13 25 14 22 14 17C14 11 12 8 12 8Z",
                "M12 8C12 8 9 12 9 17C9 21 10 24 12 26C14 24 15 21 15 17C15 12 12 8 12 8Z",
              ],
            }}
            transition={{
              duration: state.animationSpeed * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </motion.div>

      {/* Floating particles — rendered from useEffect state to avoid SSR mismatch */}
      {particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.width,
                height: p.height,
                backgroundColor: state.color,
                left: p.left,
                bottom: "20%",
              }}
              animate={{
                y: p.animY,
                x: p.animX,
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Flame name label (only for lg size) */}
      {size === "lg" && (
        <div className="absolute -bottom-6 text-center">
          <span
            className="font-pixel text-[7px] uppercase tracking-wider"
            style={{ color: state.color }}
          >
            {state.name}
          </span>
        </div>
      )}
    </div>
  );
}
