"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Quest } from "@/lib/types";
import { Milestone, getMilestoneColor } from "@/lib/milestones";
import PixelButton from "./PixelButton";
import XPBar from "./XPBar";

interface CompletionModalProps {
  quest: Quest;
  xpEarned: number;
  newXpTotal: number;
  newLevel?: number;
  newStreak?: number;
  isNewLongest?: boolean;
  heroHandle?: string;
  milestones?: Milestone[];
  onClose: () => void;
}

/* Deterministic positions for XP particles — avoids hydration mismatch */
const PARTICLE_POSITIONS = [12, 28, 44, 60, 76, 20, 36, 52, 68, 84, 8, 40, 56, 72, 88];
const PARTICLE_DELAYS    = [0, 0.2, 0.4, 0.1, 0.3, 0.5, 0.15, 0.35, 0.25, 0.45, 0.05, 0.55, 0.1, 0.4, 0.2];
const CONFETTI_COLORS    = ["bg-tavern-gold", "bg-tavern-ember", "bg-retro-lime", "bg-retro-cyan", "bg-retro-yellow"];

export default function CompletionModal({
  quest,
  xpEarned,
  newXpTotal,
  newLevel,
  newStreak,
  isNewLongest,
  heroHandle,
  milestones = [],
  onClose,
}: CompletionModalProps) {
  const [showParticles, setShowParticles] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showMugs, setShowMugs] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowParticles(true), 100);
    const t2 = setTimeout(() => setShowContent(true), 350);
    const t3 = setTimeout(() => setShowMugs(true), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleShare = () => {
    const heroUrl = heroHandle
      ? `https://tarvn.xyz/hero/${heroHandle}`
      : `https://tarvn.xyz`;
    const shareText = `Just earned +${xpEarned} XP completing "${quest.title}" on tavrn! My legend grows. 🍺`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `I completed "${quest.title}" on tavrn!`,
        text: shareText,
        url: heroUrl,
      }).catch(() => {/* dismissed */});
    } else {
      navigator.clipboard?.writeText(`${shareText} ${heroUrl}`);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(10,8,5,0.92)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      {/* ── XP particles floating up ── */}
      {showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLE_POSITIONS.map((left, i) => (
            <div
              key={i}
              className="absolute font-pixel text-tavern-gold text-[9px]"
              style={{
                left: `${left}%`,
                bottom: "30%",
                animation: `floatUp 1.2s steps(8) forwards`,
                animationDelay: `${PARTICLE_DELAYS[i]}s`,
                opacity: 0,
              }}
            >
              +{Math.floor(xpEarned / 4)}
            </div>
          ))}
        </div>
      )}

      {/* ── Ember pixel confetti ── */}
      {showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${(i * 6) % 100}%`,
                top: "-12px",
                animationDelay: `${(i * 0.12) % 1.8}s`,
                animationDuration: `${2.2 + (i % 3) * 0.4}s`,
                animation: `fall ${2.2 + (i % 3) * 0.4}s linear ${(i * 0.12) % 1.8}s forwards`,
              }}
            >
              <div className={`w-2 h-2 ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}`} />
            </div>
          ))}
        </div>
      )}

      {/* ── Modal panel ── */}
      <div
        className={`relative max-w-md w-full transition-all duration-500 ${
          showContent ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{ border: "4px solid #5c3a1a", boxShadow: "6px 6px 0 #5c3a1a", background: "#1a1208" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Hearth backdrop strip ── */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b-4"
          style={{ borderColor: "#5c3a1a", background: "#2a1a0a" }}
        >
          <Image src="/tavern/hearth.svg" alt="" width={40} height={35} className="opacity-80" />
          <h2 id="completion-title" className="font-pixel text-tavern-gold text-[10px] tracking-wider text-gold-shimmer">
            TRIUMPH!
          </h2>
          <Image src="/tavern/hearth.svg" alt="" width={40} height={35} className="opacity-80 scale-x-[-1]" />
        </div>

        <div className="p-6">
          {/* Quest name */}
          <p className="font-pixel text-tavern-parchment text-[8px] leading-loose text-center mb-5">
            {quest.title}
          </p>

          {/* ── Milestones ── */}
          {milestones.length > 0 && (
            <div className="mb-4 space-y-2">
              {milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className="text-center p-2 animate-pulse"
                  style={{
                    border: `2px solid ${getMilestoneColor(milestone.rarity)}`,
                    background: "#1a0d05",
                  }}
                >
                  <div className="font-pixel text-[8px]" style={{ color: getMilestoneColor(milestone.rarity) }}>
                    {getMilestoneEmoji(milestone.type)} {milestone.title}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── XP earned ── */}
          <div
            className="text-center py-4 mb-4 relative overflow-hidden"
            style={{ border: "4px solid #c4a85a", background: "#0f0d07" }}
          >
            <div className="font-pixel text-[7px] text-tavern-smoke-light mb-1 uppercase tracking-wider">
              XP Earned
            </div>
            <div className="font-pixel text-tavern-gold text-4xl text-gold-shimmer">
              +{xpEarned}
            </div>
            {/* warm glow underlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(232,184,100,0.12) 0%, transparent 70%)" }}
            />
          </div>

          {/* ── Level up ── */}
          {newLevel && (
            <div
              className="text-center p-3 mb-4 animate-pulse"
              style={{ border: "4px solid #e8b864", background: "#2a1a0a" }}
            >
              <div className="font-pixel text-tavern-gold text-[11px]">🎉 LEVEL UP!</div>
              <div className="font-pixel text-tavern-parchment text-[9px] mt-1">
                You are now Level {newLevel}
              </div>
            </div>
          )}

          {/* ── Streak ── */}
          {newStreak !== undefined && newStreak > 0 && (
            <div
              className="flex items-center gap-3 p-3 mb-4"
              style={{ border: "2px solid #c44a36", background: "#1a0d05" }}
            >
              <span className="text-xl">🔥</span>
              <div>
                <div className="font-pixel text-tavern-ember text-[9px]">
                  {newStreak} day streak{isNewLongest ? " — NEW RECORD!" : " kept alive!"}
                </div>
                {isNewLongest && (
                  <div className="font-pixel text-tavern-gold text-[7px] mt-0.5">
                    Your longest yet, adventurer.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── XP bar ── */}
          <div className="mb-5">
            <div className="flex justify-between mb-1">
              <span className="font-pixel text-tavern-smoke-light text-[7px]">Total XP</span>
              <span className="font-pixel text-tavern-gold text-[7px]">{newXpTotal} XP</span>
            </div>
            <XPBar xpTotal={newXpTotal} showLabel={false} />
          </div>

          {/* ── Mug cheer ── */}
          {showMugs && (
            <div className="flex justify-center gap-3 mb-5">
              {[0.1, 0, 0.15].map((delay, i) => (
                <Image
                  key={i}
                  src="/tavern/mug.svg"
                  alt=""
                  width={28}
                  height={28}
                  style={{
                    animation: `bounce8bit 0.5s step-end ${delay}s infinite`,
                    imageRendering: "pixelated",
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3">
            {/* Primary: find next quest */}
            <Link href="/board" className="block">
              <PixelButton variant="success" size="lg" className="w-full">
                ⚔ Find Next Quest
              </PixelButton>
            </Link>

            {/* Secondary row: pin + share */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                className={`font-pixel text-[7px] px-3 py-2 border-2 transition-none ${
                  pinned
                    ? "border-tavern-gold bg-tavern-smoke text-tavern-gold"
                    : "border-tavern-oak bg-tavern-smoke text-tavern-parchment hover:border-tavern-gold"
                }`}
              >
                {pinned ? "✓ Pinned" : "📌 Pin to Hero"}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="font-pixel text-[7px] px-3 py-2 border-2 border-tavern-oak bg-tavern-smoke text-tavern-parchment hover:border-tavern-gold transition-none"
              >
                🔗 Share Triumph
              </button>
            </div>

            {/* Tertiary: journal link + close */}
            <div className="flex items-center justify-between mt-1">
              <Link
                href="/journal"
                className="font-pixel text-tavern-gold text-[7px] hover:text-tavern-candle"
              >
                View Journal →
              </Link>
              <button
                onClick={onClose}
                className="font-pixel text-tavern-smoke-light text-[7px] hover:text-tavern-parchment"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
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
