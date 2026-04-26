"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useSpring, animated, useTrail, config } from "@react-spring/web";
import { HabitWithStatus } from "@/lib/types";
import { getUserHabits, toggleHabitActive, updateHabitOrder } from "@/lib/habits";
import HabitCard from "@/components/HabitCard";
import { getSupabaseClient } from "@/lib/supabase";

function HabitCardWithReorder({
  habit,
  index,
  total,
  isReorderMode,
  onMove,
  onUpdate,
  onToggleActive,
}: {
  habit: HabitWithStatus;
  index: number;
  total: number;
  isReorderMode: boolean;
  onMove: (habitId: string, direction: "up" | "down") => void;
  onUpdate: () => void;
  onToggleActive: (habit: HabitWithStatus) => void;
}) {
  const cardSpring = useSpring({ opacity: 1, scale: 1, config: config.default });

  return (
    <animated.div style={cardSpring}>
      <div className="relative">
        <HabitCard habit={habit} onUpdate={onUpdate} variant="default" />

        {isReorderMode && total > 1 && (
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onMove(habit.id, "up")}
              disabled={index === 0}
              className="text-[9px] px-2 py-1 rounded bg-tavern-oak/50 text-tavern-parchment-dim hover:bg-tavern-oak disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove(habit.id, "down")}
              disabled={index === total - 1}
              className="text-[9px] px-2 py-1 rounded bg-tavern-oak/50 text-tavern-parchment-dim hover:bg-tavern-oak disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↓
            </button>
          </div>
        )}

        {!isReorderMode && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onToggleActive(habit)}
              className="text-[9px] text-tavern-parchment-dim hover:text-tavern-gold transition-colors"
            >
              {habit.is_active ? "Pause" : "Resume"}
            </button>
          </div>
        )}
      </div>
    </animated.div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("active");
  const [isReorderMode, setIsReorderMode] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadHabits = useCallback(async () => {
    setIsLoading(true);
    const allHabits = await getUserHabits({ activeOnly: false });
    if (!mountedRef.current) return;
    setHabits(allHabits);
    setIsLoading(false);
  }, []);

  const stats = useMemo(() => ({
    total: habits.length,
    active: habits.filter((h) => h.is_active).length,
    paused: habits.filter((h) => !h.is_active).length,
    completedToday: habits.filter((h) => h.is_completed_today).length,
  }), [habits]);

  const dueToday = useMemo(() => habits.filter((h) => h.is_active && !h.is_completed_today), [habits]);
  const completedToday = useMemo(() => habits.filter((h) => h.is_active && h.is_completed_today), [habits]);

  useEffect(() => {
    let mounted = true;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const authed = !!data.session;
      setIsAuthenticated(authed);
      if (authed) loadHabits();
      else setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [loadHabits]);

  const handleToggleActive = async (habit: HabitWithStatus) => {
    const result = await toggleHabitActive(habit.id, !habit.is_active);
    if (result.success) await loadHabits();
  };

  const filteredHabits = useMemo(() => habits.filter((h) => {
    if (filter === "active") return h.is_active;
    if (filter === "paused") return !h.is_active;
    return true;
  }), [habits, filter]);

  const habitAnimations = useTrail(filteredHabits.length, {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1 },
    config: config.default,
  });

  const handleReorder = async (newOrder: HabitWithStatus[]) => {
    // Reordering only persists when filter === "all"; filtered views show a subset
    if (filter !== "all") return;
    setHabits(newOrder);
    const orderUpdates = newOrder.map((h, index) => ({ id: h.id, sort_order: index }));
    await updateHabitOrder(orderUpdates);
  };

  const moveHabit = (habitId: string, direction: "up" | "down") => {
    if (filter !== "all") return;
    const idx = habits.findIndex((h) => h.id === habitId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === habits.length - 1) return;
    const newOrder = [...habits];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    handleReorder(newOrder);
  };

  if (isAuthenticated === false) {
    return (
      <div className="tavrn-panel p-8 text-center">
        <p className="font-pixel text-tavern-gold text-[10px] mb-3">📋 Habits</p>
        <p className="text-tavern-parchment mb-4">Sign in to track your daily habits and build streaks.</p>
        <Link href="/login" className="tavrn-button inline-block">Sign In</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="tavrn-panel p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-tavern-oak/50 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-tavern-oak/30 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state — no habits at all
  if (habits.length === 0) {
    return (
      <div className="tavrn-panel p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="tavrn-wordmark text-4xl leading-none">Your Habits</h1>
        </div>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⚡</div>
          <p className="font-pixel text-tavern-gold text-[10px] mb-2">No habits yet</p>
          <p className="text-[13px] text-tavern-parchment-dim mb-6 max-w-sm mx-auto">
            Small daily actions compound into big results. Create your first habit to start building streaks and earning XP.
          </p>
          <Link href="/habits/new" className="tavrn-button inline-block">
            + Create Your First Habit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tavrn-panel p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="tavrn-wordmark text-4xl leading-none mb-2">Your Habits</h1>
          <p className="text-sm text-tavern-parchment-dim">Build consistency, one day at a time</p>
        </div>
        <Link href="/habits/new" className="tavrn-button text-center">+ New Habit</Link>
      </div>

      {/* ── Due Today (primary section) ── */}
      {dueToday.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-pixel text-tavern-gold text-[9px] uppercase tracking-wide">
              Due Today
            </p>
            <span className="text-[11px] text-tavern-parchment-dim">
              {completedToday.length}/{dueToday.length + completedToday.length} done
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-tavern-oak/30 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-tavern-gold rounded-full transition-all duration-300"
              style={{
                width: `${dueToday.length + completedToday.length > 0
                  ? Math.round((completedToday.length / (dueToday.length + completedToday.length)) * 100)
                  : 0}%`
              }}
            />
          </div>
          <div className="space-y-3">
            {dueToday.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onUpdate={loadHabits} variant="default" />
            ))}
          </div>
        </div>
      )}

      {/* ── Completed Today ── */}
      {completedToday.length > 0 && (
        <div className="mb-6">
          <p className="font-pixel text-retro-lime text-[9px] uppercase tracking-wide mb-3">
            ✓ Completed Today ({completedToday.length})
          </p>
          <div className="space-y-3 opacity-70">
            {completedToday.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onUpdate={loadHabits} variant="default" />
            ))}
          </div>
        </div>
      )}

      {/* ── All habits with filter tabs (below the daily section) ── */}
      <div className="border-t border-tavern-oak/30 pt-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-pixel text-[9px] text-tavern-parchment-dim uppercase">All Habits</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["active", "paused", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`
                    px-3 py-1.5 rounded font-pixel text-[9px] transition-all
                    ${filter === f
                      ? "bg-tavern-gold text-tavern-smoke"
                      : "bg-tavern-oak/50 text-tavern-parchment-dim hover:bg-tavern-oak"
                    }
                  `}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === "active" && stats.active > 0 && ` (${stats.active})`}
                  {f === "paused" && stats.paused > 0 && ` (${stats.paused})`}
                </button>
              ))}
            </div>
            {filter === "all" && habits.length > 1 && (
              <button
                type="button"
                onClick={() => setIsReorderMode(!isReorderMode)}
                className={`
                  text-[9px] px-3 py-1.5 rounded transition-all
                  ${isReorderMode
                    ? "bg-tavern-gold text-tavern-smoke"
                    : "text-tavern-parchment-dim hover:text-tavern-parchment"
                  }
                `}
              >
                {isReorderMode ? "Done" : "Reorder"}
              </button>
            )}
          </div>
        </div>

        {filteredHabits.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-tavern-parchment-dim mb-2 text-[13px]">
              {filter === "active"
                ? "No active habits."
                : filter === "paused"
                  ? "No paused habits."
                  : "No habits yet."
              }
            </p>
            {filter === "active" && (
              <Link href="/habits/new" className="tavrn-button text-[9px] inline-block mt-2">
                Create Habit
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {habitAnimations.map((style, index) => (
              <animated.div key={filteredHabits[index].id} style={style}>
                <HabitCardWithReorder
                  habit={filteredHabits[index]}
                  index={index}
                  total={filteredHabits.length}
                  isReorderMode={isReorderMode && filter === "all"}
                  onMove={moveHabit}
                  onUpdate={loadHabits}
                  onToggleActive={handleToggleActive}
                />
              </animated.div>
            ))}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="mt-8 pt-6 border-t border-tavern-oak/30">
        <h2 className="font-pixel text-tavern-gold text-xs mb-3">💡 How Habits Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-tavern-parchment-dim">
          <div>
            <p className="text-tavern-parchment mb-1">Daily Check-ins</p>
            <p>Mark habits as complete each day to build streaks. You can check in any time until midnight.</p>
          </div>
          <div>
            <p className="text-tavern-parchment mb-1">Streaks</p>
            <p>Complete habits on consecutive scheduled days to build streaks. Miss a day and your streak resets.</p>
          </div>
          <div>
            <p className="text-tavern-parchment mb-1">XP Rewards</p>
            <p>Each completion earns 5-25 XP, contributing to your overall level. Small habits, big progress!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
