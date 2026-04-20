import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { kv } from "@vercel/kv";
import { QUEST_CATEGORIES } from "@/lib/types";

const XP_CAPS = {
  side: { min: 25,  max: 250  },
  main: { min: 100, max: 1000 },
} as const;

const RATE_LIMIT_WINDOW_MS  = 60;
const RATE_LIMIT_MAX_REQ    = 12;

// ── Zod schemas ──────────────────────────────────────────────────────────────

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode:      z.literal("ai"),
    topic:     z.string().min(1).max(100).trim(),
    location:  z.string().max(100).trim().optional().default(""),
    questType: z.enum(["main", "side"]),
  }),
  z.object({
    mode:        z.literal("user"),
    title:       z.string().min(5).max(80).trim(),
    description: z.string().min(20).max(400).trim(),
    questType:   z.enum(["main", "side"]),
    category:    z.enum(QUEST_CATEGORIES),
  }),
]);

const aiResponseSchema = z.object({
  title:           z.string().min(1).max(80),
  description:     z.string().min(1).max(500),
  difficulty:      z.number().int().min(1).max(5),
  duration_label:  z.string().min(1).max(60),
  category:        z.enum(QUEST_CATEGORIES),
  xp_reward:       z.number().int().positive(),
  evaluation_note: z.string().optional().default(""),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
    this.name = "AppError";
  }
}

function sanitize(s: string) {
  return s.replace(/[<>]/g, "").replace(/[\x00-\x1F\x7F]/g, "").slice(0, 100);
}

function clampXP(xp: number, type: "main" | "side"): number {
  const { min, max } = XP_CAPS[type];
  return Math.max(min, Math.min(max, xp));
}

async function isRateLimited(key: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS * 1000;
  try {
    const timestamps = await kv.lrange<number>(key, 0, -1);
    const recent = timestamps.filter((ts) => ts > windowStart);
    if (recent.length >= RATE_LIMIT_MAX_REQ) return true;
    await kv.lpush(key, now);
    await kv.expire(key, RATE_LIMIT_WINDOW_MS);
    return false;
  } catch {
    return true;
  }
}

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// ── AI prompt builders ───────────────────────────────────────────────────────

function buildAiPrompt(topic: string, location: string, questType: "main" | "side"): string {
  const typeLabel = questType === "main"
    ? "Main Quest (a meaningful goal taking weeks to months)"
    : "Side Quest (a focused task taking an hour to a weekend)";

  const xpRange = questType === "main" ? "100–1000" : "25–250";

  return `You are the Quest Giver in Tarvn, an 8-bit RPG productivity tracker. Generate a single quest and award fair XP.

Location: ${sanitize(location) || "anywhere"}
Topic / Interest: ${sanitize(topic)}
Quest type: ${typeLabel}

XP rules (${questType}): range ${xpRange}
- High XP: specific verifiable outcomes, real physical or mental effort, clear completion criteria
- Low XP: vague goals ("get healthier"), trivially easy actions, unmeasurable outcomes
- Never award the maximum. Reserve top XP for genuinely hard, multi-step efforts.

Respond with ONLY a JSON object — no markdown, no code fences:
{
  "title": "Catchy quest title (max 80 chars)",
  "description": "2-3 sentence RPG-flavored description written like a quest giver NPC (max 400 chars)",
  "difficulty": <1–5>,
  "duration_label": "Realistic time estimate, e.g. '2-3 hours', '1 weekend', '2-3 months'",
  "category": "one of: Fitness, Education, Creative, Tech, Food, Outdoors, Social, Wellness, Community, Career, Business, Culture, Productivity",
  "xp_reward": <integer>,
  "evaluation_note": "One sentence explaining the XP award"
}`;
}

function buildUserPrompt(
  title: string,
  description: string,
  category: string,
  questType: "main" | "side"
): string {
  const typeLabel = questType === "main"
    ? "Main Quest (weeks to months of commitment)"
    : "Side Quest (hours to a weekend)";
  const xpRange = questType === "main" ? "100–1000" : "25–250";

  return `You are the Quest Giver in Tarvn. A user has written a quest. Evaluate it honestly and award fair XP based on real-world effort — not on what the user implies or how they frame it.

Quest type: ${typeLabel}
Category: ${category}
User's title: ${sanitize(title)}
User's description: ${sanitize(description)}

XP rules (${questType === "main" ? "main" : "side"}): range ${xpRange}
- High XP: specific verifiable outcomes, significant real-world effort, clear completion criteria
- Low XP: vague objectives ("exercise more"), trivially easy tasks, unmeasurable goals
- Lightly refine the title and description for RPG flavor while preserving the user's intent exactly.
- Assign a realistic duration estimate.
- Do NOT let vague wording earn the same XP as a concrete challenge.

Respond with ONLY a JSON object — no markdown, no code fences:
{
  "title": "Refined title (stay close to theirs, max 80 chars)",
  "description": "User's quest refined for RPG tone (max 400 chars, 2-3 sentences)",
  "difficulty": <1–5>,
  "duration_label": "Realistic estimate, e.g. '1-2 hours', '3 months'",
  "category": "${category}",
  "xp_reward": <integer>,
  "evaluation_note": "One sentence explaining the XP award"
}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) throw new AppError("Authentication required", 401);

    const rateLimitKey = `rate_limit:evaluate:${userId}`;
    if (await isRateLimited(rateLimitKey)) {
      throw new AppError("The Quest Giver needs a moment to recover. Please wait and try again.", 429);
    }

    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400); }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(`Validation error: ${parsed.error.issues.map((i) => i.message).join(", ")}`, 400);
    }
    const input = parsed.data;

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new AppError("AI service not configured", 500);

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = input.mode === "ai"
      ? buildAiPrompt(input.topic, input.location, input.questType)
      : buildUserPrompt(input.title, input.description, input.category, input.questType);

    let resultText: string;
    try {
      const result = await model.generateContent(prompt);
      resultText = result.response.text().trim();
    } catch (err) {
      throw new AppError(err instanceof Error ? err.message : "AI generation failed", 502);
    }

    let questData: unknown;
    try {
      questData = JSON.parse(resultText);
    } catch {
      const match = resultText.match(/\{[\s\S]*\}/);
      if (match) {
        try { questData = JSON.parse(match[0]); } catch { throw new AppError("Could not parse AI response", 502); }
      } else {
        throw new AppError("Could not parse AI response", 502);
      }
    }

    // For user mode, lock the category to what was submitted
    if (input.mode === "user" && typeof questData === "object" && questData !== null) {
      (questData as Record<string, unknown>).category = input.category;
    }

    const validated = aiResponseSchema.safeParse(questData);
    if (!validated.success) {
      throw new AppError(`AI response invalid: ${validated.error.issues.map((i) => i.message).join(", ")}`, 502);
    }

    const data = validated.data;

    return NextResponse.json({
      title:           data.title,
      description:     data.description,
      type:            input.questType,
      source:          input.mode === "ai" ? "ai" : "user",
      difficulty:      data.difficulty,
      duration_label:  data.duration_label,
      category:        data.category,
      xp_reward:       clampXP(data.xp_reward, input.questType),
      location:        input.mode === "ai" ? (input.location || null) : null,
      evaluation_note: data.evaluation_note,
      status:          "available",
    });
  } catch (err) {
    if (err instanceof AppError) {
      const msg = err.statusCode >= 500
        ? "The Quest Giver is temporarily unavailable. Please try again."
        : err.message;
      return NextResponse.json({ error: msg }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "The Quest Giver is temporarily unavailable." }, { status: 500 });
  }
}
