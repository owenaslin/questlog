"use client";

import React, { useState, useRef, useEffect } from "react";
import PixelButton from "@/components/PixelButton";
import { QuestType } from "@/lib/types";

interface GeneratedQuest {
  title: string;
  description: string;
  difficulty: number;
  duration_label: string;
  category: string;
  type: string;
  xp_reward: number;
  location: string;
}

const TOPICS = [
  "Adventure",
  "Cooking",
  "Art & Creativity",
  "Fitness",
  "Technology",
  "Music",
  "Nature",
  "Photography",
  "Reading",
  "Volunteering",
  "Gaming",
  "Science",
  "History",
  "Crafts",
];

export default function GeneratePage() {
  const [location, setLocation] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [questType, setQuestType] = useState<QuestType>("side");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedQuest | null>(null);
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          topic: customTopic || topic,
          questType,
        }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setResult(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-pixel text-retro-yellow text-xl mb-2">
        🤖 AI Quest Generator
      </h1>
      <p className="font-pixel text-retro-lightgray text-[9px] mb-8 leading-loose">
        Let AI craft a personalized quest based on your location and interests.
      </p>

      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 flex flex-col gap-6">
        {/* Location */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Your Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Denver, CO or Tokyo, Japan"
            className="w-full"
          />
        </div>

        {/* Topic */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Topic / Interest
          </label>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (e.target.value !== "") setCustomTopic("");
            }}
            className="w-full mb-2"
          >
            <option value="">Select a topic...</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => {
              setCustomTopic(e.target.value);
              if (e.target.value !== "") setTopic("");
            }}
            placeholder="Or type a custom topic..."
            className="w-full"
          />
        </div>

        {/* Quest Type */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Quest Type
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setQuestType("main")}
              className={`font-pixel text-[9px] px-4 py-2 transition-none ${
                questType === "main"
                  ? "bg-retro-red text-retro-white border-b-4 border-retro-darkpurple"
                  : "bg-retro-darkgray text-retro-lightgray border-b-4 border-retro-black hover:bg-retro-gray"
              }`}
            >
              ⚔ Main Quest
            </button>
            <button
              type="button"
              onClick={() => setQuestType("side")}
              className={`font-pixel text-[9px] px-4 py-2 transition-none ${
                questType === "side"
                  ? "bg-retro-blue text-retro-white border-b-4 border-retro-darkblue"
                  : "bg-retro-darkgray text-retro-lightgray border-b-4 border-retro-black hover:bg-retro-gray"
              }`}
            >
              🗡 Side Quest
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <PixelButton
          variant="success"
          size="lg"
          onClick={handleGenerate}
          disabled={loading || (!location && !topic && !customTopic)}
        >
          {loading ? "⏳ Generating..." : "⚡ Generate Quest"}
        </PixelButton>

        {/* Error */}
        {error && (
          <div className="bg-retro-red bg-opacity-20 border-4 border-retro-red p-4">
            <p className="font-pixel text-retro-red text-[9px]">{error}</p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-8 bg-retro-darkgray border-4 border-retro-lime shadow-pixel-lg p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-pixel text-retro-lime text-[10px]">
              ✨ Quest Generated!
            </span>
          </div>

          <h2 className="font-pixel text-retro-yellow text-sm mb-3">
            {result.title}
          </h2>

          <p className="font-pixel text-retro-lightgray text-[9px] leading-loose mb-4">
            {result.description}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-retro-black p-2">
              <div className="font-pixel text-retro-gray text-[7px]">
                Difficulty
              </div>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${
                      i < result.difficulty
                        ? "text-retro-yellow"
                        : "text-retro-darkgray"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-retro-black p-2">
              <div className="font-pixel text-retro-gray text-[7px]">
                XP Reward
              </div>
              <div className="font-pixel text-retro-lime text-xs mt-1">
                +{result.xp_reward}
              </div>
            </div>
            <div className="bg-retro-black p-2">
              <div className="font-pixel text-retro-gray text-[7px]">
                Duration
              </div>
              <div className="font-pixel text-retro-cyan text-[9px] mt-1">
                {result.duration_label}
              </div>
            </div>
            <div className="bg-retro-black p-2">
              <div className="font-pixel text-retro-gray text-[7px]">
                Category
              </div>
              <div className="font-pixel text-retro-orange text-[9px] mt-1">
                {result.category}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <PixelButton variant="success" onClick={() => alert("Quest accepted! (Supabase integration coming soon)")}>
              ✓ Accept Quest
            </PixelButton>
            <PixelButton variant="secondary" onClick={handleGenerate}>
              ↻ Regenerate
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
