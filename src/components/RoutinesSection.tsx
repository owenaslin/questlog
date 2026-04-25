"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { HabitWithStatus } from "@/lib/types";
import { getHabitsForToday, completeHabit, uncompleteHabit } from "@/lib/habits";
import HabitCheck from "./HabitCheck";

export default function RoutinesSection() {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loadingHabitId, setLoadingHabitId] = useState<string | null>(null);
  const [hoursUntilReset, setHoursUntilReset] = useState<number>(0);

  const loadHabits = useCallback(async () => {
    const todayHabits = await getHabitsForToday();
    setHabits(todayHabits);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHabits();

    // Calculate hours until midnight
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const hours = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
      setHoursUntilReset(hours);
    };

    calculateTimeUntilReset();
    const interval = setInterval(calculateTimeUntilReset, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [loadHabits]);

  const handleToggle = async (habit: HabitWithStatus) => {
    if (loadingHabitId) return;

    setLoadingHabitId(habit.id);

    if (habit.is_completed_today) {
      const result = await uncompleteHabit(habit.id);
      if (result.success) await loadHabits();
    } else {
      const result = await completeHabit(habit.id);
      if (result.success) await loadHabits();
    }

    setLoadingHabitId(null);
  };

  const completedCount = habits.filter((h) => h.is_completed_today).length;
  const totalCount = habits.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  if (isLoading) {
    return (
      <div className="tavern-card p-4 mb-6">
        <div className="h-4 bg-tavern-oak/50 rounded w-1/4 mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-tavern-oak/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Don't show section if no habits exist
  if (habits.length === 0) {
    return (
      <div className="tavern-card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-pixel text-tavern-gold text-[10px] mb-1">
              📋 Daily Routine
            </h3>
            <p className="text-xs text-tavern-parchment-dim">
              No habits set up yet
            </p>
          </div>
          <Link
            href="/habits/new"
            className="tavrn-button text-[8px] !py-1.5 !px-2.5"
          >
            Add Habit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tavern-card p-4 mb-6">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-pixel text-tavern-gold text-[10px]">
            📋 Daily Routine
          </h3>
          <span className="text-[10px] text-tavern-parchment-dim">
            ({completedCount}/{totalCount})
          </span>
          {allCompleted && (
            <span className="text-xs">
              ✨
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-tavern-parchment-dim">
            {hoursUntilReset}h to reset
          </span>
          <span className={`text-tavern-gold transition-transform duration-200 inline-block ${isExpanded ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="overflow-hidden"
        >
            <div className="pt-3 mt-3 border-t border-tavern-oak/30">
              {/* Progress bar */}
              <div className="h-1.5 bg-tavern-oak/30 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-tavern-gold rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>

              {/* Habits checklist */}
              <div className="space-y-1.5">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className={`
                      flex items-center gap-3 p-2 rounded transition-all
                      ${habit.is_completed_today
                        ? "bg-tavern-gold/5"
                        : "hover:bg-tavern-oak/20"
                      }
                    `}
                  >
                    <HabitCheck
                      checked={habit.is_completed_today}
                      onChange={() => handleToggle(habit)}
                      disabled={loadingHabitId === habit.id}
                      size="sm"
                      color={habit.color}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">{habit.icon}</span>
                      <span
                        className={`text-sm ${
                          habit.is_completed_today
                            ? "line-through opacity-60"
                            : ""
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>
                    {habit.streak && habit.streak.current_streak > 0 && (
                      <span className="text-[9px] text-tavern-gold">
                        {habit.streak.current_streak}🔥
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-tavern-oak/30 flex items-center justify-between">
                <Link
                  href="/habits"
                  className="text-[9px] text-tavern-gold hover:text-tavern-candle"
                >
                  View all habits →
                </Link>
                <Link
                  href="/habits/new"
                  className="text-[9px] text-tavern-parchment-dim hover:text-tavern-parchment"
                >
                  + New habit
                </Link>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
