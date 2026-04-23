"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { HabitRecurrenceType, HabitRecurrenceData } from "@/lib/types";
import { getHabitById, updateHabit, deleteHabit } from "@/lib/habits";
import { validateRecurrenceData } from "@/lib/habit-recurrence";
import RecurrencePicker from "@/components/RecurrencePicker";
import { getSupabaseClient } from "@/lib/supabase";

const ICON_OPTIONS = [
  "✓", "💪", "🧘", "📚", "💧", "🥗", "🏃", "💤", "🎨", "🎵",
  "💻", "💰", "🧹", "📞", "✍️", "🌱", "🌅", "🌙", "❤️", "🦷",
];

const COLOR_OPTIONS = [
  "#e8b864", "#c44a36", "#a7f070", "#38b764", "#257179",
  "#3b5dc9", "#5d275d", "#b13e53", "#8b5a2b", "#566c86",
];

export default function EditHabitPage() {
  const router = useRouter();
  const params = useParams();
  const habitId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "✓",
    color: "#e8b864",
    recurrence_type: "daily" as HabitRecurrenceType,
    recurrence_data: {} as HabitRecurrenceData,
    xp_reward: 10,
    is_active: true,
  });

  // Auth guard + habit load in a single effect so the habit fetch never
  // fires before the redirect when the user is unauthenticated.
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await getSupabaseClient().auth.getSession();
      if (!data.session) { router.replace("/login"); return; }

      const habit = await getHabitById(habitId);
      if (!mounted) return;
      if (!habit) { router.push("/habits"); return; }

      setFormData({
        title: habit.title,
        description: habit.description || "",
        icon: habit.icon,
        color: habit.color,
        recurrence_type: habit.recurrence_type,
        recurrence_data: habit.recurrence_data,
        xp_reward: habit.xp_reward,
        is_active: habit.is_active,
      });
      setIsLoading(false);
    };

    init();
    return () => { mounted = false; };
  }, [habitId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    const validation = validateRecurrenceData(
      formData.recurrence_type,
      formData.recurrence_data
    );
    if (!validation.valid) {
      setError(validation.error || "Invalid recurrence pattern");
      return;
    }

    setIsSubmitting(true);

    const result = await updateHabit(habitId, {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      icon: formData.icon,
      color: formData.color,
      recurrence_type: formData.recurrence_type,
      recurrence_data: formData.recurrence_data,
      xp_reward: formData.xp_reward,
      is_active: formData.is_active,
    });

    if (result.success) {
      router.push("/habits");
    } else {
      setError(result.error || "Failed to update habit");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const result = await deleteHabit(habitId);
    if (result.success) {
      router.push("/habits");
    } else {
      setError(result.error || "Failed to delete habit");
    }
  };

  const handleRecurrenceChange = (value: {
    type: HabitRecurrenceType;
    data: HabitRecurrenceData;
  }) => {
    setFormData((prev) => ({
      ...prev,
      recurrence_type: value.type,
      recurrence_data: value.data,
    }));
  };

  if (isLoading) {
    return (
      <div className="tavrn-panel p-4 md:p-6 max-w-2xl mx-auto animate-pulse">
        <div className="h-8 bg-tavern-oak/50 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-12 bg-tavern-oak/30 rounded" />
          <div className="h-24 bg-tavern-oak/30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="tavrn-panel p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/habits"
          className="text-tavern-parchment-dim hover:text-tavern-gold transition-colors"
        >
          ← Back
        </Link>
      </div>

      <h1 className="tavrn-wordmark text-3xl leading-none mb-2">
        Edit Habit
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-tavern-ember/20 border border-tavern-ember rounded">
          <p className="text-sm text-tavern-ember">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
            Habit Name
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment focus:border-tavern-gold outline-none transition-colors"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment focus:border-tavern-gold outline-none transition-colors resize-none"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Icon & Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`
                    aspect-square rounded-lg text-xl transition-all
                    ${formData.icon === icon
                      ? "bg-tavern-gold text-tavern-smoke ring-2 ring-tavern-gold"
                      : "bg-tavern-oak/50 text-tavern-parchment hover:bg-tavern-oak"
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
              Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`
                    aspect-square rounded-lg transition-all
                    ${formData.color === color
                      ? "ring-2 ring-tavern-gold ring-offset-2 ring-offset-tavern-smoke"
                      : "hover:scale-110"
                    }
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Recurrence */}
        <RecurrencePicker
          value={{
            type: formData.recurrence_type,
            data: formData.recurrence_data,
          }}
          onChange={handleRecurrenceChange}
        />

        {/* XP Reward */}
        <div>
          <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
            XP Reward: {formData.xp_reward}
          </label>
          <input
            type="range"
            min={5}
            max={25}
            step={5}
            value={formData.xp_reward}
            onChange={(e) =>
              setFormData({ ...formData, xp_reward: Number(e.target.value) })
            }
            className="w-full h-2 bg-tavern-oak rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-tavern-parchment-dim mt-1">
            <span>5 XP</span>
            <span>15 XP</span>
            <span>25 XP</span>
          </div>
        </div>

        {/* Active/Paused toggle */}
        <div>
          <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
            Status
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: true })}
              className={`
                flex-1 py-2 rounded font-pixel text-[9px] transition-all
                ${formData.is_active
                  ? "bg-retro-lime text-tavern-smoke"
                  : "bg-tavern-oak/50 text-tavern-parchment-dim"
                }
              `}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: false })}
              className={`
                flex-1 py-2 rounded font-pixel text-[9px] transition-all
                ${!formData.is_active
                  ? "bg-tavern-ember text-tavern-parchment"
                  : "bg-tavern-oak/50 text-tavern-parchment-dim"
                }
              `}
            >
              Paused
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Link
            href="/habits"
            className="flex-1 py-3 px-4 text-center border-2 border-tavern-oak rounded text-tavern-parchment-dim hover:border-tavern-gold/50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 tavrn-button disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Delete section */}
        <div className="pt-6 border-t border-tavern-oak/30">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-tavern-ember hover:text-tavern-ember/80 transition-colors"
            >
              Delete this habit...
            </button>
          ) : (
            <div className="p-4 bg-tavern-ember/10 border border-tavern-ember/30 rounded">
              <p className="text-sm text-tavern-parchment mb-3">
                Are you sure? This will delete all completion history and streaks.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm border border-tavern-oak rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm bg-tavern-ember text-white rounded"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
