import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { AppError, getAuthenticatedUserId, sanitize, wrapUntrusted, UNTRUSTED_INPUT_NOTICE } from "@/lib/api-utils";
import { issueQuestToken } from "@/lib/quest-token";
import { QUEST_CATEGORIES } from "@/lib/types";
import { getLatestFlashModel } from "@/lib/gemini";
import { durationLabelToMinutes, calcQuestXP, clamp } from "@/lib/xp";
import { checkRateLimit } from "@/lib/rate-limit";

export const preferredRegion = 'pdx1';

const XP_CAPS = {
  side: { min: 25,  max: 2500  },
  main: { min: 100, max: 8000 },
} as const;

const RATE_LIMIT_WINDOW_SECONDS  = 60;
const RATE_LIMIT_MAX_REQ         = 12;
const RATE_LIMIT_ALERT_THRESHOLD = 8;

function logSecurityEvent(
  event: string,
  details: Record<string, string | number | boolean | null>
) {
  console.warn("[security:event]", event, {
    ...details,
    route: "/api/quests/evaluate",
    at: new Date().toISOString(),
  });
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode:      z.literal("ai"),
    topic:     z.string().trim().min(1).max(100), // trim before min so " " is rejected
    location:  z.string().trim().max(100).optional().default(""),
    questType: z.enum(["main", "side"]),
  }),
  z.object({
    mode:        z.literal("user"),
    title:       z.string().trim().min(5).max(80),
    description: z.string().trim().min(20).max(400),
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
  steps: z.array(z.object({
    id:       z.string(),
    title:    z.string().max(200),
    optional: z.boolean().optional(),
  })).optional().default([]),
  evaluation_note: z.string().optional().default(""),
});

// ── AI prompt builders ───────────────────────────────────────────────────────

