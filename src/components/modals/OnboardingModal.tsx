"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ALL_QUESTS } from "@/lib/quests";
import { acceptQuest } from "@/lib/quest-progress";
import { Quest } from "@/lib/types";

interface OnboardingModalProps {
  heroName: string;
  onDismiss: () => void;
}

type Step = "welcome" | "categories" | "difficulty" | "quest" | "done";

const CATEGORY_OPTIONS = [
  { key: "Fitness",      icon: "💪", label: "Fitness" },
  { key: "Creative",     icon: "🎨", label: "Creative" },
  { key: "Tech",         icon: "💻", label: "Tech" },
  { key: "Education",    icon: "📚", label: "Education" },
  { key: "Wellness",     icon: "🧘", label: "Wellness" },
  { key: "Outdoors",     icon: "🌲", label: "Outdoors" },
  { key: "Social",       icon: "🤝", label: "Social" },
  { key: "Productivity", icon: "⚡", label: "Productivity" },
  { key: "Food",         icon: "🍳", label: "Food" },
  { key: "Career",       icon: "💼", label: "Career" },
  { key: "Community",    icon: "🏘", label: "Community" },
  { key: "Culture",      icon: "🎭", label: "Culture" },
];

type DifficultyChoice = "easy" | "medium" | "hard";

const DIFFICULTY_OPTIONS: { key: DifficultyChoice; icon: string; label: string; sub: string; range: [number, number] }[] = [
  { key: "easy",   icon: "🌱", label: "Start Easy",      sub: "Quick wins, low pressure",       range: [1, 2] },
  { key: "medium", icon: "⚔",  label: "Challenge Me",    sub: "Solid effort, real growth",      range: [3, 3] },
  { key: "hard",   icon: "💀", label: "Go Hard",         sub: "Long-term, high commitment",     range: [4, 5] },
];

