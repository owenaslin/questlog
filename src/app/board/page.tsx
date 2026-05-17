"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import QuestCard from "@/components/quest/QuestCard";
import QuestCardSkeleton from "@/components/ui/QuestCardSkeleton";
import SmartSuggestions from "@/components/quest/SmartSuggestions";
import DesktopRightRail from "@/components/layout/DesktopRightRail";
import PullToRefresh from "@/components/ui/PullToRefresh";
import QuestForge from "@/components/quest/QuestForge";
import AmbientScene from "@/components/ui/AmbientScene";
import { useViewMode } from "@/components/ui/ViewModeProvider";
import { ALL_QUESTS, getMainQuests, getSideQuests } from "@/lib/quests";
import { Quest, QuestSource } from "@/lib/types";
import {
  getCurrentUserId,
  getUserQuestProgressMap,
  mergeQuestWithProgress,
  acceptQuest,
  abandonAndAccept,
} from "@/lib/quest-progress";
import { buildAuthUrl } from "@/lib/auth-redirect";

function QuickAcceptButton({
  quest,
  activeMainQuestId,
  onAccepted,
  onAcceptStart,
  onAcceptEnd,
  inline = false,
}: {
  quest: Quest;
  activeMainQuestId: string | null;
  onAccepted: (questId: string) => void;
  onAcceptStart?: () => void;
  onAcceptEnd?: () => void;
  inline?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  if (quest.status !== "available") return null;

  const isMainBlocked = quest.type === "main" && activeMainQuestId !== null;

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    if (isMainBlocked) {
      setShowConflict(true);
      return;
    }

    onAcceptStart?.();
    setLoading(true);
    try {
      const result = await acceptQuest(quest.id, quest.type, quest.category);
      if (result.success) onAccepted(quest.id);
    } finally {
      setLoading(false);
      onAcceptEnd?.();
    }
  };

  const handleAbandonAndAccept = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeMainQuestId) return;
    onAcceptStart?.();
    setLoading(true);
    setShowConflict(false);
    try {
      const result = await abandonAndAccept(activeMainQuestId, quest.id, quest.type, quest.category);
      if (result.success) onAccepted(quest.id);
    } finally {
      setLoading(false);
      onAcceptEnd?.();
    }
  };

  if (showConflict) {
    const conflictContent = (
      <div onClick={(e) => e.preventDefault()}>
        <p className="text-body-sm text-tavern-ember mb-2 leading-snug">
          Abandon your current main quest and start this one?
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleAbandonAndAccept}
            disabled={loading}
            className="tavrn-btn tavrn-btn-danger tavrn-btn-sm disabled:opacity-50"
          >
            Abandon &amp; Accept
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConflict(false); }}
            className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );

    return inline ? (
      <div className="mt-2 p-2 border border-tavern-ember bg-black/60">{conflictContent}</div>
    ) : (
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/90 border-t-2 border-tavern-ember p-2">
        {conflictContent}
      </div>
    );
  }

  const btnClass = `text-body-sm px-2 py-1 border transition-none disabled:opacity-50 rounded ${
    isMainBlocked
      ? "border-tavern-oak/50 text-tavern-parchment-dim cursor-not-allowed bg-black/40"
      : "border-tavern-gold bg-black/80 text-tavern-gold hover:bg-tavern-gold hover:text-black"
  }`;

  return inline ? (
    <button
      type="button"
      onClick={handleAccept}
      disabled={loading}
      title={isMainBlocked ? "Finish your current main quest first" : undefined}
      className={btnClass}
    >
      {loading ? "…" : isMainBlocked ? "🔒 Blocked" : "⚡ Accept"}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleAccept}
      disabled={loading}
      title={isMainBlocked ? "Finish your current main quest first" : `Accept "${quest.title}"`}
      className={`absolute bottom-2 right-2 z-10 ${btnClass}`}
    >
      {loading ? "…" : isMainBlocked ? "🔒" : "⚡ Accept"}
    </button>
  );
}

const allQuests: Quest[] = ALL_QUESTS;

const QUEST_TABS: { key: TabType; label: string; icon: string }[] = [
  { key: "all", label: "All Quests", icon: "📜" },
  { key: "main", label: "Main Quests", icon: "⚔" },
  { key: "side", label: "Side Quests", icon: "🗡" },
];

const MAIN_QUEST_COUNT = getMainQuests().length;
const SIDE_QUEST_COUNT = getSideQuests().length;