function buildAiPrompt(topic: string, location: string, questType: "main" | "side"): string {
  const typeLabel = questType === "main"
    ? "Main Quest (a meaningful goal taking weeks to months)"
    : "Side Quest (a focused task taking an hour to a weekend)";

  const example = questType === "main"
    ? `Good: "Over the next three months, learn enough Python to automate one repetitive task at work. Start with a one-hour tutorial this week and build from there."`
    : `Good: "Head to the farmers market Saturday morning and pick up ingredients for a meal you've never cooked. Document what surprised you."`;

  const safeLocation = sanitize(location);
  const safeTopic = sanitize(topic);

  return `You are the Quest Giver in Tarvn, an 8-bit RPG productivity tracker. Generate a single quest with clear, actionable objectives. Write descriptions that are engaging but plainspoken — the user should immediately understand what they're doing and why it's worth their time.

${UNTRUSTED_INPUT_NOTICE}

${example}
Avoid: mystical language, invented names, phrases like "ancient tome vault" or "blessed by spirits."

Location: ${safeLocation ? wrapUntrusted(safeLocation) : "anywhere"}
Topic / Interest: ${wrapUntrusted(safeTopic)}
Quest type: ${typeLabel}

IMPORTANT: Do NOT assign XP — the system calculates it automatically based on duration and difficulty. Focus on creating clear, actionable steps.

Respond with ONLY a JSON object — no markdown, no code fences:
{
  "title": "Catchy quest title (max 80 chars)",
  "description": "2-3 sentence description explaining what to do and why it matters — clear and motivating (max 400 chars)",
  "difficulty": <1–5>,
  "duration_label": "Realistic time estimate, e.g. '2-3 hours', '1 weekend', '2-3 months'",
  "category": "one of: Fitness, Education, Creative, Tech, Food, Outdoors, Social, Wellness, Community, Career, Business, Culture, Productivity",
  "steps": [
    {"id": "step-1", "title": "First concrete action"},
    {"id": "step-2", "title": "Second action"},
    ...
  ],
  "evaluation_note": "Briefly explain the difficulty rating. Keep it high-level and general (under 75 words), focusing on the overall scope rather than specific steps or details. For example: 'This is challenging because it requires learning multiple new skills' instead of 'Go to the library, find X book on shelf Y'."
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
  return `You are the Quest Giver in Tarvn. A user has written a quest. Evaluate it honestly and make it clear and motivating while preserving the user's intent exactly.

${UNTRUSTED_INPUT_NOTICE}

Keep the adventure framing (quest structure, step-by-step objectives) — but write the description like you're telling a friend about a genuinely worthwhile thing to do, not narrating an epic saga. Avoid mystical language, invented names, or dramatic flourishes that obscure what the user actually needs to do.

Quest type: ${typeLabel}
Category: ${category}
User's title: ${wrapUntrusted(sanitize(title, 200))}
User's description: ${wrapUntrusted(sanitize(description, 1000))}

IMPORTANT: Do NOT assign XP — the system calculates it automatically based on duration and difficulty. Focus on creating clear, actionable steps.

- Lightly refine the title and description to be clear and direct, preserving the user's intent exactly.
- Assign a realistic duration estimate.
- Break the quest into 3-6 concrete, actionable steps.

Respond with ONLY a JSON object — no markdown, no code fences:
{
  "title": "Refined title (stay close to theirs, max 80 chars)",
  "description": "User's quest rewritten for clarity — plain, motivating, tells them exactly what to do and why (max 400 chars, 2-3 sentences)",
  "difficulty": <1–5>,
  "duration_label": "Realistic estimate, e.g. '1-2 hours', '3 months'",
  "category": "${category}",
  "steps": [
    {"id": "step-1", "title": "First concrete action"},
    {"id": "step-2", "title": "Second action"},
    ...
  ],
  "evaluation_note": "Briefly explain the difficulty rating. Keep it high-level and general (under 75 words), focusing on the overall scope rather than specific steps or details. For example: 'This is challenging because it requires learning multiple new skills' instead of 'Go to the library, find X book on shelf Y'."
}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) throw new AppError("Authentication required", 401);

    const rateLimitKey = `rate_limit:evaluate:${userId}`;
    const rateLimitState = await checkRateLimit(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_REQ);
    if (rateLimitState.recentCount >= RATE_LIMIT_ALERT_THRESHOLD) {
      logSecurityEvent("rate_limit_pressure", {
        userId,
        recentCount: rateLimitState.recentCount,
        limit: RATE_LIMIT_MAX_REQ,
        windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
      });
    }

    if (rateLimitState.isLimited) {
      logSecurityEvent("rate_limit_block", {
        userId,
        recentCount: rateLimitState.recentCount,
        limit: RATE_LIMIT_MAX_REQ,
        windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
      });
      throw new AppError("The Quest Giver needs a moment to recover. Please wait and try again.", 429);
    }

    let body: unknown;
    try { body = await req.json(); } catch { throw new AppError("Invalid JSON", 400); }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(`Validation error: ${parsed.error.issues.map((i: { message: string }) => i.message).join(", ")}`, 400);
    }
    const input = parsed.data;

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new AppError("AI service not configured", 500);

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GOOGLE_GEMINI_MODEL?.trim() || await getLatestFlashModel(apiKey);
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
      throw new AppError(`AI response invalid: ${validated.error.issues.map((i: { message: string }) => i.message).join(", ")}`, 502);
    }

    const data = validated.data;

    const duration_minutes = durationLabelToMinutes(data.duration_label);
    const xp_reward = calcQuestXP(input.questType, duration_minutes, data.difficulty);

    const quest_token = issueQuestToken({
      uid: userId,
      src: input.mode,
      typ: input.questType,
      dur: duration_minutes,
      dif: data.difficulty as 1 | 2 | 3 | 4 | 5,
      cat: data.category,
      title: data.title,
      description: data.description,
    });

    return NextResponse.json({
      title:           data.title,
      description:     data.description,
      type:            input.questType,
      source:          input.mode === "ai" ? "ai" : "user",
      difficulty:      data.difficulty,
      duration_label:  data.duration_label,
      duration_minutes,
      category:        data.category,
      xp_reward:       clamp(xp_reward, XP_CAPS[input.questType as keyof typeof XP_CAPS].min, XP_CAPS[input.questType as keyof typeof XP_CAPS].max),
      steps:           data.steps,
      location:        input.mode === "ai" ? (input.location || null) : null,
      evaluation_note: data.evaluation_note,
      status:          "available",
      quest_token,
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
