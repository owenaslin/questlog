"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QuestCard from "@/components/quest/QuestCard";
import { drawQuestsByMood, ENERGY_OPTIONS, QUEST_PACKS, QuestVibe, TIME_OPTIONS } from "@/lib/quest-packs";
import { getUserSettings } from "@/lib/settings";

const VIBE_OPTIONS: Array<{ value: QuestVibe; label: string; icon: string }> = [
  { value: "productive", label: "Productive", icon: "⚡" },
  { value: "adventurous", label: "Adventurous", icon: "🗺" },
  { value: "social", label: "Social", icon: "🤝" },
  { value: "cozy", label: "Cozy", icon: "🕯" },
  { value: "creative", label: "Creative", icon: "🎨" },
  { value: "healthy", label: "Healthy", icon: "💪" },
  { value: "chaotic_good", label: "Chaotic Good", icon: "🎲" },
];

export default function QuestPacksPage() {
  const [availableTimeMinutes, setAvailableTimeMinutes] = useState<15 | 30 | 60 | 240>(30);
  const [energyLevel, setEnergyLevel] = useState<"low" | "normal" | "high">("normal");
  const [vibe, setVibe] = useState<QuestVibe>("adventurous");
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  useEffect(() => {
    getUserSettings().then(({ settings }) => {
      if (settings?.preferred_categories?.length) {
        setPreferredCategories(settings.preferred_categories);
      }
    });
  }, []);

  const drawnQuests = useMemo(() => {
    return drawQuestsByMood({ availableTimeMinutes, energyLevel, vibe, preferredCategories });
  }, [availableTimeMinutes, energyLevel, vibe, preferredCategories]);

  return (
    <div className="max-w-5xl mx-auto tavrn-panel p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="tavrn-kicker mb-2">Quest Packs</p>
          <h1 className="tavrn-wordmark text-4xl leading-none mb-2">Draw By Vibe</h1>
          <p className="text-sm text-tavern-parchment-dim">
            Pick your time, energy, and mood. The tavern will deal three quests.
          </p>
        </div>
        <Link href="/" className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px]">
          Back to Today
        </Link>
      </div>

      <section className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="font-pixel text-[8px] text-retro-lightgray mb-2">Time</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setAvailableTimeMinutes(option.value); setSelectedPackId(null); }}
                  className={`border-2 p-2 font-pixel text-[8px] ${
                    availableTimeMinutes === option.value
                      ? "border-tavern-gold bg-tavern-oak text-tavern-parchment"
                      : "border-retro-black bg-retro-darkpurple text-retro-lightgray"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-pixel text-[8px] text-retro-lightgray mb-2">Energy</p>
            <div className="grid grid-cols-3 gap-2">
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setEnergyLevel(option.value); setSelectedPackId(null); }}
                  className={`border-2 p-2 font-pixel text-[8px] ${
                    energyLevel === option.value
                      ? "border-tavern-gold bg-tavern-oak text-tavern-parchment"
                      : "border-retro-black bg-retro-darkpurple text-retro-lightgray"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-pixel text-[8px] text-retro-lightgray mb-2">Vibe</p>
            <select
              value={vibe}
              onChange={(event) => { setVibe(event.target.value as QuestVibe); setSelectedPackId(null); }}
              className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment"
            >
              {VIBE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-pixel text-retro-yellow text-sm mb-4">🎴 Your Three Drawn Quests</h2>
        {drawnQuests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {drawnQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
          </div>
        ) : (
          <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
            <p className="font-pixel text-retro-lightgray text-[8px]">No quests matched this draw. Try more time or a different vibe.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-pixel text-retro-yellow text-sm mb-4">📦 Packs in the Tavern</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUEST_PACKS.map((pack) => {
            const isSelected = selectedPackId === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => {
                  setSelectedPackId(pack.id);
                  setVibe(pack.vibes[0]);
                  setPreferredCategories(pack.categories);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`text-left bg-retro-darkgray border-4 p-4 w-full transition-none ${
                  isSelected ? "border-tavern-gold" : "border-retro-black hover:border-retro-gray"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-pixel text-tavern-gold text-[10px]">{pack.icon} {pack.title}</p>
                  {isSelected && <span className="font-pixel text-[7px] text-tavern-gold">▶ Active</span>}
                </div>
                <p className="text-[12px] text-retro-lightgray leading-relaxed mb-3">{pack.description}</p>
                <div className="flex flex-wrap gap-2">
                  {pack.categories.slice(0, 4).map((category) => (
                    <span key={category} className="font-pixel text-[7px] px-2 py-1 bg-retro-darkpurple text-retro-lightgray">
                      {category}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
