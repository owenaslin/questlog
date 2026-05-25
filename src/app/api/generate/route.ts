import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { getLatestFlashModel } from "@/lib/gemini";
import { AppError, getAuthenticatedUserId, sanitize } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { calcQuestXP, durationLabelToMinutes } from "@/lib/xp";

export const preferredRegion = 'pdx1';

const requestSchema = z.object({
  location: z.string().trim().min(1).max(100), // trim before min so " " is rejected
  topic: z.string().trim().min(1).max(100),
});

const responseSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  difficulty: z.number().int().min(1).max(5),
  duration_label: z.string().min(1).max(50),
  category: z.enum([
    "Fitness",
    "Education",
    "Creative",
    "Tech",
    "Food",
    "Outdoors",
    "Social",
    "Wellness",
    "Community",
    "Career",
    "Business",
    "Culture",
    "Productivity",
  ]),
});


const RATE_LIMIT_WINDOW_MS = 60;
const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_ALERT_THRESHOLD = 8;

function logSecurityEvent(
  event: string,
  details: Record<string, string | number | boolean | null>
) {
  console.warn("[security:event]", event, {
    ...details,
    route: "/api/generate",
    at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const rateLimitKey = `rate_limit:generate:${userId}`;
    const rateLimitState = await checkRateLimit(rateLimitKey, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS);
    if (rateLimitState.recentCount >= RATE_LIMIT_ALERT_THRESHOLD) {
      logSecurityEvent("rate_limit_pressure", {
        userId,
        recentCount: rateLimitState.recentCount,
        limit: RATE_LIMIT_MAX_REQUESTS,
        windowSeconds: RATE_LIMIT_WINDOW_MS,
      });
    }

    if (rateLimitState.isLimited) {
      logSecurityEvent("rate_limit_block", {
        userId,
        recentCount: rateLimitState.recentCount,
        limit: RATE_LIMIT_MAX_REQUESTS,
        windowSeconds: RATE_LIMIT_WINDOW_MS,
      });
      throw new AppError("Rate limit exceeded. Please wait and try again.", 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("Invalid JSON in request body", 400);
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new AppError(
        `Validation error: ${parseResult.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        400
      );
    }

    const { location, topic } = parseResult.data;

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError("Gemini API key not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
    const resolvedModel   = configuredModel || await getLatestFlashModel(apiKey);
    const modelCandidates = [resolvedModel];

    const safeLocation = sanitize(location);
    const safeTopic = sanitize(topic);

    const goodExample = `Good (short): "Head to the farmers market Saturday morning and pick up ingredients for a meal you've never cooked. Document what surprised you." Good (longer): "Over the next three months, learn enough Python to automate one repetitive task at work. Start with a one-hour tutorial this week and build from there."`;

    const prompt = `You are the Quest Giver in Tarvn, an 8-bit RPG productivity tracker. Generate a single quest based on these parameters. Pick whatever scope fits the topic — anything from a focused hour to a multi-month goal. Write descriptions that are engaging but plainspoken — the user should immediately understand what they're doing and why it's worth their time.

${goodExample}
Avoid: mystical language, invented names, phrases like "ancient tome vault" or "blessed by spirits."

Location: ${safeLocation}
Topic/Interest: ${safeTopic}

Respond with ONLY a JSON object (no markdown, no code fences) with these exact fields:
{
  "title": "A catchy quest title (max 50 chars)",
  "description": "A clear, motivating description of the quest (2-3 sentences, explaining what to do and why it matters)",
  "difficulty": <number 1-5>,
  "duration_label": "estimated time (e.g., '2-3 hours', '1 weekend', '2-3 months')",
  "category": "one of: Fitness, Education, Creative, Tech, Food, Outdoors, Social, Wellness, Community, Career, Business, Culture, Productivity"
}`;

    let result;
    let lastError: unknown;
    for (const candidate of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: candidate });
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!result) {
      throw new AppError(
        lastError instanceof Error ? lastError.message : "Failed to generate content",
        502
      );
    }

    const text = result.response.text().trim();

    let questData: unknown;
    try {
      questData = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          questData = JSON.parse(jsonMatch[0]);
        } catch {
          throw new AppError("Could not parse AI response", 502);
        }
      } else {
        throw new AppError("Could not parse AI response", 502);
      }
    }

    const validateResult = responseSchema.safeParse(questData);
    if (!validateResult.success) {
      throw new AppError(
        `AI response validation failed: ${validateResult.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        502
      );
    }

    const validatedData = validateResult.data;
    const duration_minutes = durationLabelToMinutes(validatedData.duration_label);
    const xpReward = calcQuestXP(duration_minutes, validatedData.difficulty);

    return NextResponse.json({
      ...validatedData,
      source: "ai",
      xp_reward: xpReward,
      duration_minutes,
      location: safeLocation,
      status: "available",
    });
  } catch (error) {
    if (error instanceof AppError) {
      const errorMessage =
        error.statusCode >= 500
          ? "The generation service is temporarily unavailable. Please try again."
          : error.message;

      return NextResponse.json(
        { error: errorMessage },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "The generation service is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
