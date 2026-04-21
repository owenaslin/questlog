"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES, getCategoryByKey, ALL_QUESTS } from "@/lib/quests";
import { Category } from "@/lib/types";
import QuestCard from "@/components/QuestCard";

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categoryQuests = useMemo(() => {
    if (!selectedCategory) return [];
    return ALL_QUESTS.filter(
      (q) => q.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [selectedCategory]);

  const category = useMemo(
    () => (selectedCategory ? getCategoryByKey(selectedCategory) : null),
    [selectedCategory]
  );

  if (selectedCategory && category) {
    return (
      <div className="tavrn-panel p-4 md:p-6">
        {/* Back Button & Header */}
        <button
          onClick={() => setSelectedCategory(null)}
          className="font-pixel text-retro-lightgray text-[8px] hover:text-retro-white mb-4 inline-block"
        >
          ← Back to Categories
        </button>

        <div
          className="tavern-card p-6 mb-6"
          style={{ backgroundColor: `${category.color}33` }} // 33 = 20% opacity in hex
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 border-4 border-retro-black flex items-center justify-center text-4xl"
              style={{ backgroundColor: category.color }}
            >
              {category.icon}
            </div>
            <div>
              <h1 className="font-pixel text-retro-yellow text-xl">
                {category.name}
              </h1>
              <p className="font-pixel text-retro-lightgray text-[10px] mt-1">
                {category.quest_count} quests available
              </p>
            </div>
          </div>
          <p className="font-pixel text-retro-lightgray text-[10px] leading-relaxed">
            {category.description}
          </p>
        </div>

        {/* Quest Count */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-pixel text-retro-cyan text-[10px]">
            {categoryQuests.length} quests
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`font-pixel text-[8px] px-3 py-1 ${
                viewMode === "grid"
                  ? "bg-retro-darkpurple text-retro-white"
                  : "bg-retro-darkgray text-retro-lightgray"
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`font-pixel text-[8px] px-3 py-1 ${
                viewMode === "list"
                  ? "bg-retro-darkpurple text-retro-white"
                  : "bg-retro-darkgray text-retro-lightgray"
              }`}
            >
              ☰ List
            </button>
          </div>
        </div>

        {/* Quests */}
        {categoryQuests.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-3"
            }
          >
            {categoryQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🏜️</div>
            <p className="font-pixel text-retro-lightgray text-xs">
              No quests found in this category.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tavrn-panel p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-pixel text-retro-yellow text-xl mb-2">
          🗂️ Quest Categories
        </h1>
        <p className="font-pixel text-retro-lightgray text-[10px] max-w-2xl mx-auto leading-loose">
          Browse 120+ quests organized by category. Find adventures that match your interests and goals.
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.key}
            category={category}
            onClick={() => setSelectedCategory(category.key)}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="mt-12 tavern-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <span className="font-pixel text-retro-yellow text-2xl block">
              {ALL_QUESTS.length}
            </span>
            <span className="font-pixel text-retro-gray text-[8px]">Total Quests</span>
          </div>
          <div>
            <span className="font-pixel text-retro-cyan text-2xl block">
              {CATEGORIES.length}
            </span>
            <span className="font-pixel text-retro-gray text-[8px]">Categories</span>
          </div>
          <div>
            <span className="font-pixel text-retro-lime text-2xl block">
              {ALL_QUESTS.filter((q) => q.type === "main").length}
            </span>
            <span className="font-pixel text-retro-gray text-[8px]">Main Quests</span>
          </div>
          <div>
            <span className="font-pixel text-retro-orange text-2xl block">
              {ALL_QUESTS.filter((q) => q.type === "side").length}
            </span>
            <span className="font-pixel text-retro-gray text-[8px]">Side Quests</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  onClick,
}: {
  category: Category;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        bg-retro-darkgray border-4 border-retro-black
        shadow-pixel hover:shadow-pixel-lg
        hover:-translate-x-[2px] hover:-translate-y-[2px]
        transition-none p-4 text-left
        group
      "
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 border-4 border-retro-black flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
          style={{ backgroundColor: category.color }}
        >
          {category.icon}
        </div>
        <div>
          <h3 className="font-pixel text-retro-yellow text-xs">{category.name}</h3>
          <span className="font-pixel text-retro-gray text-[7px]">
            {category.quest_count} quests
          </span>
        </div>
      </div>
      <p className="font-pixel text-retro-lightgray text-[8px] leading-relaxed line-clamp-2">
        {category.description}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-pixel text-retro-cyan text-[8px]">
          Click to explore →
        </span>
      </div>
    </button>
  );
}
