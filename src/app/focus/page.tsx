"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentUserId, completeQuest } from "@/lib/quest-progress";
import { getOwnHeroProfile } from "@/lib/hero";
import AmbientScene from "@/components/ui/AmbientScene";
import LivingFlame from "@/components/ui/LivingFlame";
import { AVATAR_PORTRAITS } from "@/lib/types";

interface FocusHistoryItem {
  title: string;
  originalTitle: string;
  victories: number;
  xp_reward: number;
  difficulty: number;
  duration_minutes: number;
}

interface Monster {
  name: string;
  emoji: string;
  attacks: string[];
}

const MONSTERS: Monster[] = [
  { name: "The Bug Hydra", emoji: "👾", attacks: ["NullPointer Strike", "Stack Overflow Fog", "Merge Conflict Slash"] },
  { name: "The Meeting Specter", emoji: "👻", attacks: ["Brainstorming Whirlwind", "Unnecessary Sync Beam", "Muted Mic Curse"] },
  { name: "The Distraction Ogre", emoji: "👹", attacks: ["Notification Spam", "Infinite Scroll Trap", "Cat Video Ray"] },
  { name: "The Spreadsheet Golem", emoji: "🤖", attacks: ["Formula Error Slam", "VLOOKUP Sweep", "Pivot Table Punch"] },
  { name: "The Procrastination Dragon", emoji: "🐉", attacks: ["Tomorrow's Breath", "Just-One-More-Minute tail whip", "Nap Time Incinerate"] },
];

const HERO_ATTACKS = [
  "casts Deep Work Fireball",
  "swings the Blade of Focus",
  "deflects with the Shield of Concentration",
  "chants the Mantra of Flow",
  "brews an Elixir of Productivity",
  "unleashes a Pomodoro Slash",
];

const TRIVIAL_BREAK_SECONDS = 5 * 60;

