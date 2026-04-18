"use client";

import React, { useState } from "react";
import QuestlineCard from "@/components/QuestlineCard";
import { QUESTLINES, getLinearQuestlines, getSkillTrees } from "@/lib/questlines";
import { QuestlineType } from "@/lib/types";

export default function QuestlinesPage() {
  const [filter, setFilter] = useState<QuestlineType | "all">("all");

  const filteredQuestlines = QUESTLINES.filter((q) => {
    if (filter === "all") return true;
    return q.type === filter;
  });

  const linearCount = getLinearQuestlines().length;
  const skillTreeCount = getSkillTrees().length;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-pixel text-retro-yellow text-xl mb-2">
          🗺️ Questlines
        </h1>
        <p className="font-pixel text-retro-lightgray text-[10px] max-w-2xl mx-auto leading-loose">
          Embark on epic journeys! Complete linear questlines step by step, or choose your path through skill trees.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
            ${filter === "all"
              ? "bg-retro-darkpurple text-retro-yellow border-retro-yellow"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          📜 All Questlines ({QUESTLINES.length})
        </button>
        <button
          onClick={() => setFilter("linear")}
          className={`
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
            ${filter === "linear"
              ? "bg-retro-blue text-retro-white border-retro-darkblue"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          📋 Linear ({linearCount})
        </button>
        <button
          onClick={() => setFilter("skill_tree")}
          className={`
            font-pixel text-[10px] px-4 py-2 border-b-4 transition-none
            ${filter === "skill_tree"
              ? "bg-retro-purple text-retro-white border-retro-darkpurple"
              : "bg-retro-darkgray text-retro-lightgray border-retro-black hover:bg-retro-gray"
            }
          `}
        >
          🌳 Skill Trees ({skillTreeCount})
        </button>
      </div>

      {/* Questline Grid */}
      {filteredQuestlines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuestlines.map((questline) => (
            <QuestlineCard key={questline.id} questline={questline} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🏜️</div>
          <p className="font-pixel text-retro-lightgray text-xs">
            No questlines found.
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 bg-retro-darkgray border-4 border-retro-black p-6">
        <h2 className="font-pixel text-retro-cyan text-sm mb-4">
          📖 What are Questlines?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-pixel text-retro-yellow text-xs mb-2">📋 Linear Questlines</h3>
            <p className="font-pixel text-retro-lightgray text-[9px] leading-relaxed">
              Complete quests in sequential order. Each quest unlocks the next step. Perfect for structured learning and progressive skill building.
            </p>
          </div>
          <div>
            <h3 className="font-pixel text-retro-yellow text-xs mb-2">🌳 Skill Trees</h3>
            <p className="font-pixel text-retro-lightgray text-[9px] leading-relaxed">
              Start with a foundation quest, then choose your specialization. Complete one branch or master them all. Great for exploring different paths.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
