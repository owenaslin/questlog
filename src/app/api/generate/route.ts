import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { kv } from "@vercel/kv";

const requestSchema = z.object({
  location: z.string().min(1).max(100).trim(),
  topic: z.string().min(1).max(100).trim(),
  questType: z.enum(["main", "side"]),
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

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

const RATE_LIMIT_WINDOW_MS = 60;
const RATE_LIMIT_MAX_REQUESTS = 12;

/**
 * Check if user is rate limited using Vercel KV (distributed across instances)
 * Stores timestamps as a Redis list with automatic expiration
 */
async function isRateLimited(key: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS * 1000;
  
  try {
    // Get existing timestamps for this key
    const timestamps = await kv.lrange<number>(key, 0, -1);
    
    // Filter to only recent requests within window
    const recent = timestamps.filter((ts) => ts > windowStart);
    
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
      return true;
    }
    
    // Add current timestamp
    await kv.lpush(key, now);
    await kv.expire(key, RATE_LIMIT_WINDOW_MS); // Auto-expire after window
    
    return false;
  } catch (err) {
    // If KV fails, fall back to allowing the request (fail open)
    console.error("Rate limit KV error:", err);
    return false;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim();
  return firstForwarded || "unknown";
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new AppError("Supabase auth config is missing", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const rateLimitKey = `rate_limit:generate:${userId}:${getClientIp(request)}`;
    if (await isRateLimited(rateLimitKey)) {
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
        `Validation error: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        400
      );
    }

    const { location, topic, questType } = parseResult.data;

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError("Gemini API key not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
    const modelCandidates = configuredModel
      ? [configuredModel, "gemini-1.5-flash"]
      : ["gemini-1.5-flash"];

    const safeLocation = sanitizeForPrompt(location);
    const safeTopic = sanitizeForPrompt(topic);

    const prompt = `You are a quest generator for an 8-bit RPG-style task app. Generate a single quest based on these parameters:

Location: ${safeLocation}
Topic/Interest: ${safeTopic}
Quest Type: ${questType === "main" ? "Main Quest (takes months to complete)" : "Side Quest (takes 1 day to a weekend)"}

Respond with ONLY a JSON object (no markdown, no code fences) with these exact fields:
{
  "title": "A catchy quest title (max 50 chars)",
  "description": "A fun, detailed description of the quest (2-3 sentences, written like an RPG quest giver)",
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
        `AI response validation failed: ${validateResult.error.issues.map((i) => i.message).join(", ")}`,
        502
      );
    }

    const validatedData = validateResult.data;
    const baseXP = questType === "main" ? 200 : 50;
    const xpReward = validatedData.difficulty * baseXP;

    return NextResponse.json({
      ...validatedData,
      type: questType,
      source: "ai",
      xp_reward: xpReward,
      location: safeLocation,
      status: "available",
    });
  } catch (error) {
    console.error("Generation error:", error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate quest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
