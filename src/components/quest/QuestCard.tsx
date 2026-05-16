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
    <span className={`badge ${type === "main" ? "badge-ember" : "badge-blue"}`}>
      {type === "main" ? "⚔ Main" : "🗡 Side"}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    predefined: "★ Curated",
    user: "✎ Custom",
    ai: "⚡ AI",
  };
  const variants: Record<string, string> = {
    predefined: "badge-muted",
    user: "badge-gold",
    ai: "badge-purple",
  };
  return (
    <span className={`badge ${variants[source] || "badge-muted"}`}>
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
      <span className="text-body-sm text-[--parchment-dim] uppercase">
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
        <h3 className="text-subhead text-tavern-gold leading-snug">
          {quest.title}
        </h3>

        {/* Description */}
        <p className="text-body-sm text-[--parchment-dim] leading-relaxed line-clamp-2">
          {quest.description}
        </p>

        {/* Difficulty & XP */}
        <div className="flex items-center justify-between mt-auto">
          <DifficultySwords difficulty={quest.difficulty} />
          <span className="badge badge-lime">+{quest.xp_reward} XP</span>
        </div>

        {/* Duration & Category */}
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-[--parchment-dim]">
            ⏱ {quest.duration_label}
          </span>
          <CategoryBadge category={quest.category} />
        </div>

        {/* Status */}
        {quest.status !== "available" && (
          <div
            className={`w-full text-body-sm text-center py-1.5 ${
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
