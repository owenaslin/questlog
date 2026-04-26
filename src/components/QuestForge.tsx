"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { QuestType, QUEST_CATEGORIES } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "ai" | "user";
type Stage = "form" | "loading" | "preview" | "saving" | "done";

interface EvaluatedQuest {
  title: string;
  description: string;
  type: QuestType;
  source: "ai" | "user";
  difficulty: number;
  duration_label: string;
  category: string;
  xp_reward: number;
  location: string | null;
  evaluation_note: string;
}

interface QuestForgeProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestCreated?: (questId: string) => void;
}

// ── Topic presets for AI mode ─────────────────────────────────────────────────

const AI_TOPICS = [
  "Fitness", "Cooking", "Art & Creativity", "Technology", "Music",
  "Nature", "Photography", "Reading", "Volunteering", "Science",
  "History", "Crafts", "Language Learning", "Meditation",
];

// ── Shared type toggle ─────────────────────────────────────────────────────────

function QuestTypeToggle({
  value,
  onChange,
}: {
  value: QuestType;
  onChange: (v: QuestType) => void;
}) {
  return (
    <div>
      <label className="mobile-caption text-tavern-parchment-dim block mb-2 uppercase tracking-wider">
        Quest Type
      </label>
      <div className="flex gap-3">
        {(["main", "side"] as QuestType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`font-pixel text-[8px] px-4 py-2 transition-none ${
              value === t
                ? t === "main"
                  ? "bg-tavern-ember text-white border-b-4 border-tavern-ember"
                  : "bg-retro-blue text-retro-white border-b-4 border-retro-darkblue"
                : "bg-retro-darkgray text-tavern-parchment-dim border-b-4 border-retro-black hover:border-tavern-oak"
            }`}
          >
            {t === "main" ? "⚔ Main" : "🗡 Side"}
          </button>
        ))}
      </div>
      <p className="mobile-caption text-tavern-parchment-dim mt-1.5 opacity-70">
        {value === "main" ? "Weeks–months of commitment" : "Hours to a weekend"}
      </p>
    </div>
  );
}

// ── AI Mode form ──────────────────────────────────────────────────────────────

function AiForm({
  onSubmit,
}: {
  onSubmit: (data: { topic: string; location: string; questType: QuestType }) => void;
}) {
  const [topic, setTopic]       = useState("");
  const [custom, setCustom]     = useState("");
  const [location, setLocation] = useState("");
  const [questType, setType]    = useState<QuestType>("side");

  const activeTopic = custom.trim() || topic;
  const canSubmit = activeTopic.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ topic: activeTopic, location: location.trim(), questType });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Topic */}
      <div>
        <label className="mobile-caption text-tavern-parchment-dim block mb-2 uppercase tracking-wider">
          Topic / Interest
        </label>
        <select
          value={topic}
          onChange={(e) => { setTopic(e.target.value); if (e.target.value) setCustom(""); }}
          className="w-full mb-2 font-pixel text-[9px]"
        >
          <option value="">Choose a topic…</option>
          {AI_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="text"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); if (e.target.value) setTopic(""); }}
          placeholder="Or type your own topic…"
          className="w-full font-pixel text-[9px]"
          maxLength={100}
        />
      </div>

      {/* Location */}
      <div>
        <label className="mobile-caption text-tavern-parchment-dim block mb-2 uppercase tracking-wider">
          Location <span className="opacity-50">(optional)</span>
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Brooklyn, NY or Tokyo"
          className="w-full font-pixel text-[9px]"
          maxLength={100}
        />
      </div>

      <QuestTypeToggle value={questType} onChange={setType} />

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full font-pixel text-[9px] px-4 py-3 border-b-4 transition-none ${
          canSubmit
            ? "bg-tavern-gold text-retro-black border-tavern-gold-dark hover:bg-tavern-gold-2 cursor-pointer"
            : "bg-retro-darkgray text-retro-gray border-retro-black cursor-not-allowed"
        }`}
      >
        ⚡ Ask the Quest Giver
      </button>
    </form>
  );
}

// ── User Mode form ─────────────────────────────────────────────────────────────

function UserForm({
  onSubmit,
}: {
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    questType: QuestType;
  }) => void;
}) {
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [category, setCategory]   = useState("");
  const [questType, setType]      = useState<QuestType>("side");

  const canSubmit = title.trim().length >= 5 && description.trim().length >= 20 && category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), description: description.trim(), category, questType });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <label className="mobile-caption text-tavern-parchment-dim block mb-2 uppercase tracking-wider">
          Quest Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What will you accomplish?"
          className="w-full font-pixel text-[9px]"
          minLength={5}
          maxLength={80}
          required
        />
        <p className="mobile-caption text-tavern-parchment-dim mt-1 opacity-60">
          {title.trim().length}/80
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="mobile-caption text-tavern-parchment-dim block mb-2 uppercase tracking-wider">
          Describe the Quest
        </label>
        <textarea
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Be specific — what exactly will you do? The Quest Giver rewards clear objectives."
          className="w-full font-pixel text-[9px] resize-none"
          rows={4}
          minLength={20}
          maxLength={400}
          required
        />
        <p className="mobile-caption text-tavern-parchment-dim mt-1 opacity-60">
          {description.trim().length}/400 (min 20)
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="mobile-caption text-tavern-parchment-dim block mb-2 uppercase tracking-wider">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full font-pixel text-[9px]"
          required
        >
          <option value="">Select a category…</option>
          {QUEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <QuestTypeToggle value={questType} onChange={setType} />

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full font-pixel text-[9px] px-4 py-3 border-b-4 transition-none ${
          canSubmit
            ? "bg-tavern-gold text-retro-black border-tavern-gold-dark hover:bg-tavern-gold-2 cursor-pointer"
            : "bg-retro-darkgray text-retro-gray border-retro-black cursor-not-allowed"
        }`}
      >
        ✎ Submit for Evaluation
      </button>

      <p className="mobile-caption text-tavern-parchment-dim text-center opacity-60">
        The Quest Giver determines your XP — no self-scoring.
      </p>
    </form>
  );
}

