"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSpring, animated } from "@react-spring/web";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/quest-progress";

interface ExpeditionStage {
  step_number: number;
  title: string;
  description: string;
  category: string;
  xp_reward: number;
  narrative: {
    task: string;
    artifact: string;
    requirement: string;
    environment: string;
  };
  discovery: {
    place_id: string;
    place_name: string;
    place_address: string;
    place_coords: { lat: number; lng: number };
  };
  ui: {
    icon_emoji: string;
    theme_color: string;
  };
}

interface TravelExpedition {
  title: string;
  description: string;
  vibe: string;
  city: string;
  stages: ExpeditionStage[];
}

const VIBE_OPTIONS = [
  { value: "wilderness", label: "🌲 Wilderness & Lore", description: "Outdoors, cafes, libraries" },
  { value: "art", label: "🎨 Art & Cafe", description: "Studios, coffee, socializing" },
  { value: "tech", label: "🧪 Tech & Knowledge", description: "Maker spaces, bookstores" },
  { value: "epicurean", label: "🍽️ Epicurean Journey", description: "Landmarks, restaurants, taverns" },
];

const LOADING_STAGES = [
  { message: "Scouting local districts...", progress: 25 },
  { message: "Consulting the Grand Maps...", progress: 50 },
  { message: "Weaving the 3-stage Narrative...", progress: 80 },
  { message: "Expedition Manifested!", progress: 100 },
];

