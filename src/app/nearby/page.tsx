"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QuestCard from "@/components/QuestCard";
import { getUserSettings } from "@/lib/settings";
import { ALL_QUESTS } from "@/lib/quests";
import { Quest } from "@/lib/types";

const NEARBY_CATEGORIES = ["Outdoors", "Social", "Community", "Culture", "Food"];

export default function NearbyPage() {
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserSettings().then(({ settings }) => {
      setLocationLabel(settings?.home_location_label ?? null);
      setIsLoading(false);
    });
  }, []);

  const nearbyQuests = useMemo(() => {
    return ALL_QUESTS.filter(
      (quest) =>
        NEARBY_CATEGORIES.includes(quest.category) &&
        quest.type === "side" &&
        quest.difficulty <= 3
    ).slice(0, 9);
  }, []);

  const suggestions = useMemo(() => {
    const location = locationLabel ?? "your area";
    return [
      `Visit a local park you haven't been to in ${location}`,
      `Find a new café and read for 30 minutes in ${location}`,
      `Attend one free local event this week in ${location}`,
      `Walk a different route home through ${location}`,
      `Try a street food spot you've never visited in ${location}`,
    ];
  }, [locationLabel]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto tavrn-panel p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-tavern-oak/50 rounded" />
          <div className="h-4 w-3/4 bg-tavern-oak/40 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 bg-tavern-oak/30 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto tavrn-panel p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="tavrn-kicker mb-2">Local Discovery</p>
          <h1 className="tavrn-wordmark text-4xl leading-none mb-2">
            {locationLabel ? `${locationLabel}` : "Nearby Quests"}
          </h1>
          <p className="text-sm text-tavern-parchment-dim">
            {locationLabel
              ? `Quests that get you out and about in ${locationLabel}.`
              : "Quests that get you out and about. Set your location in Settings for personalized suggestions."}
          </p>
        </div>
        <div className="flex gap-2">
          {!locationLabel && (
            <Link
              href="/settings"
              className="tavrn-button !bg-tavern-oak !text-tavern-parchment text-[8px]"
            >
              Set Location
            </Link>
          )}
          <Link href="/" className="tavrn-button text-[8px]">
            Back to Today
          </Link>
        </div>
      </div>

      {/* Suggestions */}
      <section className="mb-8">
        <h2 className="font-pixel text-retro-yellow text-sm mb-4">💡 Try This Week</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {suggestions.map((suggestion, i) => (
            <div
              key={i}
              className="bg-retro-darkgray border-4 border-retro-black p-4 hover:border-tavern-gold/50 transition-none"
            >
              <p className="text-[12px] text-tavern-parchment leading-relaxed">
                {suggestion}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Nearby Quests */}
      <section>
        <h2 className="font-pixel text-retro-yellow text-sm mb-4">🗺 Quests for Getting Out</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nearbyQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      </section>

      {/* Privacy Note */}
      <section className="mt-8 bg-retro-darkgray border-4 border-retro-black p-4">
        <p className="font-pixel text-[8px] text-retro-lightgray mb-2">🔒 Privacy Note</p>
        <p className="text-[12px] text-retro-gray leading-relaxed">
          This page uses your optional home area label from Settings. No precise GPS is required. 
          For AI-powered local place discovery, visit{" "}
          <Link href="/discover" className="text-tavern-gold hover:underline">
            The Grand Chronicler
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
