import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { kv } from "@vercel/kv";
import { QUEST_CATEGORIES } from "@/lib/types";

export const preferredRegion = 'pdx1';

// ── XP cap (defence in depth) ─────────────────────────────────────────────────
// quest.type is client-supplied so we cannot fully prevent a user from claiming
// "main" to access the higher ceiling. We intentionally omit the minimum floor
// so that a legitimate low-XP side quest is never inflated by a type mismatch.
// A full fix would require a server-side DB lookup of the original quest.
const XP_MAX_BY_TYPE = { side: 2500, main: 8000 } as const;

function clampXP(xp: number, type: "main" | "side"): number {
  return Math.min(XP_MAX_BY_TYPE[type], Math.max(1, Math.round(xp)));
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 3600; // 1 hour
const RATE_LIMIT_MAX_SAVES = 20;

async function checkSaveRateLimit(userId: string): Promise<boolean> {
  const key = `rate_limit:save:${userId}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS * 1000;
  try {
    const timestamps = await kv.lrange<number>(key, 0, -1);
    const recent = timestamps.filter((ts) => ts > windowStart);
    if (recent.length >= RATE_LIMIT_MAX_SAVES) return false;
    await kv.lpush(key, now);
    await kv.expire(key, RATE_LIMIT_WINDOW_MS);
    return true;
  } catch {
    // Fail open in development; fail closed in production.
    return process.env.NODE_ENV === "development";
  }
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  title:            z.string().min(1).max(80),
  description:      z.string().min(1).max(500),
  type:             z.enum(["main", "side"]),
  source:           z.enum(["ai", "user"]),
  difficulty:       z.number().int().min(1).max(5),
  duration_label:   z.string().min(1).max(60),
  duration_minutes: z.number().int().positive().optional().nullable(),
  steps:            z.array(z.object({
    id:       z.string(),
    title:    z.string().max(200).transform((s: string) => s.replace(/[<>]/g, "").trim()),
    optional: z.boolean().optional(),
  })).optional().default([]),
  category:         z.enum(QUEST_CATEGORIES),
  xp_reward:        z.number().int().positive(),
  location:         z.string().max(100).nullable().optional(),
  evaluation_note:  z.string().optional().default(""),
});

class AppError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
    this.name = "AppError";
  }
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthToken(req: NextRequest): Promise<{ userId: string; token: string } | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, token };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthToken(req);
    if (!auth) throw new AppError("Authentication required", 401);
    const { userId, token } = auth;

    const allowed = await checkSaveRateLimit(userId);
    if (!allowed) throw new AppError("Too many quests saved. Please wait before saving another.", 429);

    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400); }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        `Invalid quest data: ${parsed.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        400
      );
    }

    const quest = parsed.data;
    const safeXP = clampXP(quest.xp_reward, quest.type);

    // Create an authenticated Supabase client so RLS sees the user's identity
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    const db = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1 — Insert the quest row
    const { data: savedQuest, error: questErr } = await db
      .from("quests")
      .insert({
        title:            quest.title,
        description:      quest.description,
        type:             quest.type,
        source:           quest.source,
        difficulty:       quest.difficulty,
        xp_reward:        safeXP,
        duration_label:   quest.duration_label,
        duration_minutes: quest.duration_minutes ?? null,
        steps:            quest.steps ?? [],
        category:         quest.category,
        location:         quest.location ?? null,
        user_id:          userId,
        status:           "available",
      })
      .select("id")
      .single();

    if (questErr || !savedQuest) {
      console.error("Quest insert error:", questErr);
      throw new AppError("Failed to save quest", 500);
    }

    // 2 — Accept it immediately for this user
    const { error: acceptErr } = await db
      .from("user_quests")
      .insert({
        user_id:        userId,
        quest_id:       savedQuest.id,
        quest_type:     quest.type,
        quest_category: quest.category,
        status:         "active",
        accepted_at:    new Date().toISOString(),
      });

    if (acceptErr) {
      console.error("user_quests insert error:", acceptErr);
      throw new AppError("Quest saved but could not be accepted", 500);
    }

    return NextResponse.json({
      questId:   savedQuest.id,
      xp_reward: safeXP,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Could not save quest. Please try again." }, { status: 500 });
  }
}
