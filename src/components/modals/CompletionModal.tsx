"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Quest } from "@/lib/types";
import { Milestone, getMilestoneColor, getMilestoneEmoji } from "@/lib/milestones";
import PixelButton from "@/components/ui/PixelButton";
import XPBar from "@/components/ui/XPBar";
import { QUESTLINES } from "@/lib/questlines";
import { acceptQuest } from "@/lib/quest-progress";

interface CompletionModalProps {
  quest: Quest;
  xpEarned: number;
  newXpTotal: number;
  newLevel?: number;
  newStreak?: number;
  isNewLongest?: boolean;
  heroHandle?: string;
  milestones?: Milestone[];
  suggestedQuests?: Quest[];
  onClose: () => void;
}

function findNextQuestlineQuest(questId: string): Quest | null {
  for (const questline of QUESTLINES) {
    const stepIndex = questline.steps.findIndex((step) => step.quest_id === questId);
    if (stepIndex !== -1 && stepIndex < questline.steps.length - 1) {
      const nextStep = questline.steps[stepIndex + 1];
      return nextStep.quest || null;
    }
  }
  return null;
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
  suggestedQuests = [],
  onClose,
}: CompletionModalProps) {
  const router = useRouter();
  const [showParticles, setShowParticles] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showMugs, setShowMugs] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [nextQuestlineQuest] = useState<Quest | null>(() => findNextQuestlineQuest(quest.id));

  useEffect(() => {
    const t1 = setTimeout(() => setShowParticles(true), 100);
    const t2 = setTimeout(() => setShowContent(true), 1800);
    const t3 = setTimeout(() => setShowMugs(true), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /** Tapping the backdrop during the burst skips to the detail card; after that it closes. */
  const handleBackdropClick = () => {
    if (!showContent) {
      setShowContent(true);
      setShowMugs(true);
    } else {
      onClose();
    }
  };

  const handleShare = () => {
    const heroPageUrl = heroHandle
      ? `https://tarvn.xyz/hero/${heroHandle}`
      : `https://tarvn.xyz`;
    const shareText = `Just earned +${xpEarned} XP completing "${quest.title}" on tavrn! My legend grows. 🍺`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `I completed "${quest.title}" on tavrn!`,
        text: shareText,
        url: heroPageUrl,
      }).catch(() => {/* dismissed */});
    } else {
      navigator.clipboard?.writeText(`${shareText} ${heroPageUrl}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(10,8,5,0.92)" }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      {/* ── Full-screen triumph burst (visible for first ~1.8 s, fades out as card fades in) ── */}
      {/* aria-hidden: purely decorative — the modal card carries the accessible label */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 ${showContent ? "opacity-0" : "opacity-100"}`}
      >
        <p className="font-pixel text-tavern-gold text-2xl tracking-widest text-gold-shimmer mb-6">
          TRIUMPH!
        </p>
        <div className="font-pixel text-tavern-gold text-7xl text-gold-shimmer mb-2">
          +{xpEarned}
        </div>
        <p className="kicker text-[--parchment-dim]">XP EARNED</p>
        {/* Mugs shown immediately in the burst; the detail card has its own showMugs gate */}
        <div className="flex justify-center gap-4 mt-8">
          {[0.1, 0, 0.15].map((delay, i) => (
            <Image
              key={i}
              src="/tavern/mug.svg"
              alt=""
              width={36}
              height={36}
              style={{
                animation: `bounce8bit 0.5s step-end ${delay}s infinite`,
                imageRendering: "pixelated",
              }}
            />
          ))}
        </div>
        {/* Tapping anywhere passes through (pointer-events-none) to handleBackdropClick,
            which skips to the detail card rather than closing the modal entirely. */}
        <p className="absolute bottom-8 text-body-sm text-[--parchment-dim] opacity-50 tracking-wide">
          tap anywhere to skip
        </p>
      </div>

      {/* ── XP particles floating up ── */}
      {showParticles && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className={`relative max-w-md w-full transition-all duration-500 ${
            showContent ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
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
            <p className="text-body text-tavern-parchment text-center mb-5">
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
                    <div className="text-body-sm font-medium" style={{ color: getMilestoneColor(milestone.rarity) }}>
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
              <div className="kicker text-[--parchment-dim] mb-1">
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
                <div className="text-body-sm text-tavern-parchment mt-1">
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
                  <div className="text-body-sm font-medium text-tavern-ember">
                    {newStreak} day streak{isNewLongest ? " — NEW RECORD!" : " kept alive!"}
                  </div>
                  {isNewLongest && (
                    <div className="text-body-sm text-tavern-gold mt-0.5">
                      Your longest yet, adventurer.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── XP bar ── */}
            <div className="mb-5">
              <div className="flex justify-between mb-1">
                <span className="text-body-sm text-[--parchment-dim]">Total XP</span>
                <span className="text-body-sm text-tavern-gold">{newXpTotal} XP</span>
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

            {/* ── What's Next? ── */}
            {(nextQuestlineQuest || suggestedQuests.length > 0) && (
              <div
                className="mb-5 p-3"
                style={{ border: "2px solid #3a2a10", background: "#110e06" }}
              >
                <p className="kicker text-[--parchment-dim] mb-3">
                  What&apos;s Next?
                </p>
                <div className="space-y-2">
                  {nextQuestlineQuest && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-semibold text-tavern-gold leading-snug truncate">
                          {nextQuestlineQuest.title}
                        </p>
                        <p className="text-body-sm text-[--parchment-dim]">Questline · +{nextQuestlineQuest.xp_reward} XP</p>
                      </div>
                      <Link
                        href={`/quests/${nextQuestlineQuest.id}`}
                        onClick={onClose}
                        className="tavrn-btn tavrn-btn-primary tavrn-btn-sm flex-shrink-0"
                      >
                        Continue →
                      </Link>
                    </div>
                  )}
                  {!nextQuestlineQuest && suggestedQuests.map((sq) => {
                    const isAccepting = acceptingId === sq.id;
                    return (
                      <div key={sq.id} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-tavern-parchment leading-snug truncate">{sq.title}</p>
                          <p className="text-body-sm text-[--parchment-dim]">
                            {sq.type === "main" ? "Main" : "Side"} · +{sq.xp_reward} XP
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!!acceptingId}
                          aria-busy={isAccepting}
                          onClick={async () => {
                            setAcceptingId(sq.id);
                            setAcceptError(null);
                            const result = await acceptQuest(sq.id, sq.type, sq.category);
                            setAcceptingId(null);
                            if (result.success) {
                              onClose();
                              router.push("/");
                            } else {
                              setAcceptError(result.error || "Could not accept quest. Please try again.");
                            }
                          }}
                          className="tavrn-btn tavrn-btn-primary tavrn-btn-sm flex-shrink-0 disabled:opacity-50"
                        >
                          {isAccepting ? "…" : "Accept"}
                        </button>
                      </div>
                    );
                  })}
                  {acceptError && (
                    <p className="text-body-sm text-tavern-ember mt-2">{acceptError}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="flex flex-col gap-3">
              {/* Primary: browse board */}
              {nextQuestlineQuest ? (
                <Link href={`/quests/${nextQuestlineQuest.id}`} className="block" onClick={onClose}>
                  <PixelButton variant="success" size="lg" className="w-full">
                    ⚔ Continue Questline
                  </PixelButton>
                </Link>
              ) : (
                <Link href="/board" className="block" onClick={onClose}>
                  <PixelButton variant="success" size="lg" className="w-full">
                    ⚔ Browse Quest Board
                  </PixelButton>
                </Link>
              )}

              {/* Secondary row: pin + share */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPinned((p) => !p)}
                  className={`tavrn-btn tavrn-btn-sm ${
                    pinned
                      ? "tavrn-btn-ghost border-tavern-gold text-tavern-gold"
                      : "tavrn-btn-ghost"
                  }`}
                >
                  {pinned ? "✓ Pinned" : "📌 Pin to Hero"}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm"
                >
                  🔗 Share Triumph
                </button>
              </div>

              {/* Tertiary: journal link + close */}
              <div className="flex items-center justify-between mt-1">
                <Link
                  href="/journal"
                  className="text-body-sm text-tavern-gold hover:text-tavern-candle"
                >
                  View Journal →
                </Link>
                <button
                  onClick={onClose}
                  className="text-body-sm text-[--parchment-dim] hover:text-tavern-parchment"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
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
