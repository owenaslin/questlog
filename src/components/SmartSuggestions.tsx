"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { QuestRecommendation, getSmartRecommendations, getLowEnergySuggestion } from "@/lib/quest-recommendations";
import { Quest } from "@/lib/types";
import QuestCard from "./QuestCard";

interface SmartSuggestionsProps {
  showLowEnergy?: boolean;
  maxSuggestions?: number;
}

export default function SmartSuggestions({
  showLowEnergy = true,
  maxSuggestions = 3,
}: SmartSuggestionsProps) {
  const [recommendations, setRecommendations] = useState<QuestRecommendation[]>([]);
  const [lowEnergyQuest, setLowEnergyQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<"smart" | "low-energy">("smart");

  useEffect(() => {
    const loadRecommendations = async () => {
      setIsLoading(true);
      const [recs, lowEnergy] = await Promise.all([
        getSmartRecommendations(maxSuggestions),
        showLowEnergy ? getLowEnergySuggestion() : Promise.resolve(null),
      ]);
      setRecommendations(recs);
      setLowEnergyQuest(lowEnergy);
      setIsLoading(false);
    };

    loadRecommendations();
  }, [maxSuggestions, showLowEnergy]);

  if (isLoading) {
    return (
      <div className="bg-retro-darkgray border-4 border-retro-black p-4">
        <p className="font-pixel text-retro-lightgray text-[8px]">Loading suggestions...</p>
      </div>
    );
  }

  if (recommendations.length === 0 && !lowEnergyQuest) {
    return (
      <div className="bg-retro-darkgray border-4 border-retro-black p-4 text-center">
        <p className="font-pixel text-retro-gray text-[8px]">
          Complete a few quests to get personalized suggestions!
        </p>
      </div>
    );
  }

  const getReasonColor = (type: QuestRecommendation["type"]) => {
    switch (type) {
      case "daily_streak":
        return "text-retro-orange";
      case "continue_questline":
        return "text-retro-cyan";
      case "quick_win":
        return "text-retro-lime";
      case "category_balance":
        return "text-retro-purple";
      case "difficulty_progression":
        return "text-retro-red";
      default:
        return "text-retro-lightgray";
    }
  };

  return (
    <div className="bg-retro-darkgray border-4 border-retro-black p-4">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-pixel text-retro-yellow text-xs">
          {activeMode === "smart" ? "💡 Smart Suggestions" : "😌 Low Energy Mode"}
        </h2>
        {lowEnergyQuest && (
          <div className="flex gap-1" role="group" aria-label="Suggestion mode">
            <button
              onClick={() => setActiveMode("smart")}
              className={`font-pixel text-[7px] px-2 py-1 ${
                activeMode === "smart"
                  ? "bg-retro-blue text-retro-white"
                  : "bg-retro-black text-retro-gray"
              }`}
              aria-pressed={activeMode === "smart"}
              aria-label="Smart suggestions"
            >
              Smart
            </button>
            <button
              onClick={() => setActiveMode("low-energy")}
              className={`font-pixel text-[7px] px-2 py-1 ${
                activeMode === "low-energy"
                  ? "bg-retro-green text-retro-black"
                  : "bg-retro-black text-retro-gray"
              }`}
              aria-pressed={activeMode === "low-energy"}
              aria-label="Low energy suggestions"
            >
              Easy
            </button>
          </div>
        )}
      </div>

      {activeMode === "low-energy" && lowEnergyQuest ? (
        // Low Energy Mode
        <div>
          <p className="font-pixel text-retro-lightgray text-[8px] mb-3">
            Not feeling it today? This quick win takes 30 min or less:
          </p>
          <Link href={`/quests/${lowEnergyQuest.id}`}>
            <QuestCard quest={lowEnergyQuest} />
          </Link>
        </div>
      ) : (
        // Smart Suggestions Mode
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <Link
              key={rec.quest.id}
              href={`/quests/${rec.quest.id}`}
              className="block bg-retro-black border-2 border-retro-darkgray p-3 hover:border-retro-lightblue transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-pixel text-retro-yellow text-[10px] leading-relaxed mb-1">
                    {rec.quest.title}
                  </p>
                  <p className={`font-pixel text-[7px] ${getReasonColor(rec.type)}`}>
                    {rec.reason}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-pixel text-retro-lime text-[8px] block">
                    +{rec.quest.xp_reward} XP
                  </span>
                  <span
                    className={`font-pixel text-[6px] px-1 py-0.5 ${
                      rec.quest.type === "main"
                        ? "bg-retro-red text-retro-white"
                        : "bg-retro-blue text-retro-white"
                    }`}
                  >
                    {rec.quest.type === "main" ? "Main" : "Side"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
