"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import PixelButton from "./PixelButton";
import XPBar from "./XPBar";

interface CompletionModalProps {
  quest: Quest;
  xpEarned: number;
  newXpTotal: number;
  newLevel?: number;
  onClose: () => void;
}

export default function CompletionModal({
  quest,
  xpEarned,
  newXpTotal,
  newLevel,
  onClose,
}: CompletionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Stagger animations
    const confettiTimer = setTimeout(() => setShowConfetti(true), 100);
    const contentTimer = setTimeout(() => setShowContent(true), 400);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-retro-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      {/* Pixel Confetti Background */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className={`w-3 h-3 border-2 border-retro-black ${
                  ["bg-retro-yellow", "bg-retro-lime", "bg-retro-cyan", "bg-retro-orange", "bg-retro-red"][
                    i % 5
                  ]
                }`}
              />
            </div>
          ))}
        </div>
      )}

      <div
        className={`
          bg-retro-darkgray border-4 border-retro-green shadow-pixel-lg max-w-md w-full p-6
          transform transition-all duration-500
          ${showContent ? "scale-100 opacity-100" : "scale-95 opacity-0"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-bounce" aria-hidden="true">🏆</div>
          <h2 id="completion-title" className="font-pixel text-retro-yellow text-sm mb-2">
            Quest Complete!
          </h2>
          <p className="font-pixel text-retro-lightgray text-[8px] leading-relaxed">
            {quest.title}
          </p>
        </div>

        {/* XP Display */}
        <div className="bg-retro-black border-4 border-retro-lime p-4 mb-6 text-center">
          <div className="font-pixel text-retro-gray text-[7px] mb-2 uppercase">
            XP Earned
          </div>
          <div className="font-pixel text-retro-lime text-3xl animate-pulse">
            +{xpEarned}
          </div>
        </div>

        {/* Level Up Banner */}
        {newLevel && (
          <div className="bg-retro-yellow border-4 border-retro-orange p-3 mb-6 text-center animate-pulse">
            <div className="font-pixel text-retro-black text-xs">
              🎉 LEVEL UP! 🎉
            </div>
            <div className="font-pixel text-retro-black text-[10px]">
              You are now Level {newLevel}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-pixel text-retro-gray text-[7px]">Total XP</span>
            <span className="font-pixel text-retro-cyan text-[7px]">{newXpTotal} XP</span>
          </div>
          <XPBar xpTotal={newXpTotal} showLabel={false} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/quests" className="block">
            <PixelButton variant="success" size="lg" className="w-full">
              Find Next Quest
            </PixelButton>
          </Link>
          <Link href="/profile" className="block">
            <PixelButton variant="secondary" className="w-full">
              View Profile
            </PixelButton>
          </Link>
          <button
            onClick={onClose}
            className="font-pixel text-retro-gray text-[8px] hover:text-retro-lightgray mt-2"
            aria-label="Close celebration modal"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