export default function OnboardingModal({ heroName, onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyChoice | null>(null);
  const [suggestedQuest, setSuggestedQuest] = useState<Quest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedQuestId, setAcceptedQuestId] = useState<string | null>(null);

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 3 ? [...prev, key] : prev
    );
  };

  const handleDifficultyNext = (choice: DifficultyChoice) => {
    setSelectedDifficulty(choice);
    const diffRange = DIFFICULTY_OPTIONS.find((d) => d.key === choice)!.range;
    const [minD, maxD] = diffRange;

    // Find a matching quest
    const pool = ALL_QUESTS.filter(
      (q) =>
        q.type === "side" &&
        q.difficulty >= minD &&
        q.difficulty <= maxD &&
        (selectedCategories.length === 0 || selectedCategories.includes(q.category))
    );
    const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : ALL_QUESTS.find((q) => q.type === "side") ?? null;
    setSuggestedQuest(pick);
    setStep("quest");
  };

  const handleAcceptQuest = async () => {
    if (!suggestedQuest) return;
    setIsAccepting(true);
    try {
      const result = await acceptQuest(suggestedQuest.id, suggestedQuest.type, suggestedQuest.category);
      if (result.success) {
        setAcceptedQuestId(suggestedQuest.id);
        setStep("done");
      }
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(10,8,5,0.92)" }}
    >
      <div
        className="relative max-w-lg w-full"
        style={{ border: "4px solid #5c3a1a", boxShadow: "6px 6px 0 #5c3a1a", background: "#1a1208" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b-4"
          style={{ borderColor: "#5c3a1a", background: "#2a1a0a" }}
        >
          <span className="font-pixel text-tavern-gold text-[9px] tracking-wider">
            {step === "welcome"    ? "Welcome to Tarvn"         :
             step === "categories" ? "Choose Your Interests"     :
             step === "difficulty" ? "Pick Your Challenge Level" :
             step === "quest"      ? "Your First Quest"          :
                                    "Adventure Begins!"}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="font-pixel text-tavern-smoke-light text-[7px] hover:text-tavern-parchment px-1"
            aria-label="Skip intro"
          >
            Skip intro
          </button>
        </div>

        <div className="p-6">
          {/* Step: Welcome */}
          {step === "welcome" && (
            <div className="text-center">
              <div className="text-5xl mb-4">🍺</div>
              <h2 className="font-pixel text-tavern-gold text-[11px] leading-relaxed mb-3">
                Welcome, {heroName}!
              </h2>
              <p className="font-pixel text-tavern-parchment text-[8px] leading-loose mb-6 opacity-90">
                You&apos;ve walked through the tavern door.<br />
                The quest board is before you, full of adventures<br />
                waiting for a hero like yourself.
              </p>
              <button
                type="button"
                onClick={() => setStep("categories")}
                className="font-pixel text-[9px] px-6 py-3 bg-tavern-gold text-retro-black border-b-4 border-tavern-gold-dark hover:bg-tavern-candle transition-none"
              >
                Let&apos;s find your first quest →
              </button>
            </div>
          )}

          {/* Step: Categories */}
          {step === "categories" && (
            <div>
              <p className="font-pixel text-tavern-smoke-light text-[8px] leading-loose mb-4">
                What are you interested in? Pick up to 3.
              </p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {CATEGORY_OPTIONS.map((cat) => {
                  const selected = selectedCategories.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => toggleCategory(cat.key)}
                      className={`p-3 text-center border-2 transition-none ${
                        selected
                          ? "border-tavern-gold bg-tavern-smoke"
                          : "border-tavern-oak bg-retro-darkgray hover:border-tavern-parchment"
                      }`}
                    >
                      <div className="text-xl mb-1">{cat.icon}</div>
                      <div className="font-pixel text-[7px] text-tavern-parchment">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("difficulty")}
                  className="font-pixel text-tavern-smoke-light text-[7px] hover:text-tavern-parchment"
                >
                  Skip →
                </button>
                <button
                  type="button"
                  onClick={() => setStep("difficulty")}
                  className="font-pixel text-[9px] px-5 py-2 bg-tavern-gold text-retro-black border-b-4 border-tavern-gold-dark hover:bg-tavern-candle transition-none"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step: Difficulty */}
          {step === "difficulty" && (
            <div>
              <p className="font-pixel text-tavern-smoke-light text-[8px] leading-loose mb-4">
                How bold are you feeling today?
              </p>
              <div className="flex flex-col gap-3">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleDifficultyNext(opt.key)}
                    className={`flex items-center gap-4 p-4 border-2 text-left transition-none ${
                      selectedDifficulty === opt.key
                        ? "border-tavern-gold bg-tavern-smoke"
                        : "border-tavern-oak bg-retro-darkgray hover:border-tavern-parchment"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="font-pixel text-tavern-gold text-[9px] mb-0.5">{opt.label}</div>
                      <div className="font-pixel text-tavern-smoke-light text-[7px]">{opt.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Quest suggestion */}
          {step === "quest" && suggestedQuest && (
            <div>
              <p className="font-pixel text-tavern-smoke-light text-[7px] leading-loose mb-4">
                The Quest Giver nods and taps the board:
              </p>
              <div
                className="p-4 mb-5"
                style={{ border: "2px solid #c4a85a", background: "#0f0d07" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-pixel text-[6px] px-1.5 py-0.5 bg-retro-blue text-retro-white">
                    {suggestedQuest.type === "main" ? "⚔ Main" : "🗡 Side"}
                  </span>
                  <span className="font-pixel text-tavern-smoke-light text-[6px]">{suggestedQuest.category}</span>
                </div>
                <h3 className="font-pixel text-tavern-gold text-[10px] leading-relaxed mb-2">
                  {suggestedQuest.title}
                </h3>
                <p className="font-pixel text-tavern-parchment text-[8px] leading-loose mb-3 opacity-80">
                  {suggestedQuest.description}
                </p>
                <div className="flex gap-4">
                  <span className="font-pixel text-retro-lime text-[7px]">+{suggestedQuest.xp_reward} XP</span>
                  <span className="font-pixel text-retro-cyan text-[7px]">{suggestedQuest.duration_label}</span>
                  <span className="font-pixel text-tavern-smoke-light text-[7px]">{"★".repeat(suggestedQuest.difficulty)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleAcceptQuest}
                  disabled={isAccepting}
                  className="font-pixel text-[9px] px-5 py-3 bg-tavern-gold text-retro-black border-b-4 border-tavern-gold-dark hover:bg-tavern-candle transition-none disabled:opacity-60"
                >
                  {isAccepting ? "Accepting…" : "▶ Accept This Quest"}
                </button>
                <Link
                  href="/board"
                  onClick={onDismiss}
                  className="font-pixel text-[8px] text-tavern-smoke-light text-center hover:text-tavern-parchment py-2"
                >
                  See more on the board →
                </Link>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center">
              <div className="text-5xl mb-4">🍻</div>
              <h2 className="font-pixel text-tavern-gold text-[11px] leading-relaxed mb-3">
                Quest Accepted!
              </h2>
              <p className="font-pixel text-tavern-parchment text-[8px] leading-loose mb-6 opacity-90">
                The tavern cheers. Your adventure has begun.<br />
                Track your progress in the Journal.
              </p>
              <div className="flex flex-col gap-2">
                {acceptedQuestId && (
                  <Link href={`/board/${acceptedQuestId}`} onClick={onDismiss}>
                    <button
                      type="button"
                      className="w-full font-pixel text-[9px] px-5 py-3 bg-tavern-gold text-retro-black border-b-4 border-tavern-gold-dark hover:bg-tavern-candle transition-none"
                    >
                      View Quest →
                    </button>
                  </Link>
                )}
                <Link href="/journal" onClick={onDismiss}>
                  <button
                    type="button"
                    className="w-full font-pixel text-[8px] px-5 py-2 border-2 border-tavern-oak text-tavern-parchment hover:border-tavern-gold transition-none"
                  >
                    📜 Open My Journal
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
