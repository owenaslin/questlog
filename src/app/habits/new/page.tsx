"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HabitRecurrenceType, HabitRecurrenceData } from "@/lib/types";
import { createHabit } from "@/lib/habits";
import { validateRecurrenceData, buildRecurrenceData } from "@/lib/habit-recurrence";
import RecurrencePicker from "@/components/RecurrencePicker";
import { getSupabaseClient } from "@/lib/supabase";

const ICON_OPTIONS = [
  "✓", "💪", "🧘", "📚", "💧", "🥗", "🏃", "💤", "🎨", "🎵",
  "💻", "💰", "🧹", "📞", "✍️", "🌱", "🌅", "🌙", "❤️", "🦷",
];

const COLOR_OPTIONS = [
  "#e8b864", // Gold (tavern)
  "#c44a36", // Ember
  "#a7f070", // Lime
  "#38b764", // Green
  "#257179", // Teal
  "#3b5dc9", // Blue
  "#5d275d", // Purple
  "#b13e53", // Red
  "#8b5a2b", // Brown
  "#566c86", // Gray
];

export default function NewHabitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "✓",
    color: "#e8b864",
    recurrence_type: "daily" as HabitRecurrenceType,
    recurrence_data: {} as HabitRecurrenceData,
    xp_tier: "small" as "small" | "medium" | "large",
  });

  const XP_TIERS = {
    small: { xp: 25, label: "Small", description: "Quick habit (5-10 min)" },
    medium: { xp: 50, label: "Medium", description: "Regular habit (15-30 min)" },
    large: { xp: 100, label: "Large", description: "Substantial habit (30+ min)" },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    // Validate recurrence data
    const validation = validateRecurrenceData(
      formData.recurrence_type,
      formData.recurrence_data
    );
    if (!validation.valid) {
      setError(validation.error || "Invalid recurrence pattern");
      return;
    }

    setIsSubmitting(true);

    const result = await createHabit({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      icon: formData.icon,
      color: formData.color,
      recurrence_type: formData.recurrence_type,
      recurrence_data: formData.recurrence_data,
      xp_reward: XP_TIERS[formData.xp_tier].xp,
    });

    if (result.success) {
      router.push("/habits");
    } else {
      setError(result.error || "Failed to create habit");
      setIsSubmitting(false);
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
        New Habit
      </h1>
      <p className="text-sm text-tavern-parchment-dim mb-6">
        Create a new daily routine to build consistency
      </p>

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
            placeholder="e.g., Drink 8 glasses of water"
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment placeholder:text-tavern-parchment-dim/50 focus:border-tavern-gold outline-none transition-colors"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
            Description <span className="text-tavern-parchment-dim">(optional)</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Add details about this habit..."
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment placeholder:text-tavern-parchment-dim/50 focus:border-tavern-gold outline-none transition-colors resize-none"
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
                  title={color}
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

        {/* XP Tier */}
        <div>
          <label className="font-pixel text-[9px] text-tavern-gold block mb-2">
            Habit Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(XP_TIERS) as Array<keyof typeof XP_TIERS>).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setFormData({ ...formData, xp_tier: tier })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.xp_tier === tier
                    ? "border-tavern-gold bg-tavern-gold/10"
                    : "border-tavern-oak hover:border-tavern-gold/50"
                }`}
              >
                <div className="font-pixel text-[10px] text-tavern-gold">
                  {XP_TIERS[tier].label}
                </div>
                <div className="font-pixel text-[8px] text-tavern-parchment-dim mt-1">
                  {XP_TIERS[tier].xp} XP
                </div>
                <div className="text-[9px] text-tavern-parchment-dim/70 mt-0.5">
                  {XP_TIERS[tier].description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-tavern-smoke/50 rounded-lg border border-tavern-oak">
          <p className="font-pixel text-[8px] text-tavern-parchment-dim mb-2">
            Preview
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: formData.color }}
            >
              {formData.icon}
            </div>
            <div>
              <p className="font-medium">
                {formData.title || "Your habit name"}
              </p>
              <p className="text-[10px] text-tavern-parchment-dim">
                {formData.recurrence_type} • +{XP_TIERS[formData.xp_tier].xp} XP
              </p>
            </div>
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
            className="flex-1 tavrn-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Habit"}
          </button>
        </div>
      </form>
    </div>
  );
}
