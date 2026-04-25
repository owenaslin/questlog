/**
 * XP calculation utilities — time-proportional XP system.
 *
 * Side quest:  XP = duration_minutes × 5   × DIFF_MOD  (round to 25, clamp 25–2500)
 * Main quest:  XP = duration_minutes × 0.5 × DIFF_MOD  (round to 50, clamp 100–8000)
 * Habit:       XP = duration_minutes × 2   × DIFF_MOD  (round to 5,  clamp 5–300)
 */

export const DIFF_MOD: Record<number, number> = {
  1: 1.0, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2.0,
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function calcSideQuestXP(duration_minutes: number, difficulty: number): number {
  const raw = duration_minutes * 5 * (DIFF_MOD[difficulty] ?? 1.0);
  return Math.max(25, Math.min(2500, roundTo(raw, 25)));
}

export function calcMainQuestXP(duration_minutes: number, difficulty: number): number {
  const raw = duration_minutes * 0.5 * (DIFF_MOD[difficulty] ?? 1.0);
  return Math.max(100, Math.min(8000, roundTo(raw, 50)));
}

export function calcHabitXP(duration_minutes: number, difficulty: number): number {
  const raw = duration_minutes * 2 * (DIFF_MOD[difficulty] ?? 1.0);
  return Math.max(5, Math.min(300, roundTo(raw, 5)));
}

export function calcQuestXP(
  type: "main" | "side",
  duration_minutes: number,
  difficulty: number
): number {
  return type === "main"
    ? calcMainQuestXP(duration_minutes, difficulty)
    : calcSideQuestXP(duration_minutes, difficulty);
}

/**
 * Canonical mapping from duration_label to duration_minutes.
 * Side quests: literal active-session minutes.
 * Main quests: total effort hours × 60 (not calendar time).
 */
export const DURATION_MINUTES_MAP: Record<string, number> = {
  // ── Short sessions ────────────────────────────────────────────
  "10-15 min":   12,
  "15-20 min":   17,
  "20-30 min":   25,
  "30 min":      30,
  "30-45 min":   37,
  "45-60 min":   52,
  // ── Hour-range sessions ───────────────────────────────────────
  "1-2 hours":   90,
  "1-3 hours":  120,
  "2 hours":    120,
  "2-3 hours":  150,
  "2-4 hours":  180,
  "3-4 hours":  210,
  "3-5 hours":  240,
  "4-6 hours":  300,
  // ── Day-range (side quests: active hours per day) ─────────────
  "Half day":   240,
  "1 night":    480,
  "1 day":      360,
  "1-2 days":   360,
  "2 days":     480,
  "2-3 days":   600,
  "3-5 days":   720,
  "5 days":     600,
  "7 days":     840,
  "1 week":     840,
  "1-2 weeks": 1050,
  "2-4 weeks": 3600,   // short main quest range — effort-hours
  // ── Main quests (effort hours × 60) ──────────────────────────
  "30 days":   2400,
  "1 month":   2400,
  "4-6 weeks": 2400,
  "6-8 weeks": 2800,
  "8 weeks":   4800,
  "1-2 months":3600,
  "2 months":  4800,
  "2-3 months":6000,
  "2-4 months":7200,
  "3 months":  7200,
  "3-4 months":8400,
  "3-5 months":9600,
  "3-6 months":10800,
  "4-6 months":12000,
  "6 months":  14400,
  "6-12 months":21600,
  "12 months": 28800,
};

/**
 * Look up duration_minutes for a given label.
 * Falls back to a simple heuristic parse if the label is not in the map
 * (handles AI-generated labels like "1 weekend", "2 weeks", etc.)
 */
export function durationLabelToMinutes(label: string): number {
  if (DURATION_MINUTES_MAP[label] !== undefined) {
    return DURATION_MINUTES_MAP[label];
  }
  // Heuristic fallback: parse numeric prefix
  const match = label.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return 120; // default 2 hours
  const n = parseFloat(match[1]);
  if (label.includes("month")) return Math.round(n * 2400);
  if (label.includes("week"))  return Math.round(n * 840);
  if (label.includes("day"))   return Math.round(n * 360);
  if (label.includes("hour"))  return Math.round(n * 60);
  if (label.includes("min"))   return Math.round(n);
  return 120;
}