type TabType = "all" | "main" | "side";
type StatusFilter = "all" | "available" | "active" | "completed";

export default function QuestsPage() {
  const { isDesktopActive } = useViewMode();
  const pendingWriteRef = useRef(false);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<number>(0);
  const [sourceFilter, setSourceFilter] = useState<QuestSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [questsWithProgress, setQuestsWithProgress] = useState<Quest[]>(allQuests);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const hydrateProgress = async () => {
      setIsLoadingProgress(true);
      const userId = await getCurrentUserId();

      if (!mounted) return;

      if (!userId) {
        setIsAuthenticated(false);
        setQuestsWithProgress(allQuests);
        setIsLoadingProgress(false);
        return;
      }

      setIsAuthenticated(true);
      const progressMap = await getUserQuestProgressMap();
      if (!mounted) return;
      if (!pendingWriteRef.current) {
        setQuestsWithProgress(mergeQuestWithProgress(allQuests, progressMap));
      }
      setIsLoadingProgress(false);
    };

    hydrateProgress();
    return () => { mounted = false; };
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoadingProgress(true);

    const progressMap = await getUserQuestProgressMap();
    setQuestsWithProgress(mergeQuestWithProgress(allQuests, progressMap));

    setIsLoadingProgress(false);
  }, [isAuthenticated]);

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

  const activeMainQuestId = useMemo(
    () => questsWithProgress.find((q) => q.status === "active" && q.type === "main")?.id ?? null,
    [questsWithProgress]
  );

  const handleQuickAccepted = useCallback((questId: string) => {
    setQuestsWithProgress((prev) =>
      prev.map((q) => q.id === questId ? { ...q, status: "active" as const } : q)
    );
  }, []);
  const availableSideQuests = useMemo(
    () => questsWithProgress.filter((q) => q.status === "available" && q.type === "side"),
    [questsWithProgress]
  );
  const todayPrimaryQuest = activeQuests[0] || availableSideQuests[0] || null;
  const todayQuickQuests = availableSideQuests.slice(0, 3);

  const selectedQuest = useMemo(
    () => filteredQuests.find((quest) => quest.id === selectedQuestId) ?? filteredQuests[0] ?? null,
    [filteredQuests, selectedQuestId]
  );

  useEffect(() => {
    if (!filteredQuests.length) {
      setSelectedQuestId(null);
      return;
    }

    setSelectedQuestId((prev) => {
      if (prev && filteredQuests.some((quest) => quest.id === prev)) {
        return prev;
      }
      return filteredQuests[0].id;
    });
  }, [filteredQuests]);

  return (
    <div className="tavrn-panel p-4 md:p-6">
      <AmbientScene scene="common-room" />
      <PullToRefresh onRefresh={handleRefresh} disabled={!isAuthenticated}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="tavrn-wordmark text-4xl leading-none mb-2">
            ⚔ Quest Board
          </h1>
          <p className="text-body-sm text-[--parchment-dim]">
            {MAIN_QUEST_COUNT} Main Quests • {SIDE_QUEST_COUNT} Side Quests • {allQuests.length} Total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setForgeOpen(true)}
            className="tavrn-btn tavrn-btn-primary"
          >
            🔨 Forge a Quest
          </button>
          <Link href="/guilds" className="tavrn-btn tavrn-btn-ghost">
            🗂️ Guilds
          </Link>
          <Link href="/sagas" className="tavrn-btn tavrn-btn-ghost">
            🗺️ Sagas
          </Link>
        </div>
      </div>

      {/* Today / Next Action */}
      <div className="mb-8 tavern-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="kicker">▶ Today</h2>
          {!isAuthenticated && (
            <Link
              href={buildAuthUrl("login", "/board")}
              className="text-body-sm text-retro-lightblue hover:text-retro-white"
            >
              Login to save progress
            </Link>
          )}
        </div>

        {isLoadingProgress ? (
          <p className="text-body-sm text-[--parchment-dim]">Loading your progress...</p>
        ) : todayPrimaryQuest ? (
          <>
            <div className="bg-retro-black border-2 border-retro-darkpurple p-3 mb-4">
              <p className="kicker mb-2">Next Best Quest</p>
              <Link href={`/board/${todayPrimaryQuest.id}`} className="block">
                <p className="text-body-sm font-semibold text-retro-yellow leading-snug mb-1">
                  {todayPrimaryQuest.title}
                </p>
                <p className="text-body-sm text-[--parchment-dim]">
                  {todayPrimaryQuest.status === "active"
                    ? "Continue your active quest"
                    : "Quick win available now"}
                </p>
              </Link>
            </div>

            {todayQuickQuests.length > 0 && (
              <div>
                <p className="kicker mb-2">Quick Side Quests</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {todayQuickQuests.map((quest) => (
                    <Link
                      key={quest.id}
                      href={`/board/${quest.id}`}
                      className="bg-retro-black border-2 border-retro-darkgray p-2 hover:border-retro-lightblue"
                    >
                      <p className="text-body-sm text-[--parchment-dim] leading-relaxed line-clamp-2">
                        {quest.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-body-sm text-[--parchment-dim]">
            No quests in progress yet. Pick one below to start your adventure.
          </p>
        )}

        {/* Smart Suggestions */}
        {isAuthenticated && !isDesktopActive && (
          <div className="mt-4 pt-4 border-t-2 border-retro-black">
            <SmartSuggestions maxSuggestions={3} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" role="tablist" aria-label="Quest type">
        {QUEST_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-body-sm font-medium px-4 py-2 transition-none ${
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
      <div className="flex flex-wrap gap-4 mb-8 tavern-card p-4">
        <div>
          <label htmlFor="filter-difficulty" className="text-body-sm font-medium text-[--parchment-dim] block mb-2">
            Difficulty
          </label>
          <select
            id="filter-difficulty"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(Number(e.target.value))}
            className="text-body-sm"
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
          <label htmlFor="filter-source" className="text-body-sm font-medium text-[--parchment-dim] block mb-2">
            Source
          </label>
          <select
            id="filter-source"
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as QuestSource | "all")
            }
            className="text-body-sm"
          >
            <option value="all">All Sources</option>
            <option value="predefined">★ Curated</option>
            <option value="user">✎ Custom</option>
            <option value="ai">⚡ AI Generated</option>
          </select>
        </div>

        {isAuthenticated && (
          <div>
            <label htmlFor="filter-status" className="text-body-sm font-medium text-[--parchment-dim] block mb-2">
              Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-body-sm"
            >
              <option value="all">All Status</option>
              <option value="available">● Available</option>
              <option value="active">▶ Active</option>
              <option value="completed">✓ Completed</option>
            </select>
          </div>
        )}

        <div className="flex items-end">
          <span className="text-body-sm text-retro-cyan">
            {filteredQuests.length} quest
            {filteredQuests.length !== 1 ? "s" : ""} found
          </span>
        </div>
      </div>

      {isDesktopActive ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          {isLoadingProgress ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <QuestCardSkeleton count={6} />
            </div>
          ) : filteredQuests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] gap-4">
              <section className="tavern-card p-3 h-[68vh] overflow-y-auto">
                <h3 className="kicker text-tavern-gold mb-3">
                  Quest List
                </h3>
                <div className="flex flex-col gap-2">
                  {filteredQuests.map((quest) => {
                    const isSelected = selectedQuest?.id === quest.id;
                    return (
                      <button
                        key={quest.id}
                        type="button"
                        onClick={() => setSelectedQuestId(quest.id)}
                        className={`group relative text-left border-2 px-3 py-2 transition-none ${
                          isSelected
                            ? "border-tavern-gold bg-tavern-smoke"
                            : "border-tavern-oak bg-retro-darkgray hover:border-tavern-parchment"
                        }`}
                      >
                        <p className="text-body-sm font-semibold text-tavern-gold mb-1 line-clamp-1">{quest.title}</p>
                        <p className="text-body-sm text-[--parchment-dim] line-clamp-1">{quest.category}</p>
                        <p className="text-body-sm text-retro-cyan mt-1">+{quest.xp_reward} XP</p>

                        <div className="pointer-events-none absolute left-full top-1/2 z-20 hidden w-64 -translate-y-1/2 ml-3 group-hover:block">
                          <div className="parchment-card p-3">
                            <p className="text-body-sm font-semibold text-tavern-gold mb-2 line-clamp-2">{quest.title}</p>
                            <p className="text-body-sm text-tavern-parchment leading-relaxed line-clamp-3 mb-2">
                              {quest.description}
                            </p>
                            <p className="text-body-sm text-retro-cyan">{quest.duration_label}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="tavern-card p-5 min-h-[68vh]">
                {selectedQuest ? (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-subhead text-tavern-gold leading-snug mb-2">{selectedQuest.title}</h3>
                        <p className="kicker">
                          {selectedQuest.type === "main" ? "⚔ Main Quest" : "🗡 Side Quest"} • {selectedQuest.category}
                        </p>
                      </div>
                      <span className="badge badge-lime">+{selectedQuest.xp_reward} XP</span>
                    </div>

                    <p className="text-body text-[--parchment-dim] leading-relaxed mb-4">
                      {selectedQuest.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-retro-black border-2 border-retro-darkgray p-2">
                        <p className="kicker mb-1">Difficulty</p>
                        <p className="text-body-sm text-retro-yellow">{"★".repeat(selectedQuest.difficulty)}</p>
                      </div>
                      <div className="bg-retro-black border-2 border-retro-darkgray p-2">
                        <p className="kicker mb-1">Duration</p>
                        <p className="text-body-sm text-retro-cyan">{selectedQuest.duration_label}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href={`/board/${selectedQuest.id}`}
                        className="tavrn-btn tavrn-btn-ghost"
                      >
                        Open Details
                      </Link>
                      {isAuthenticated && selectedQuest.status === "available" && (
                        <QuickAcceptButton
                          quest={selectedQuest}
                          activeMainQuestId={activeMainQuestId}
                          onAccepted={handleQuickAccepted}
                          onAcceptStart={() => { pendingWriteRef.current = true; }}
                          onAcceptEnd={() => { pendingWriteRef.current = false; }}
                          inline
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-body-sm text-[--parchment-dim]">Select a quest to inspect it.</p>
                )}
              </section>
            </div>
          ) : (
            <div className="text-center py-16 xl:pr-4">
              <div className="text-4xl mb-4">🏜</div>
              <p className="text-body-sm text-[--parchment-dim]">No quests match your filters.</p>
              <p className="text-body-sm text-retro-gray mt-2">Try adjusting your search criteria.</p>
            </div>
          )}

          <DesktopRightRail title="Today at the Tavern">
            {todayPrimaryQuest ? (
              <Link
                href={`/board/${todayPrimaryQuest.id}`}
                className="bg-retro-black border-2 border-retro-darkpurple p-3 hover:border-tavern-gold"
              >
                <p className="kicker mb-1">Next Best Quest</p>
                <p className="text-body-sm font-medium text-retro-yellow leading-snug line-clamp-2">
                  {todayPrimaryQuest.title}
                </p>
              </Link>
            ) : (
              <p className="text-body-sm text-[--parchment-dim]">Pick a quest to begin your session.</p>
            )}

            <div className="bg-retro-black border-2 border-retro-darkgray p-3">
              <p className="kicker mb-2">Quick Stats</p>
              <p className="text-body-sm text-retro-cyan mb-1">Active: {activeQuests.length}</p>
              <p className="text-body-sm text-retro-lime mb-1">Available Side: {availableSideQuests.length}</p>
              <p className="text-body-sm text-retro-lightblue">Filtered: {filteredQuests.length}</p>
            </div>

            {isAuthenticated && (
              <div className="bg-retro-black border-2 border-retro-darkgray p-3">
                <SmartSuggestions maxSuggestions={2} />
              </div>
            )}
          </DesktopRightRail>
        </div>
      ) : (
        /* Quest Grid */
        isLoadingProgress ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuestCardSkeleton count={6} />
          </div>
        ) : filteredQuests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {filteredQuests.map((quest) => (
              <div key={quest.id} className="relative">
                <QuestCard quest={quest} />
                {isAuthenticated && (
                  <QuickAcceptButton
                    quest={quest}
                    activeMainQuestId={activeMainQuestId}
                    onAccepted={handleQuickAccepted}
                    onAcceptStart={() => { pendingWriteRef.current = true; }}
                    onAcceptEnd={() => { pendingWriteRef.current = false; }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🏜</div>
            <p className="text-body-sm text-[--parchment-dim]">
              No quests match your filters.
            </p>
            <p className="text-body-sm text-retro-gray mt-2">
              Try adjusting your search criteria.
            </p>
          </div>
        )
      )}

      </PullToRefresh>

      <QuestForge
        isOpen={forgeOpen}
        onClose={() => setForgeOpen(false)}
      />
    </div>
  );
}
