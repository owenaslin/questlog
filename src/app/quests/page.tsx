"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QuestCard from "@/components/QuestCard";
import QuestCardSkeleton from "@/components/QuestCardSkeleton";
import SmartSuggestions from "@/components/SmartSuggestions";
import { ALL_QUESTS, getMainQuests, getSideQuests } from "@/lib/quests";
import { Quest, QuestSource } from "@/lib/types";
import {
  getCurrentUserId,
  getUserQuestProgressMap,
  mergeQuestWithProgress,
} from "@/lib/quest-progress";
import { buildAuthUrl } from "@/lib/auth-redirect";

const allQuests: Quest[] = ALL_QUESTS;

type TabType = "all" | "main" | "side";
type StatusFilter = "all" | "available" | "active" | "completed";

export default function QuestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<number>(0);
  const [sourceFilter, setSourceFilter] = useState<QuestSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [questsWithProgress, setQuestsWithProgress] = useState<Quest[]>(allQuests);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const hydrateProgress = async () => {
      setIsLoadingProgress(true);
      const userId = await getCurrentUserId();

      if (!userId) {
        setIsAuthenticated(false);
        setQuestsWithProgress(allQuests);
        setIsLoadingProgress(false);
        return;
      }

      setIsAuthenticated(true);
      const progressMap = await getUserQuestProgressMap();
      setQuestsWithProgress(mergeQuestWithProgress(allQuests, progressMap));
      setIsLoadingProgress(false);
    };

    hydrateProgress();
  }, []);

  const filteredQuests = useMemo(() => {
    return questsWithProgress.filter((q) => {
      if (activeTab !== "all" && q.type !== activeTab) return false;
      if (difficultyFilter > 0 && q.difficulty !== difficultyFilter)
        return false;
      if (sourceFilter !== "all" && q.source !== sourceFilter) return false;
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      return true;
    });
  }, [activeTab, difficultyFilter, sourceFilter, statusFilter, questsWithProgress]);

  const activeQuests = useMemo(
    () => questsWithProgress.filter((q) => q.status === "active"),
    [questsWithProgress]
  );
  const availableSideQuests = useMemo(
    () => questsWithProgress.filter((q) => q.status === "available" && q.type === "side"),
    [questsWithProgress]
  );
  const todayPrimaryQuest = activeQuests[0] || availableSideQuests[0] || null;
  const todayQuickQuests = availableSideQuests.slice(0, 3);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "all", label: "All Quests", icon: "📜" },
    { key: "main", label: "Main Quests", icon: "⚔" },
    { key: "side", label: "Side Quests", icon: "🗡" },
  ];

  const mainQuestCount = getMainQuests().length;
  const sideQuestCount = getSideQuests().length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-pixel text-retro-yellow text-xl mb-2">
            ⚔ Quest Board
          </h1>
          <p className="font-pixel text-retro-lightgray text-[9px]">
            {mainQuestCount} Main Quests • {sideQuestCount} Side Quests • {allQuests.length} Total
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/categories"
            className="font-pixel text-[9px] px-4 py-2 bg-retro-darkgray text-retro-lightgray border-b-4 border-retro-black hover:bg-retro-gray transition-none"
          >
            🗂️ Categories
          </Link>
          <Link
            href="/questlines"
            className="font-pixel text-[9px] px-4 py-2 bg-retro-darkgray text-retro-lightgray border-b-4 border-retro-black hover:bg-retro-gray transition-none"
          >
            🗺️ Questlines
          </Link>
        </div>
      </div>

      {/* Today / Next Action */}
      <div className="mb-8 bg-retro-darkgray border-4 border-retro-black p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-retro-cyan text-sm">▶ Today</h2>
          {!isAuthenticated && (
            <Link
              href={buildAuthUrl("login", "/quests")}
              className="font-pixel text-retro-lightblue text-[8px] hover:text-retro-white"
            >
              Login to save progress
            </Link>
          )}
        </div>

        {isLoadingProgress ? (
          <p className="font-pixel text-retro-lightgray text-[8px]">Loading your progress...</p>
        ) : todayPrimaryQuest ? (
          <>
            <div className="bg-retro-black border-2 border-retro-darkpurple p-3 mb-4">
              <p className="font-pixel text-retro-gray text-[7px] mb-2 uppercase">Next Best Quest</p>
              <Link href={`/quests/${todayPrimaryQuest.id}`} className="block">
                <p className="font-pixel text-retro-yellow text-[10px] leading-relaxed mb-1">
                  {todayPrimaryQuest.title}
                </p>
                <p className="font-pixel text-retro-lightgray text-[7px]">
                  {todayPrimaryQuest.status === "active"
                    ? "Continue your active quest"
                    : "Quick win available now"}
                </p>
              </Link>
            </div>

            {todayQuickQuests.length > 0 && (
              <div>
                <p className="font-pixel text-retro-gray text-[7px] mb-2 uppercase">Quick Side Quests</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {todayQuickQuests.map((quest) => (
                    <Link
                      key={quest.id}
                      href={`/quests/${quest.id}`}
                      className="bg-retro-black border-2 border-retro-darkgray p-2 hover:border-retro-lightblue"
                    >
                      <p className="font-pixel text-retro-lightgray text-[8px] leading-relaxed line-clamp-2">
                        {quest.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="font-pixel text-retro-lightgray text-[8px]">
            No quests in progress yet. Pick one below to start your adventure.
          </p>
        )}

        {/* Smart Suggestions */}
        {isAuthenticated && (
          <div className="mt-4 pt-4 border-t-2 border-retro-black">
            <SmartSuggestions maxSuggestions={3} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-pixel text-[9px] px-4 py-2 transition-none ${
              activeTab === tab.key
                ? "bg-retro-darkpurple text-retro-yellow border-b-4 border-retro-yellow"
                : "bg-retro-darkgray text-retro-lightgray hover:bg-retro-gray border-b-4 border-retro-black"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 bg-retro-darkgray border-4 border-retro-black p-4">
        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Difficulty
          </label>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(Number(e.target.value))}
            className="font-pixel text-[9px]"
          >
            <option value={0}>All</option>
            <option value={1}>★ Easy</option>
            <option value={2}>★★ Medium</option>
            <option value={3}>★★★ Hard</option>
            <option value={4}>★★★★ Very Hard</option>
            <option value={5}>★★★★★ Legendary</option>
          </select>
        </div>

        <div>
          <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
            Source
          </label>
          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as QuestSource | "all")
            }
            className="font-pixel text-[9px]"
          >
            <option value="all">All Sources</option>
            <option value="predefined">★ Curated</option>
            <option value="user">✎ Custom</option>
            <option value="ai">⚡ AI Generated</option>
          </select>
        </div>

        {isAuthenticated && (
          <div>
            <label className="font-pixel text-retro-lightgray text-[8px] block mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="font-pixel text-[9px]"
            >
              <option value="all">All Status</option>
              <option value="available">● Available</option>
              <option value="active">▶ Active</option>
              <option value="completed">✓ Completed</option>
            </select>
          </div>
        )}

        <div className="flex items-end">
          <span className="font-pixel text-retro-cyan text-[8px]">
            {filteredQuests.length} quest
            {filteredQuests.length !== 1 ? "s" : ""} found
          </span>
        </div>
      </div>

      {/* Quest Grid */}
      {isLoadingProgress ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuestCardSkeleton count={6} />
        </div>
      ) : filteredQuests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {filteredQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🏜</div>
          <p className="font-pixel text-retro-lightgray text-xs">
            No quests match your filters.
          </p>
          <p className="font-pixel text-retro-gray text-[8px] mt-2">
            Try adjusting your search criteria.
          </p>
        </div>
      )}
    </div>
  );
}
