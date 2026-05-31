import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { kv } from "@vercel/kv";
import { QUEST_CATEGORIES } from "@/lib/types";
import { calcQuestXP } from "@/lib/xp";
import { AppError } from "@/lib/api-utils";
import {
  QuestTokenError,
  type QuestTokenPayload,
  verifyQuestToken,
} from "@/lib/quest-token";

export const preferredRegion = 'pdx1';

function logSecurityEvent(
  event: string,
  details: Record<string, string | number | boolean | null>
) {
  console.warn("[security:event]", event, {
    ...details,
    route: "/api/quests/save",
    at: new Date().toISOString(),
  });
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
  source:           z.enum(["ai", "user"]),
  difficulty:       z.number().int().min(1).max(5),
  duration_label:   z.string().min(1).max(60),
  duration_minutes: z.number().int().positive().optional().nullable(),
  steps:            z.array(z.object({
    id:       z.string(),
    title:    z.string().max(200).trim(),
    optional: z.boolean().optional(),
  })).optional().default([]),
  category:         z.enum(QUEST_CATEGORIES),
  // xp_reward is ignored — recomputed server-side from type/duration/difficulty
  // so a client can't inflate it by lying about quest type. Field is accepted
  // for backward compatibility but never used.
  xp_reward:        z.number().int().positive().optional(),
  location:         z.string().max(100).nullable().optional(),
  evaluation_note:  z.string().optional().default(""),
});

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

    // Token gate: every XP-affecting field (type, duration, difficulty,
    // category) and the title+description must match what /api/quests/evaluate
    // or /api/discover signed. The body's values for those fields are ignored
    // — claims from the token are authoritative.
    let claims: QuestTokenPayload;
    try {
      claims = verifyQuestToken(req.headers.get("x-quest-token"), {
        expectedUserId: userId,
        expectedSource: quest.source,
        title: quest.title,
        description: quest.description,
      });
    } catch (e) {
      const code = e instanceof QuestTokenError ? e.code : "missing";
      const status =
        code === "missing" || code === "expired" || code === "version_mismatch" ? 401 : 400;
      logSecurityEvent("quest_token_reject", { userId, code, source: quest.source });
      const message =
        code === "expired" || code === "version_mismatch"
          ? "Quest preview expired — please re-evaluate."
          : code === "missing"
          ? "Quest token required."
          : code === "content_mismatch"
          ? "Quest content changed — please re-evaluate."
          : "Quest token invalid.";
      throw new AppError(message, status);
    }

    const safeXP = calcQuestXP(claims.dur, claims.dif);

    // Create an authenticated Supabase client so RLS sees the user's identity
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    const db = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1 — Insert the quest row. Type/difficulty/duration_minutes/category
    // come from the verified token; the rest comes from the request body.
    const { data: savedQuest, error: questErr } = await db
      .from("quests")
      .insert({
        title:            quest.title,
        description:      quest.description,
        type:             claims.typ,
        source:           quest.source,
        difficulty:       claims.dif,
        xp_reward:        safeXP,
        duration_label:   quest.duration_label,
        duration_minutes: claims.dur,
        steps:            quest.steps ?? [],
        category:         claims.cat,
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
        quest_type:     claims.typ,
        quest_category: claims.cat,
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
