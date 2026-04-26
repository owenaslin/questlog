"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useSpring, animated } from "@react-spring/web";
import {
  Habit,
  HabitStreak,
  HabitWithStatus,
} from "@/lib/types";
import { completeHabit, uncompleteHabit } from "@/lib/habits";
import { getRecurrenceDescription, isHabitScheduledForDate } from "@/lib/habit-recurrence";
import HabitCheck from "./HabitCheck";

interface HabitCardProps {
  habit: HabitWithStatus;
  onUpdate?: () => void;
  variant?: "default" | "compact" | "minimal";
}

export default function HabitCard({
  habit,
  onUpdate,
  variant = "default",
}: HabitCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    if (habit.is_completed_today) {
      const result = await uncompleteHabit(habit.id);
      if (result.success) {
        onUpdate?.();
      }
    } else {
      const result = await completeHabit(habit.id);
      if (result.success) {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 1000);
        onUpdate?.();
      }
    }
    
    setIsLoading(false);
  }, [habit.id, habit.is_completed_today, isLoading, onUpdate]);

  // Get streak display
  const streakCount = habit.streak?.current_streak || 0;
  const isHotStreak = streakCount >= 7;

  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-3 p-2">
        <HabitCheck
          checked={habit.is_completed_today}
          onChange={handleToggle}
          disabled={isLoading}
          size="sm"
          color={habit.color}
        />
        <span className={`text-sm ${habit.is_completed_today ? "line-through opacity-60" : ""}`}>
          {habit.title}
        </span>
        {streakCount > 0 && (
          <span className="ml-auto text-[10px] text-tavern-gold">
            {streakCount}🔥
          </span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`
          flex items-center gap-3 p-3 rounded-lg border-2 transition-all
          ${habit.is_completed_today
            ? "border-tavern-gold/30 bg-tavern-gold/5"
            : "border-tavern-oak bg-tavern-smoke/30"
          }
        `}
      >
        <span className="text-xl">{habit.icon}</span>
        <HabitCheck
          checked={habit.is_completed_today}
          onChange={handleToggle}
          disabled={isLoading}
          size="md"
          color={habit.color}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${habit.is_completed_today ? "line-through opacity-70" : ""}`}>
            {habit.title}
          </p>
          <p className="text-[10px] text-tavern-parchment-dim">
            {getRecurrenceDescription(habit)} · +{habit.xp_reward} XP
          </p>
        </div>
        {streakCount > 0 && (
          <div className={`flex items-center gap-1 text-xs ${isHotStreak ? "text-tavern-ember animate-pulse" : "text-tavern-gold"}`}>
            <span>🔥</span>
            <span>{streakCount}</span>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  const cardSpring = useSpring({
    opacity: 1,
    y: 0,
    config: { tension: 300, friction: 30 },
  });

  const pulseSpring = useSpring({
    transform: justCompleted ? "scale(1.02)" : "scale(1)",
    config: { duration: 300 },
  });

  return (
    <animated.div
      style={{
        ...cardSpring,
        transform: pulseSpring.transform,
      }}
      className={`
        group relative p-4 rounded-lg border-2 transition-all
        ${habit.is_completed_today
          ? "border-tavern-gold/50 bg-tavern-gold/5"
          : "border-tavern-oak bg-tavern-smoke/50 hover:border-tavern-gold/30"
        }
        ${habit.is_active ? "" : "opacity-60"}
      `}
    >
      {/* Header with icon and actions */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: habit.color }}
        >
          {habit.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium truncate ${habit.is_completed_today ? "line-through opacity-70" : ""}`}>
            {habit.title}
          </h3>
          {habit.description && (
            <p className="text-xs text-tavern-parchment-dim mt-0.5 line-clamp-2">
              {habit.description}
            </p>
          )}
        </div>

        <HabitCheck
          checked={habit.is_completed_today}
          onChange={handleToggle}
          disabled={isLoading}
          size="lg"
          color={habit.color}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-tavern-parchment-dim">
        <div className="flex items-center gap-3">
          <span>{getRecurrenceDescription(habit)}</span>
          <span>·</span>
          <span>+{habit.xp_reward} XP</span>
        </div>
        
        {streakCount > 0 && (
          <div className={`flex items-center gap-1 ${isHotStreak ? "text-tavern-ember" : "text-tavern-gold"}`}>
            <span>🔥</span>
            <span className="font-medium">{streakCount}</span>
            <span className="text-[10px]">day{streakCount !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Edit link */}
      <Link
        href={`/habits/${habit.id}/edit`}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <span className="text-[10px] text-tavern-parchment-dim hover:text-tavern-gold">
          Edit
        </span>
      </Link>
    </animated.div>
  );
}
