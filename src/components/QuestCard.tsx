"use client";

import React from "react";
import Link from "next/link";
import { Quest } from "@/lib/types";
import { getCategoryByKey } from "@/lib/quests";

interface QuestCardProps {
  quest: Quest;
}

function DifficultySwords({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex items-end gap-[3px]" title={`Difficulty: ${difficulty}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`sword-icon${i < difficulty ? " active" : ""}`}
          style={{ height: `${10 + i * 2}px`, width: "6px" }}
        />
      ))}
    </div>
  );
}

function QuestTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`font-pixel text-[8px] px-2 py-1 uppercase tracking-wider ${
        type === "main"
          ? "bg-retro-red text-retro-white"
          : "bg-retro-blue text-retro-white"
      }`}
    >
      {type === "main" ? "⚔ Main" : "🗡 Side"}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    predefined: "bg-retro-darkgreen text-retro-white",
    user: "bg-retro-orange text-retro-black",
    ai: "bg-retro-darkpurple text-retro-white",
  };
  const labels: Record<string, string> = {
    predefined: "★ Curated",
    user: "✎ Custom",
    ai: "⚡ AI",
  };
  return (
    <span
      className={`font-pixel text-[7px] px-2 py-1 uppercase ${styles[source] || ""}`}
    >
      {labels[source] || source}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const categoryData = getCategoryByKey(category);
  
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-5 h-5 flex items-center justify-center text-[10px] border-2 border-retro-black"
        style={{ backgroundColor: categoryData?.color || "#6b7280" }}
      >
        {categoryData?.icon || "📜"}
      </span>
      <span className="font-pixel text-retro-cyan text-[8px] uppercase">
        {category}
      </span>
    </div>
  );
}

export default function QuestCard({ quest }: QuestCardProps) {
  return (
    <Link href={`/quests/${quest.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-blue active:scale-[0.98] transition-transform">
      <article
        className="
          tavern-card-wood
          hover:shadow-pixel-lg
          card-lift cursor-pointer
          p-4 md:p-4 flex flex-col gap-3
          h-full min-h-[120px] md:min-h-0
          relative overflow-hidden
        "
      >
        {/* Top badge row */}
        <div className="flex items-start justify-between gap-2">
          <QuestTypeBadge type={quest.type} />
          <SourceBadge source={quest.source} />
        </div>

        {/* Mobile-optimized tap target overlay */}
        <div className="md:hidden absolute inset-0" aria-hidden="true" />

        {/* Title */}
        <h3 className="font-pixel text-tavern-gold text-xs leading-relaxed">
          {quest.title}
        </h3>

        {/* Description */}
        <p className="text-retro-lightgray text-[10px] font-pixel leading-relaxed line-clamp-2">
          {quest.description}
        </p>

        {/* Difficulty & XP */}
        <div className="flex items-center justify-between mt-auto">
          <DifficultySwords difficulty={quest.difficulty} />
          <span className="font-pixel text-retro-lime text-[10px]">
            +{quest.xp_reward} XP
          </span>
        </div>

        {/* Duration & Category */}
        <div className="flex items-center justify-between">
          <span className="font-pixel text-retro-lightgray text-[8px]">
            ⏱ {quest.duration_label}
          </span>
          <CategoryBadge category={quest.category} />
        </div>

        {/* Status — wax seal style */}
        {quest.status !== "available" && (
          <div
            className={`wax-seal w-full font-pixel text-[7px] text-center py-1.5 uppercase tracking-wider ${
              quest.status === "active"
                ? "bg-retro-orange text-retro-black"
                : "bg-retro-darkgreen text-retro-white"
            }`}
            style={{ boxShadow: "2px 2px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}
            role="status"
            aria-label={quest.status === "active" ? "Quest in progress" : "Quest completed"}
          >
            {quest.status === "active" ? "▶ In Progress" : "✓ Completed"}
          </div>
        )}
      </article>
    </Link>
  );
}
