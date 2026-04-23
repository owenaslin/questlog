"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      {/* Particle Effects */}
      {showParticles && <ParticleField rarity={currentMilestone.rarity} />}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMilestone.title}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center px-4"
        >
          {/* Rarity Badge */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <span
              className="font-pixel text-[8px] px-3 py-1 border-2"
              style={{ color, borderColor: color }}
            >
              {currentMilestone.rarity.toUpperCase()} MILESTONE
            </span>
          </motion.div>

          {/* Icon based on type */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            className="text-6xl mb-4"
          >
            {getMilestoneEmoji(currentMilestone.type)}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-pixel text-2xl mb-3"
            style={{ color }}
          >
            {currentMilestone.title}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-pixel text-tavern-parchment text-[10px] leading-relaxed max-w-md mx-auto"
          >
            {currentMilestone.description}
          </motion.p>

          {/* Progress dots for multiple milestones */}
          {milestones.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center gap-2 mt-6"
            >
              {milestones.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentIndex ? "bg-tavern-gold" : "bg-tavern-smoke"
                  }`}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

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

function ParticleField({ rarity }: { rarity: Milestone["rarity"] }) {
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    setViewportHeight(window.innerHeight);
  }, []);

  const particleCount = rarity === "legendary" ? 50 : rarity === "epic" ? 30 : 15;
  const colors =
    rarity === "legendary"
      ? ["#fbbf24", "#f59e0b", "#fcd34d"]
      : rarity === "epic"
      ? ["#a855f7", "#c084fc", "#e879f9"]
      : rarity === "rare"
      ? ["#3b82f6", "#60a5fa", "#93c5fd"]
      : ["#22c55e", "#4ade80", "#86efac"];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: -10,
          }}
          animate={{
            y: viewportHeight + 20,
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