// ── Main QuestForge component ─────────────────────────────────────────────────

export default function QuestForge({ isOpen, onClose, onQuestCreated }: QuestForgeProps) {
  const [mode, setMode]               = useState<Mode>("ai");
  const [stage, setStage]             = useState<Stage>("form");
  const [preview, setPreview]         = useState<EvaluatedQuest | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [savedQuestId, setSavedId]    = useState<string | null>(null);
  const abortRef                      = useRef<AbortController | null>(null);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStage("form");
      setPreview(null);
      setError(null);
      setSavedId(null);
    }
  }, [isOpen]);

  // Trap focus + close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Cleanup abort on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const getToken = async (): Promise<string | null> => {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  };

  const handleEvaluate = async (
    payload: Record<string, unknown> & { questType: QuestType }
  ) => {
    setError(null);
    setStage("loading");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in to forge a quest.");

      const res = await fetch("/api/quests/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed");

      setPreview(data as EvaluatedQuest);
      setStage("preview");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("form");
    } finally {
      abortRef.current = null;
    }
  };

  const handleAccept = async () => {
    if (!preview) return;
    setStage("saving");
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Please log in.");

      const res = await fetch("/api/quests/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(preview),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save quest");

      setSavedId(data.questId);
      setStage("done");
      onQuestCreated?.(data.questId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("preview");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,8,5,0.88)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quest Forge"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ border: "4px solid #5c3a1a", boxShadow: "6px 6px 0 #5c3a1a", background: "#1a1208" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b-4"
          style={{ borderColor: "#5c3a1a", background: "#2a1a0a" }}
        >
          <h2 className="font-pixel text-tavern-gold text-xs tracking-wider">
            🔨 Quest Forge
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="mobile-caption text-tavern-parchment-dim hover:text-tavern-parchment px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* ── Tab selector (only on form stage) ────────────────── */}
          {stage === "form" && (
            <div className="flex mb-6 border-b-2 border-tavern-oak">
              {([["ai", "⚡ Quest Giver"], ["user", "✎ Write It"]] as [Mode, string][]).map(
                ([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null); }}
                    className={`mobile-label px-5 py-2 transition-none ${
                      mode === m
                        ? "text-tavern-gold border-b-4 border-tavern-gold -mb-[2px]"
                        : "text-tavern-parchment-dim hover:text-tavern-parchment border-b-4 border-transparent -mb-[2px]"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          )}

          {/* ── Error banner ──────────────────────────────────────── */}
          {error && (
            <div
              className="mb-4 px-4 py-3 border-2 border-tavern-ember"
              style={{ background: "#1a0d05" }}
            >
              <p className="mobile-body text-tavern-ember leading-relaxed">{error}</p>
            </div>
          )}

          {/* ── Form stage ───────────────────────────────────────── */}
          {stage === "form" && mode === "ai" && (
            <AiForm
              onSubmit={({ topic, location, questType }) =>
                handleEvaluate({ mode: "ai", topic, location, questType })
              }
            />
          )}
          {stage === "form" && mode === "user" && (
            <UserForm
              onSubmit={({ title, description, category, questType }) =>
                handleEvaluate({ mode: "user", title, description, category, questType })
              }
            />
          )}

          {/* ── Loading stage ────────────────────────────────────── */}
          {stage === "loading" && (
            <div className="flex flex-col items-center py-10 gap-6">
              <div className="text-5xl animate-bounce">🧙</div>
              <div className="text-center">
                <p className="font-pixel text-tavern-gold text-[9px] mb-2">
                  The Quest Giver reviews your challenge…
                </p>
                <p className="mobile-caption text-tavern-parchment-dim">
                  Determining your reward…
                </p>
              </div>
              <div className="w-48 h-2 bg-tavern-smoke overflow-hidden">
                <div
                  className="h-full bg-tavern-gold"
                  style={{ animation: "questProgress 2s steps(20) infinite" }}
                />
              </div>
              <button
                type="button"
                onClick={() => { abortRef.current?.abort(); setStage("form"); }}
                className="mobile-caption text-tavern-parchment-dim hover:text-tavern-parchment"
              >
                Cancel
              </button>
              <style jsx>{`
                @keyframes questProgress {
                  0%  { width: 0%; }
                  80% { width: 90%; }
                  100%{ width: 90%; }
                }
              `}</style>
            </div>
          )}

          {/* ── Preview stage ────────────────────────────────────── */}
          {stage === "preview" && preview && (
            <div>
              {/* Quest Giver XP award banner */}
              <div
                className="text-center py-4 mb-5"
                style={{ border: "4px solid #c4a85a", background: "#0f0d07" }}
              >
                <p className="mobile-caption text-tavern-parchment-dim mb-1 uppercase tracking-wider">
                  The Quest Giver awards
                </p>
                <p className="font-pixel text-tavern-gold text-4xl">+{preview.xp_reward} XP</p>
              </div>

              {/* Quest title + description */}
              <h3 className="font-pixel text-tavern-parchment text-[10px] leading-relaxed mb-3">
                {preview.title}
              </h3>
              <p className="mobile-body text-tavern-parchment-dim leading-loose mb-5">
                {preview.description}
              </p>

              {/* Meta row */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: "Type",     value: preview.type === "main" ? "⚔ Main" : "🗡 Side" },
                  { label: "Duration", value: preview.duration_label },
                  { label: "Category", value: preview.category },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-tavern-stroke border-2 border-tavern-cream-3 p-2">
                    <p className="mobile-label text-tavern-parchment-dim uppercase mb-1">{label}</p>
                    <p className="mobile-caption text-tavern-parchment">{value}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex-1 font-pixel text-[9px] px-4 py-3 bg-tavern-gold text-tavern-cream border-b-4 border-tavern-gold-2 hover:bg-tavern-gold-2 transition-none"
                >
                  ✓ Accept Quest
                </button>
                <button
                  type="button"
                  onClick={() => setStage("form")}
                  className="font-pixel text-[8px] px-4 py-3 border-2 border-tavern-oak text-tavern-parchment-dim hover:border-tavern-parchment transition-none"
                >
                  ↩ Revise
                </button>
              </div>
            </div>
          )}

          {/* ── Saving stage ─────────────────────────────────────── */}
          {stage === "saving" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="text-3xl animate-spin">⚙</div>
              <p className="font-pixel text-tavern-parchment text-[9px]">
                Recording your quest…
              </p>
            </div>
          )}

          {/* ── Done stage ───────────────────────────────────────── */}
          {stage === "done" && (
            <div className="flex flex-col items-center py-8 gap-5 text-center">
              <div className="text-5xl">🍺</div>
              <div>
                <p className="font-pixel text-tavern-gold text-[11px] mb-2">Quest Accepted!</p>
                <p className="mobile-body text-tavern-parchment-dim leading-loose">
                  The tavern erupts in cheer. Your adventure begins.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                {savedQuestId && (
                  <Link
                    href={`/board/${savedQuestId}`}
                    onClick={onClose}
                    className="block text-center font-pixel text-[9px] px-4 py-3 bg-tavern-cyan text-tavern-cream border-b-4 border-tavern-cream-3 hover:bg-tavern-oak-3"
                  >
                    View Quest →
                  </Link>
                )}
                <Link
                  href="/journal"
                  onClick={onClose}
                  className="block text-center font-pixel text-[8px] px-4 py-2 border-2 border-tavern-oak text-tavern-gold hover:border-tavern-gold"
                >
                  View in Journal →
                </Link>
                <button
                  type="button"
                  onClick={() => { setStage("form"); setPreview(null); setSavedId(null); setError(null); }}
                  className="mobile-caption text-tavern-parchment-dim hover:text-tavern-parchment"
                >
                  Forge another quest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