export default function FocusArenaPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string>("🧙");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Focus stages: 'setup' | 'combat' | 'break'
  const [stage, setStage] = useState<"setup" | "combat" | "break">("setup");

  // Setup Form
  const [objective, setObjective] = useState("");
  const [durationPreset, setDurationPreset] = useState<15 | 25 | 45>(25);

  // Active Combat State
  const [currentMonster, setCurrentMonster] = useState<Monster>(MONSTERS[0]);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [heroHp, setHeroHp] = useState(100);
  const [monsterHp, setMonsterHp] = useState(100);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  // Rest Break State
  const [breakSeconds, setBreakSeconds] = useState(TRIVIAL_BREAK_SECONDS);
  const [breakActive, setBreakActive] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; char: string; left: number }[]>([]);

  // Focus History Spellbook
  const [history, setHistory] = useState<FocusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breakTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const combatLogEndRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  // Prevents double-fire of handleVictory in React Strict Mode (effects run twice in dev)
  const victoryFiredRef = useRef(false);

  // Live refs — assigned inline so interval callbacks always read the latest state
  // without stale closure issues, regardless of when the interval was created.
  const timerSecondsRef = useRef(timerSeconds);
  timerSecondsRef.current = timerSeconds;
  const totalSecondsRef = useRef(totalSeconds);
  totalSecondsRef.current = totalSeconds;
  const durationPresetRef = useRef(durationPreset);
  durationPresetRef.current = durationPreset;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const objectiveRef = useRef(objective);
  objectiveRef.current = objective;
  const currentMonsterRef = useRef(currentMonster);
  currentMonsterRef.current = currentMonster;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // Fetch Auth & Profile
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!mountedRef.current) return;
      setUserId(uid);

      if (uid) {
        try {
          const profile = await getOwnHeroProfile();
          if (profile && mountedRef.current) {
            const portrait = AVATAR_PORTRAITS[profile.avatar_sprite as keyof typeof AVATAR_PORTRAITS];
            if (portrait) setAvatarEmoji(portrait.emoji);
          }
        } catch (err) {
          console.error("Failed to load hero profile:", err);
        }
      }
      if (mountedRef.current) setLoading(false);
    })();
  }, []);

  // Fetch Focus Quest History
  const fetchFocusHistory = useCallback(async () => {
    if (!userId) return;
    setLoadingHistory(true);
    const supabase = getSupabaseClient();

    try {
      const { data: quests, error: questErr } = await supabase
        .from("quests")
        .select("id, title, difficulty, xp_reward, duration_minutes")
        .eq("user_id", userId)
        .like("title", "Focus Arena:%");

      if (questErr || !quests) {
        setLoadingHistory(false);
        return;
      }

      const questIds = quests.map((q) => q.id);

      const { data: completions, error: compErr } = await supabase
        .from("user_quests")
        .select("quest_id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("quest_id", questIds);

      if (compErr || !completions) {
        setLoadingHistory(false);
        return;
      }

      const completedIds = new Set(completions.map((c) => c.quest_id as string));
      const completedQuests = quests.filter((q) => completedIds.has(q.id));

      const aggregationMap: Record<string, FocusHistoryItem> = {};

      completedQuests.forEach((q) => {
        const rawTitle = q.title as string;
        const objectiveName = rawTitle.startsWith("Focus Arena: ")
          ? rawTitle.replace("Focus Arena: ", "")
          : rawTitle;

        if (aggregationMap[objectiveName]) {
          aggregationMap[objectiveName].victories += 1;
        } else {
          aggregationMap[objectiveName] = {
            title: objectiveName,
            originalTitle: rawTitle,
            victories: 1,
            xp_reward: q.xp_reward || 25,
            difficulty: q.difficulty || 2,
            duration_minutes: q.duration_minutes || 25,
          };
        }
      });

      const historyList = Object.values(aggregationMap).sort((a, b) => b.victories - a.victories);
      if (mountedRef.current) setHistory(historyList);
    } catch (err) {
      console.error("Failed to load focus history:", err);
    } finally {
      if (mountedRef.current) setLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && stage === "setup") fetchFocusHistory();
  }, [userId, stage, fetchFocusHistory]);

  // Scroll to bottom of combat log
  useEffect(() => {
    if (combatLogEndRef.current) {
      combatLogEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [combatLog]);

  // Floating break emojis generator
  useEffect(() => {
    if (stage !== "break" || !breakActive) return;

    const emojiInterval = setInterval(() => {
      if (!mountedRef.current) return;
      const chars = ["🍺", "☕", "💤", "🍪", "🍕", "✨"];
      const newEmoji = {
        id: Date.now() + Math.random(),
        char: chars[Math.floor(Math.random() * chars.length)],
        left: Math.random() * 80 + 10,
      };
      setFloatingEmojis((prev) => [...prev, newEmoji].slice(-15));
    }, 1500);

    return () => clearInterval(emojiInterval);
  }, [stage, breakActive]);

  // Combat log appender — reads monster from ref to avoid stale closure
  const appendRandomCombatLog = useCallback((elapsedSeconds: number) => {
    const monster = currentMonsterRef.current;
    const minutesElapsed = Math.floor(elapsedSeconds / 60);

    if (Math.random() > 0.5) {
      const attack = HERO_ATTACKS[Math.floor(Math.random() * HERO_ATTACKS.length)];
      const damage = Math.floor(Math.random() * 10) + 5;
      setCombatLog((prev) => [
        ...prev,
        `⚔️ [${minutesElapsed}m] Hero ${attack}, dealing ${damage} damage to ${monster.name}!`,
      ]);
      setShakeScreen(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setShakeScreen(false);
      }, 200);
    } else {
      const attack = monster.attacks[Math.floor(Math.random() * monster.attacks.length)];
      setCombatLog((prev) => [
        ...prev,
        `⚠️ [${minutesElapsed}m] ${monster.name} unleashes ${attack}! Concentration holds strong.`,
      ]);
    }
  }, []);

  // Victory handler — reads combat context from refs, not stale closure state
  const handleVictory = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const preset = durationPresetRef.current;
    const uid = userIdRef.current;
    const obj = objectiveRef.current;
    const monster = currentMonsterRef.current;

    const xpReward = preset === 15 ? 15 : preset === 25 ? 25 : 50;
    const diffVal = preset === 15 ? 1 : preset === 25 ? 2 : 3;

    if (!uid) {
      setXpAwarded(xpReward);
      setStage("break");
      setBreakSeconds(TRIVIAL_BREAK_SECONDS);
      setBreakActive(true);
      return;
    }

    try {
      const supabase = getSupabaseClient();

      const { data: questData, error: questErr } = await supabase
        .from("quests")
        .insert({
          title: `Focus Arena: ${obj.trim()}`,
          description: `Focused for ${preset} minutes on "${obj.trim()}" and vanquished ${monster.name}.`,
          type: "side",
          source: "user",
          difficulty: diffVal,
          xp_reward: xpReward,
          duration_label: `${preset} mins`,
          duration_minutes: preset,
          category: "Productivity",
          user_id: uid,
          status: "available",
        })
        .select("id")
        .single();

      if (questErr || !questData) {
        console.error("Quest insert error:", questErr);
        if (mountedRef.current) setErrorMsg("Failed to register victory in DB.");
        return;
      }

      const result = await completeQuest(questData.id, xpReward, "side", "Productivity");

      if (!mountedRef.current) return;
      if (result.success) {
        setXpAwarded(xpReward);
        setStage("break");
        setBreakSeconds(TRIVIAL_BREAK_SECONDS);
        setBreakActive(true);
      } else {
        setErrorMsg(result.error || "Failed to award focus XP.");
      }
    } catch (err) {
      console.error("Focus victory write error:", err);
      if (mountedRef.current) setErrorMsg("An unexpected database error occurred.");
    }
  }, []);

  // Core Combat Timer Ticker — ticks the clock and updates HP/combat log.
  // Does NOT call handleVictory directly; the victory effect below handles that
  // so we never call an async side effect from inside a setState call.
  useEffect(() => {
    if (stage !== "combat" || !isActive || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const current = timerSecondsRef.current;
      if (current <= 0) return;

      const next = current - 1;
      const elapsed = totalSecondsRef.current - next;

      setTimerSeconds(next);
      setMonsterHp(Math.ceil((next / totalSecondsRef.current) * 100));

      if (elapsed > 0 && elapsed % 60 === 0) {
        appendRandomCombatLog(elapsed);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, isActive, isPaused, appendRandomCombatLog]);

  // Fire victory when timer reaches 0 — separate from the tick so handleVictory
  // (which is async and writes to Supabase) is never called from inside setState.
  useEffect(() => {
    if (timerSeconds === 0 && stage === "combat" && isActive) {
      if (!victoryFiredRef.current) {
        victoryFiredRef.current = true;
        handleVictory();
      }
    }
  }, [timerSeconds, stage, isActive, handleVictory]);

  // Break Timer Ticker
  useEffect(() => {
    if (stage !== "break" || !breakActive) {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
      return;
    }

    breakTimerRef.current = setInterval(() => {
      setBreakSeconds((prev) => {
        if (prev <= 1) {
          if (breakTimerRef.current) clearInterval(breakTimerRef.current);
          setBreakActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    };
  }, [stage, breakActive]);

  // Start Focus Combat
  const handleStartCombat = (objectiveText: string, durationMin: number) => {
    if (!objectiveText.trim()) return;

    const chosenMonster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    const seconds = durationMin * 60;

    setCurrentMonster(chosenMonster);
    setTimerSeconds(seconds);
    setTotalSeconds(seconds);
    setHeroHp(100);
    setMonsterHp(100);
    setXpAwarded(null);
    setShakeScreen(false);
    setErrorMsg(null);
    victoryFiredRef.current = false;

    setCombatLog([
      `⚔️ Battle began! You engage ${chosenMonster.name} in deep focus combat.`,
      `🎯 Contract Objective: "${objectiveText.trim()}"`,
      `⏳ Encounter length: ${durationMin} minutes. Maintain focus to prevail!`,
    ]);

    setStage("combat");
    setIsActive(true);
    setIsPaused(false);
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setCombatLog((prev) => [...prev, `▶️ Focus resumed! You charge back into the fray.`]);
    } else {
      setIsPaused(true);
      setCombatLog((prev) => [...prev, `⏸️ Focus paused. You take shelter in a temporary safe-zone.`]);
    }
  };

  // Retreat / Quit
  const handleRetreat = () => {
    setIsActive(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setStage("setup");
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto tavrn-panel p-5 animate-pulse min-h-[400px]">
        <div className="h-6 bg-tavern-oak/50 rounded w-1/4 mb-4" />
        <div className="h-32 bg-tavern-oak/30 rounded mb-4" />
        <div className="h-24 bg-tavern-oak/20 rounded" />
      </div>
    );
  }

  // ──────────────────────────────────────────────── SETUP SCREEN
  if (stage === "setup") {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header className="tavrn-panel p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker mb-1">Dungeon Chamber</p>
            <h1 className="tavrn-wordmark text-4xl leading-none">The Focus Arena</h1>
            <p className="text-sm text-tavern-parchment-dim mt-2">
              Commit your energy to a single contract and defeat the monsters of distraction.
            </p>
          </div>
          <Link href="/" className="tavrn-btn tavrn-btn-ghost">
            Back to Dashboard
          </Link>
        </header>

        {errorMsg && (
          <div className="p-2 border border-red-700 bg-red-900/20 text-sm text-red-400">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
          {/* Main setup form */}
          <section className="tavrn-panel p-4 md:p-5 flex flex-col gap-5">
            <h2 className="text-subhead text-tavern-gold border-b border-tavern-oak pb-2">⚔️ Draw a Contract</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartCombat(objective, durationPreset);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-body-sm font-medium text-[--parchment-dim] mb-2">
                  What objective are you focusing on?
                </label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Writing Chapter 3, Coding auth, Cleaning room..."
                  className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-3 text-tavern-parchment text-sm focus:border-tavern-gold focus:outline-none"
                  maxLength={60}
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-[--parchment-dim] mb-2">
                  Choose encounter difficulty & length
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: 15, label: "Skirmish", stars: "★☆☆", xp: "+15 XP" },
                    { val: 25, label: "Boss Battle", stars: "★★☆", xp: "+25 XP" },
                    { val: 45, label: "Raid Event", stars: "★★★", xp: "+50 XP" },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setDurationPreset(preset.val as 15 | 25 | 45)}
                      className={`border-2 p-3 text-center flex flex-col items-center justify-center transition-none rounded ${
                        durationPreset === preset.val
                          ? "border-tavern-gold bg-tavern-oak text-tavern-parchment"
                          : "border-tavern-oak bg-tavern-smoke/40 text-[--parchment-dim] hover:border-tavern-gold/30"
                      }`}
                    >
                      <span className="text-body-sm font-bold">{preset.label}</span>
                      <span className="text-[12px] text-tavern-gold mt-1">{preset.val}m</span>
                      <span className="text-[10px] text-tavern-ember font-pixel mt-1">{preset.stars}</span>
                      <span className="badge badge-lime mt-2">{preset.xp}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!objective.trim()}
                className="tavrn-btn tavrn-btn-primary w-full justify-center text-md py-3 mt-2 min-h-[44px] disabled:opacity-50"
              >
                Enter Focus Arena ⚔️
              </button>
            </form>
          </section>

          {/* Spellbook of past focus victories */}
          <aside className="tavrn-panel p-4 flex flex-col gap-4">
            <h2 className="text-subhead text-tavern-gold border-b border-tavern-oak pb-2">📜 Focus Spellbook</h2>

            {loadingHistory ? (
              <div className="space-y-2 py-4 animate-pulse">
                <div className="h-8 bg-tavern-oak/30 rounded" />
                <div className="h-8 bg-tavern-oak/20 rounded" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-body-sm text-tavern-parchment-dim bg-black/10 p-3 rounded border border-tavern-oak/30">
                Your focus spellbook is empty. Vanquish a monster to record your first contract!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
                {history.map((item) => (
                  <div
                    key={item.title}
                    className="p-3 border border-tavern-oak/50 bg-tavern-smoke/20 hover:border-tavern-gold/30 rounded flex flex-col justify-between gap-2"
                  >
                    <div>
                      <p className="text-body-sm font-semibold text-tavern-parchment leading-tight truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#cdb68f]/80 mt-1">
                        🏆 {item.victories} {item.victories === 1 ? "victory" : "victories"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setObjective(item.title);
                        setDurationPreset(item.duration_minutes as 15 | 25 | 45);
                      }}
                      className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm w-full justify-center text-[11px]"
                    >
                      Rematch ⚔️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────── COMBAT ARENA
  if (stage === "combat") {
    const elapsedSeconds = totalSeconds - timerSeconds;

    return (
      <div className={`max-w-4xl mx-auto flex flex-col gap-6 relative overflow-hidden ${shakeScreen ? "animate-shake" : ""}`}>
        {/* The Dungeon Visual Canvas */}
        <div className="relative w-full h-[280px] bg-slate-950 border-4 border-tavern-oak rounded shadow-inner overflow-hidden">
          <AmbientScene scene="quest-alcove" />

          {/* Grid Container for Combatants */}
          <div className="absolute inset-0 flex items-end justify-between px-10 pb-8 z-10">
            {/* HERO SIDE */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl animate-float-slow transition-transform duration-300">
                {avatarEmoji}
              </div>
              <div className="bg-black/75 px-2 py-0.5 rounded border border-tavern-oak text-[10px] kicker text-tavern-parchment leading-none mb-1">
                You
              </div>
              {/* HP Bar */}
              <div className="w-24 h-2 bg-black border border-tavern-oak overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${heroHp}%` }}
                />
              </div>
            </div>

            {/* VS SECTION */}
            <div className="flex flex-col items-center justify-center pb-6">
              <div className="text-xl font-bold text-tavern-ember kicker bg-black/60 px-3 py-1 border border-tavern-oak mb-2">
                VS
              </div>
              <div className="font-pixel text-xl text-tavern-gold text-center bg-black/60 px-3 py-1 border border-tavern-oak">
                {formatTime(timerSeconds)}
              </div>
            </div>

            {/* MONSTER SIDE */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl animate-float-medium transition-all duration-300">
                {currentMonster.emoji}
              </div>
              <div className="bg-black/75 px-2 py-0.5 rounded border border-tavern-oak text-[10px] kicker text-tavern-ember leading-none mb-1">
                {currentMonster.name}
              </div>
              {/* HP Bar */}
              <div className="w-24 h-2 bg-black border border-tavern-oak overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${monsterHp}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Focus Arena controls and details */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          <section className="tavrn-panel p-4 flex flex-col gap-4 justify-between">
            <div>
              <p className="kicker mb-2">Current Arena Target</p>
              <h3 className="text-subhead text-tavern-gold font-bold leading-snug mb-3">
                "{objective}"
              </h3>
              <div className="space-y-1 text-xs text-tavern-parchment-dim border-t border-tavern-oak/30 pt-3">
                <p>🏆 XP stakes: <span className="text-retro-lime font-bold">+{durationPreset === 15 ? 15 : durationPreset === 25 ? 25 : 50} XP</span></p>
                <p>🐉 Beast: {currentMonster.name}</p>
                <p>⏱ Completed: {Math.floor(elapsedSeconds / 60)} / {durationPreset}m</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-tavern-oak/30 pt-4">
              <button
                type="button"
                onClick={handleTogglePause}
                className="tavrn-btn tavrn-btn-primary w-full justify-center"
              >
                {isPaused ? "Charge Back! ⚔️" : "Take Shelter 🛡️"}
              </button>
              <button
                type="button"
                onClick={handleRetreat}
                className="tavrn-btn tavrn-btn-ghost w-full justify-center text-red-400 border-red-900/30 hover:bg-red-950/20"
              >
                Flee Combat (Retreat)
              </button>
            </div>
          </section>

          {/* Combat Log */}
          <section className="tavrn-panel p-4 flex flex-col gap-3 min-h-[220px]">
            <p className="kicker border-b border-tavern-oak pb-2">🛡️ Combat Log</p>
            <div className="flex-1 bg-black/40 border border-tavern-oak p-3 rounded font-mono text-xs overflow-y-auto max-h-[160px] space-y-1.5 scrollbar-thin">
              {combatLog.map((log, i) => (
                <div key={i} className="text-tavern-parchment leading-relaxed select-none">
                  {log}
                </div>
              ))}
              <div ref={combatLogEndRef} />
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────── REST BREAK STATE
  if (stage === "break") {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-6 relative overflow-hidden">
        {/* Cozy Hearth Visual Canvas */}
        <div className="relative w-full h-[280px] bg-slate-950 border-4 border-tavern-oak rounded shadow-inner overflow-hidden">
          <AmbientScene scene="hearthside" />

          {/* Floating drink/snack emojis animation */}
          {floatingEmojis.map((emoji) => (
            <div
              key={emoji.id}
              className="absolute text-xl animate-bubble-rise"
              style={{
                left: `${emoji.left}%`,
                bottom: "70px",
                opacity: 0.8,
              }}
            >
              {emoji.char}
            </div>
          ))}

          {/* Hearth Visual Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 z-10">
            {/* Cozy fireplace */}
            <div className="mb-4">
              <LivingFlame streakDays={0} size="lg" />
            </div>

            {/* Resting Stats */}
            <div className="bg-black/75 px-4 py-2 border-2 border-tavern-oak rounded text-center">
              <p className="kicker text-tavern-gold mb-1">Resting at the Hearth</p>
              <h2 className="font-pixel text-xl text-retro-cyan leading-none">
                {formatTime(breakSeconds)}
              </h2>
            </div>
          </div>
        </div>

        {/* Break actions and stats */}
        <div className="tavrn-panel p-5 flex flex-col items-center text-center gap-5">
          <div className="max-w-lg">
            <span className="text-5xl">🏆</span>
            <h2 className="text-2xl font-bold text-tavern-gold font-pixel mt-3">VICTORY!</h2>
            <p className="text-md text-tavern-parchment font-semibold mt-2">
              You successfully focused and defeated the distraction monster!
            </p>
            {xpAwarded && (
              <p className="text-lg text-retro-lime font-pixel font-bold mt-2">
                +{xpAwarded} XP credited to your Hero Profile!
              </p>
            )}
            <p className="text-sm text-tavern-parchment-dim mt-3 leading-relaxed">
              Warm embers crackle at your feet as you rest at the hearth. Hydrate, take a stretch, and prepare for your next epic encounter.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setBreakActive(true);
                setBreakSeconds(TRIVIAL_BREAK_SECONDS);
              }}
              disabled={breakActive}
              className="tavrn-btn tavrn-btn-primary"
            >
              {breakActive ? "Relaxing..." : "Start Break Timer 💤"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (breakTimerRef.current) clearInterval(breakTimerRef.current);
                setBreakActive(false);
                setStage("setup");
              }}
              className="tavrn-btn tavrn-btn-ghost text-tavern-gold hover:text-tavern-candle border-tavern-gold/25"
            >
              Skip Break (Enter Arena) ⚔️
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
