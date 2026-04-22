"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HabitWithStatus } from "@/lib/types";
import { getHabitsForToday, getHabitsSummary } from "@/lib/habits";
import { completeHabit, uncompleteHabit } from "@/lib/habits";
import HabitCheck from "./HabitCheck";

interface DailyHabitsWidgetProps {
  maxDisplay?: number;
}

export default function DailyHabitsWidget({ maxDisplay = 5 }: DailyHabitsWidgetProps) {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [summary, setSummary] = useState({
    totalScheduled: 0,
    completed: 0,
    loading: true,
  });
  const [loadingHabitId, setLoadingHabitId] = useState<string | null>(null);
  const [xpAnimations, setXpAnimations] = useState<{ id: string; amount: number }[]>([]);

  const loadData = useCallback(async () => {
    const [todayHabits, habitsSummary] = await Promise.all([
      getHabitsForToday(),
      getHabitsSummary(),
    ]);

    setHabits(todayHabits);
    setSummary({
      totalScheduled: todayHabits.length,
      completed: todayHabits.filter((h) => h.is_completed_today).length,
      loading: false,
    });
  }, []);

  useEffect(() => {
    loadData();
    // Refresh every minute in case date changes
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleToggle = async (habit: HabitWithStatus) => {
    if (loadingHabitId) return;

    setLoadingHabitId(habit.id);

    if (habit.is_completed_today) {
      const result = await uncompleteHabit(habit.id);
      if (result.success) {
        await loadData();
      }
    } else {
      const result = await completeHabit(habit.id);
      if (result.success && result.xpAwarded) {
        // Show XP animation
        setXpAnimations((prev) => [
          ...prev,
          { id: habit.id, amount: result.xpAwarded! },
        ]);
        setTimeout(() => {
          setXpAnimations((prev) => prev.filter((a) => a.id !== habit.id));
        }, 2000);
        await loadData();
      }
    }

    setLoadingHabitId(null);
  };

  const progressPercent =
    summary.totalScheduled > 0
      ? (summary.completed / summary.totalScheduled) * 100
      : 0;

  const displayedHabits = habits.slice(0, maxDisplay);
  const hasMore = habits.length > maxDisplay;

  if (summary.loading) {
    return (
      <div className="tavrn-panel p-4 animate-pulse">
        <div className="h-4 bg-tavern-oak/50 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-tavern-oak/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - no habits created yet
  if (habits.length === 0 && !summary.loading) {
    return (
      <div className="tavrn-panel p-4">
        <p className="tavrn-kicker mb-3">Daily Habits</p>
        <div className="text-center py-4">
          <p className="text-sm text-tavern-parchment-dim mb-2">
            No habits scheduled for today
          </p>
          <Link
            href="/habits/new"
            className="tavrn-button text-[9px] inline-block"
          >
            Create Your First Habit
          </Link>
        </div>
      </div>
    );
  }

  // All caught up state
  const allCompleted = summary.completed === summary.totalScheduled && summary.totalScheduled > 0;

  return (
    <div className="tavrn-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="tavrn-kicker">Daily Habits</p>
        {allCompleted && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs text-tavern-gold"
          >
            ✨ All done!
          </motion.span>
        )}
      </div>

      {/* Progress bar */}
      {summary.totalScheduled > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-tavern-parchment-dim mb-1">
            <span>
              {summary.completed}/{summary.totalScheduled} completed
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-tavern-oak/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-tavern-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
        </div>
      )}

      {/* Habits list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayedHabits.map((habit) => (
            <motion.div
              key={habit.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`
                flex items-center gap-3 p-2 rounded-lg border transition-all
                ${habit.is_completed_today
                  ? "border-tavern-gold/30 bg-tavern-gold/5"
                  : "border-tavern-oak/50 bg-tavern-smoke/30 hover:border-tavern-gold/30"
                }
              `}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: habit.color }}
              >
                {habit.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${
                    habit.is_completed_today ? "line-through opacity-60" : ""
                  }`}
                >
                  {habit.title}
                </p>
                {habit.streak && habit.streak.current_streak > 0 && (
                  <p className="text-[10px] text-tavern-gold">
                    {habit.streak.current_streak} day streak 🔥
                  </p>
                )}
              </div>

              {/* XP badge */}
              <AnimatePresence>
                {xpAnimations.find((a) => a.id === habit.id) && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: -5 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute right-14 text-xs text-retro-lime font-pixel"
                  >
                    +{habit.xp_reward} XP
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Checkbox */}
              <HabitCheck
                checked={habit.is_completed_today}
                onChange={() => handleToggle(habit)}
                disabled={loadingHabitId === habit.id}
                size="md"
                color={habit.color}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer links */}
      <div className="mt-3 pt-3 border-t border-tavern-oak/30 flex items-center justify-between">
        {hasMore ? (
          <Link
            href="/habits"
            className="text-xs text-tavern-gold hover:text-tavern-candle"
          >
            +{habits.length - maxDisplay} more habits
          </Link>
        ) : (
          <span />
        )}
        <Link
          href="/habits"
          className="tavrn-button text-[8px] !py-1.5 !px-2.5"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}