export default function ExpeditionForge() {
  const [cityInput, setCityInput] = useState("");
  const [vibe, setVibe] = useState("wilderness");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [expedition, setExpedition] = useState<TravelExpedition | null>(null);
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingDaily, setRemainingDaily] = useState(5);
  const [committed, setCommitted] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const uid = await getCurrentUserId();
      if (mountedRef.current) setUserId(uid);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Animated progress bar
  const progressSpring = useSpring({
    width: `${LOADING_STAGES[loadingStage]?.progress || 0}%`,
    config: { tension: 120, friction: 14 },
  });

  // Fade animation for quest reveal
  const mapSpring = useSpring({
    opacity: expedition ? 1 : 0,
    transform: expedition ? "translateY(0px)" : "translateY(20px)",
    config: { tension: 200, friction: 20 },
  });

  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim() || loading) return;

    setLoading(true);
    setLoadingStage(0);
    setErrorMsg(null);
    setExpedition(null);
    setCommitted(false);

    const interval = setInterval(() => {
      setLoadingStage((prev) => {
        if (prev >= LOADING_STAGES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("supabase.auth.token") : null;

      const response = await fetch("/api/discover/expedition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          city: cityInput.trim(),
          vibe,
        }),
      });

      const data = await response.json();
      clearInterval(interval);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to forge travel saga.");
      }

      if (mountedRef.current) {
        setExpedition(data.expedition);
        setSelectedStageIndex(0);
        setRemainingDaily(data.remaining_daily || 5);
      }
    } catch (err) {
      if (mountedRef.current) {
        setErrorMsg(err instanceof Error ? err.message : "Scouting failed.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!expedition || !userId || committed) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabaseClient();
      const questIds: string[] = [];

      // 1. Insert all three quests client-side using RLS permissions
      for (const stage of expedition.stages) {
        const { data, error } = await supabase
          .from("quests")
          .insert({
            title: `Stage ${stage.step_number}: ${stage.title}`,
            description: stage.description,
            type: "side",
            source: "user",
            difficulty: 2,
            xp_reward: stage.xp_reward,
            duration_label: "1-2 hours",
            category: stage.category,
            location: stage.discovery.place_name,
            user_id: userId,
            status: "available",
          })
          .select("id")
          .single();

        if (error || !data) {
          throw new Error(`Failed to save quest: ${stage.title}. ${error?.message || ""}`);
        }

        questIds.push(data.id);
      }

      // 2. Accept Stage 1 quest immediately (makes it 'active')
      const { error: accept1Err } = await supabase
        .from("user_quests")
        .insert({
          user_id: userId,
          quest_id: questIds[0],
          quest_type: "side",
          quest_category: expedition.stages[0].category,
          status: "active",
          accepted_at: new Date().toISOString(),
        });

      if (accept1Err) throw new Error("Could not accept Stage 1 quest.");

      // 3. Insert Stage 2 and Stage 3 in user_quests with status = 'available'
      await Promise.all([
        supabase.from("user_quests").insert({
          user_id: userId,
          quest_id: questIds[1],
          quest_type: "side",
          quest_category: expedition.stages[1].category,
          status: "available",
        }),
        supabase.from("user_quests").insert({
          user_id: userId,
          quest_id: questIds[2],
          quest_type: "side",
          quest_category: expedition.stages[2].category,
          status: "available",
        }),
      ]);

      // 4. Stash expedition mapping in localStorage to run the state-machine sequentially
      const localExpeditionState = {
        title: expedition.title,
        city: expedition.city,
        vibe: expedition.vibe,
        currentStage: 1,
        quests: [
          { stage: 1, id: questIds[0], title: expedition.stages[0].title, completed: false, category: expedition.stages[0].category, xp: expedition.stages[0].xp_reward },
          { stage: 2, id: questIds[1], title: expedition.stages[1].title, completed: false, category: expedition.stages[1].category, xp: expedition.stages[1].xp_reward },
          { stage: 3, id: questIds[2], title: expedition.stages[2].title, completed: false, category: expedition.stages[2].category, xp: expedition.stages[2].xp_reward },
        ],
      };

      localStorage.setItem("tavrn_active_expedition", JSON.stringify(localExpeditionState));
      
      if (mountedRef.current) {
        setCommitted(true);
      }
    } catch (err) {
      if (mountedRef.current) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to commit to expedition.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-slate-900 rounded-xl border-2 border-amber-600/50">
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full animate-spin" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-2 border-4 border-amber-500/50 rounded-full animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
          <div className="absolute inset-4 border-4 border-amber-500/70 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🗺️</span>
          </div>
        </div>

        <h3 className="text-xl font-bold text-amber-400 mb-2 font-pixel">
          {LOADING_STAGES[loadingStage]?.message}
        </h3>

        <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden mt-4">
          <animated.div className="h-full bg-gradient-to-r from-amber-600 to-amber-400" style={progressSpring} />
        </div>

        <p className="text-slate-400 text-sm mt-4">
          Scouting locations and weaving an epic travel saga...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 border border-red-700 bg-red-900/20 text-sm text-red-400">
          ⚠️ {errorMsg}
        </div>
      )}

      {committed && expedition ? (
        <div className="tavrn-panel p-6 text-center space-y-4 border-2 border-retro-lime/50">
          <span className="text-5xl">🧭</span>
          <h2 className="text-2xl font-bold text-retro-lime font-pixel">Expedition Committed!</h2>
          <p className="text-body text-tavern-parchment max-w-md mx-auto leading-relaxed">
            The Chronicle has locked in **"{expedition.title}"**! Stage 1 is now active on your dashboard.
            Travel to the local landmarks, complete the tasks, and level up your traveler legend.
          </p>
          <div className="pt-2">
            <Link href="/" className="tavrn-btn tavrn-btn-primary">
              View Dashboard Contract →
            </Link>
          </div>
        </div>
      ) : expedition ? (
        <animated.div style={mapSpring} className="tavrn-panel p-5 md:p-6 space-y-6 border-2 border-tavern-gold/50">
          {/* Expedition Header */}
          <div className="text-center pb-4 border-b border-tavern-oak/30">
            <span className="text-xs uppercase tracking-widest text-tavern-ember font-pixel">Expedition Saga</span>
            <h2 className="text-3xl font-bold text-tavern-gold font-pixel mt-1">
              {expedition.title}
            </h2>
            <p className="text-sm text-tavern-parchment-dim mt-2 max-w-lg mx-auto leading-relaxed">
              "{expedition.description}"
            </p>
            <p className="text-xs text-tavern-ember mt-2 uppercase tracking-wide">
              🗺️ Travel Region: {expedition.city}
            </p>
          </div>

          {/* Saga Map Layout: 3 Connected Nodes */}
          <div className="relative py-4 flex flex-col md:flex-row items-center justify-around gap-6 md:gap-2">
            {/* Dotted Connecting Line (Desktop) */}
            <div className="absolute top-1/2 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-tavern-oak hidden md:block z-0" />

            {expedition.stages.map((stage, idx) => {
              const isActive = selectedStageIndex === idx;
              return (
                <button
                  key={stage.step_number}
                  type="button"
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`relative flex flex-col items-center p-3 z-10 rounded border-2 transition-all ${
                    isActive
                      ? "border-tavern-gold bg-tavern-oak/25 scale-105"
                      : "border-tavern-oak bg-black/40 hover:border-tavern-gold/40"
                  }`}
                  style={{ minWidth: "160px" }}
                >
                  <span className="text-3xl mb-2 select-none">{stage.ui.icon_emoji}</span>
                  <span className="kicker text-[9px] text-[#cdb68f]">Stage {stage.step_number}</span>
                  <span className="text-body-sm font-semibold text-tavern-parchment text-center leading-tight truncate w-32 mt-1">
                    {stage.title}
                  </span>
                  <span className="badge badge-lime mt-2">+{stage.xp_reward} XP</span>
                </button>
              );
            })}
          </div>

          {/* Active Node Expansion Details */}
          {expedition.stages[selectedStageIndex] && (
            <div className="tavern-card p-4 md:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-tavern-oak/30 pb-2 gap-2">
                <div>
                  <h3 className="text-subhead text-tavern-gold font-bold leading-snug">
                    Stage {expedition.stages[selectedStageIndex].step_number}: {expedition.stages[selectedStageIndex].title}
                  </h3>
                  <p className="text-[11px] text-[#cdb68f] uppercase tracking-wider mt-0.5">
                    Category: {expedition.stages[selectedStageIndex].category}
                  </p>
                </div>
                <div className="bg-tavern-smoke border border-tavern-oak px-3 py-1 text-xs text-[--parchment-dim] flex items-center gap-1.5">
                  📍 <span>{expedition.stages[selectedStageIndex].discovery.place_name}</span>
                </div>
              </div>

              {/* TARE details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-black/30 border border-tavern-oak/30 p-3">
                  <span className="kicker text-[9px] text-tavern-gold block mb-1">⚔️ Quest Task</span>
                  <p className="text-tavern-parchment leading-relaxed text-[13px]">
                    {expedition.stages[selectedStageIndex].narrative.task}
                  </p>
                </div>
                <div className="bg-black/30 border border-tavern-oak/30 p-3">
                  <span className="kicker text-[9px] text-tavern-gold block mb-1">💎 Artifact to Retrieve</span>
                  <p className="text-tavern-parchment leading-relaxed text-[13px]">
                    {expedition.stages[selectedStageIndex].narrative.artifact}
                  </p>
                </div>
                <div className="bg-black/30 border border-tavern-oak/30 p-3">
                  <span className="kicker text-[9px] text-tavern-gold block mb-1">⏱️ Open Hours & Requirements</span>
                  <p className="text-tavern-parchment leading-relaxed text-[13px]">
                    {expedition.stages[selectedStageIndex].narrative.requirement}
                  </p>
                </div>
                <div className="bg-black/30 border border-tavern-oak/30 p-3">
                  <span className="kicker text-[9px] text-tavern-gold block mb-1">🌲 Dungeon Environment</span>
                  <p className="text-tavern-parchment leading-relaxed text-[13px]">
                    {expedition.stages[selectedStageIndex].narrative.environment}
                  </p>
                </div>
              </div>

              <div className="text-xs text-[--parchment-dim] italic border-t border-tavern-oak/20 pt-2 flex items-center gap-2">
                <span>Address:</span>
                <span>{expedition.stages[selectedStageIndex].discovery.place_address}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-tavern-oak/30">
            <button
              onClick={handleCommit}
              disabled={!userId}
              className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold font-pixel rounded border-b-4 border-amber-800 hover:from-amber-500 hover:to-amber-400 active:border-b-0 min-h-[44px] disabled:opacity-50"
            >
              {userId ? "Commit to Expedition ⚔️ (+150 XP total)" : "Log in to Commit"}
            </button>
            <button
              onClick={() => setExpedition(null)}
              className="px-6 bg-tavern-smoke border border-tavern-oak text-tavern-parchment hover:bg-tavern-oak/20 rounded min-h-[44px]"
            >
              Draw Another
            </button>
          </div>
        </animated.div>
      ) : (
        <div className="tavrn-panel p-5 md:p-6 space-y-5">
          <div className="text-center space-y-2 pb-3 border-b border-tavern-oak/30">
            <h2 className="text-2xl font-bold text-tavern-gold font-pixel">The Travel Expedition Forge</h2>
            <p className="text-sm text-tavern-parchment-dim">
              Set sail for adventure. Specify any city worldwide and watch the Chronicle forge a 3-stage exploration campaign!
            </p>
          </div>

          <form onSubmit={handleForge} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-body-sm font-medium text-[--parchment-dim] mb-1.5">
                  Destination City (e.g. Seattle, Tokyo, London)
                </label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Enter a city to explore..."
                  className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment text-sm focus:border-tavern-gold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-[--parchment-dim] mb-1.5">
                  Expedition Vibe
                </label>
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment text-sm focus:border-tavern-gold focus:outline-none"
                >
                  {VIBE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.description})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!cityInput.trim()}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold text-md font-pixel border-b-4 border-amber-800 hover:from-amber-500 hover:to-amber-400 active:border-b-0 min-h-[46px] disabled:opacity-50"
            >
              Forge Voyage 🧭
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-tavern-oak/20">
            Uses parallel category maps query + Google Gemini reasoning • 5 expedition draws per day
          </div>
        </div>
      )}
    </div>
  );
}
