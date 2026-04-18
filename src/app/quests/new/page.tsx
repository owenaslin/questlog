"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PixelButton from "@/components/PixelButton";
import { QuestType, calculateXP } from "@/lib/types";

export default function CreateQuestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<QuestType>("side");
  const [difficulty, setDifficulty] = useState(1);
  const [durationLabel, setDurationLabel] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const xpReward = calculateXP(type, difficulty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // In full version, this would save to Supabase
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-4xl mb-4">✨</div>
        <h1 className="font-pixel text-retro-lime text-lg mb-4">
          Quest Created!
        </h1>
        <p className="font-pixel text-retro-lightgray text-[10px] mb-6 leading-loose">
          &quot;{title}&quot; has been added to your quest log.
        </p>
        <div className="flex gap-4 justify-center">
          <PixelButton variant="primary" onClick={() => router.push("/quests")}>
            View Quests
          </PixelButton>
          <PixelButton
            variant="secondary"
            onClick={() => {
              setSubmitted(false);
              setTitle("");
              setDescription("");
              setType("side");
              setDifficulty(1);
              setDurationLabel("");
              setCategory("");
            }}
          >
            Create Another
          </PixelButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-pixel text-retro-yellow text-xl mb-8">
        ✏ Create Quest
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 flex flex-col gap-6"
      >
        {/* Title */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Quest Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quest name..."
            required
            className="w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the quest..."
            required
            rows={4}
            className="w-full"
          />
        </div>

        {/* Type */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Quest Type
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setType("main")}
              className={`font-pixel text-[9px] px-4 py-2 transition-none ${
                type === "main"
                  ? "bg-retro-red text-retro-white border-b-4 border-retro-darkpurple"
                  : "bg-retro-darkgray text-retro-lightgray border-b-4 border-retro-black hover:bg-retro-gray"
              }`}
            >
              ⚔ Main Quest
            </button>
            <button
              type="button"
              onClick={() => setType("side")}
              className={`font-pixel text-[9px] px-4 py-2 transition-none ${
                type === "side"
                  ? "bg-retro-blue text-retro-white border-b-4 border-retro-darkblue"
                  : "bg-retro-darkgray text-retro-lightgray border-b-4 border-retro-black hover:bg-retro-gray"
              }`}
            >
              🗡 Side Quest
            </button>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Difficulty ({difficulty}/5)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`text-xl transition-none cursor-pointer ${
                  d <= difficulty ? "text-retro-yellow" : "text-retro-darkgray"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="font-pixel text-retro-lime text-[8px] mt-2">
            XP Reward: +{xpReward}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Duration
          </label>
          <input
            type="text"
            value={durationLabel}
            onChange={(e) => setDurationLabel(e.target.value)}
            placeholder="e.g., 1-2 hours, 1 weekend, 3 months..."
            required
            className="w-full"
          />
        </div>

        {/* Category */}
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full"
          >
            <option value="">Select category...</option>
            <option value="Fitness">Fitness</option>
            <option value="Education">Education</option>
            <option value="Creative">Creative</option>
            <option value="Tech">Tech</option>
            <option value="Food">Food</option>
            <option value="Outdoors">Outdoors</option>
            <option value="Social">Social</option>
            <option value="Wellness">Wellness</option>
            <option value="Community">Community</option>
            <option value="Career">Career</option>
            <option value="Business">Business</option>
            <option value="Culture">Culture</option>
            <option value="Productivity">Productivity</option>
          </select>
        </div>

        <PixelButton variant="success" size="lg" type="submit">
          Create Quest
        </PixelButton>
      </form>
    </div>
  );
}
