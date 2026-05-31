/**
 * Travel Expedition API Route
 * 
 * POST /api/discover/expedition
 * Generates a 3-stage visual expedition saga based on destination city and vibe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

import type { 
  OrchestratorResult,
  ProviderSearchParams,
} from '@/lib/discovery/types';

import { discoverPlaces, registerProvider } from '@/lib/discovery/orchestrator';
import { mockDiscoveryProvider } from '@/lib/discovery/providers/mock';
import { openStreetMapProvider } from '@/lib/discovery/providers/openstreetmap';
import { buildLocationContext, isValidPrivacyLevel } from '@/lib/discovery/privacy';
import { getLatestFlashModel } from '@/lib/gemini';

// Register providers in case they aren't registered yet
registerProvider('mock', mockDiscoveryProvider);
registerProvider('openstreetmap', openStreetMapProvider);

const DAILY_DISCOVERY_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const ALLOW_RATE_LIMIT_BYPASS = process.env.ALLOW_RATE_LIMIT_BYPASS === 'true';

// Validation Schema
const requestSchema = z.object({
  city: z.string().min(1).max(80),
  vibe: z.enum(['wilderness', 'art', 'tech', 'epicurean']),
  coords: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

// Vibe mapping to 3 distinct intents & categories
const VIBE_INTENT_MAP = {
  wilderness: {
    intents: ['explore', 'eat', 'learn'] as const,
    categories: ['Outdoors', 'Food', 'Culture'] as const,
    labels: ['Scout the Wilds', 'Replenish Rations', 'Study the Lore'] as const,
  },
  art: {
    intents: ['create', 'eat', 'socialize'] as const,
    categories: ['Creative', 'Food', 'Social'] as const,
    labels: ['Forge Creative Energy', 'Refuel at Hearth', 'Engage the Guild'] as const,
  },
  tech: {
    intents: ['create', 'eat', 'learn'] as const,
    categories: ['Tech', 'Food', 'Education'] as const,
    labels: ['Engineer the Future', 'Gather Rations', 'Study Ancient Runes'] as const,
  },
  epicurean: {
    intents: ['explore', 'eat', 'socialize'] as const,
    categories: ['Culture', 'Food', 'Social'] as const,
    labels: ['Investigate Landmark', 'Taste local Brews', 'Feast at Tavern'] as const,
  },
};

// Auth and Rate limit helpers
function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

async function checkDailyLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `daily_limit:discover:${userId}:${new Date().toISOString().split('T')[0]}`;
  try {
    const count = await kv.get<number>(key) || 0;
    if (count >= DAILY_DISCOVERY_LIMIT) return { allowed: false, remaining: 0 };
    await kv.set(key, count + 1, { ex: 24 * 60 * 60 });
    return { allowed: true, remaining: DAILY_DISCOVERY_LIMIT - count - 1 };
  } catch (err) {
    if (ALLOW_RATE_LIMIT_BYPASS) return { allowed: true, remaining: 999 };
    return { allowed: false, remaining: 0 };
  }
}

async function getUserCity(userId: string, token: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return 'Your City';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data } = await supabase.from('profiles').select('location_city').eq('id', userId).single();
  return data?.location_city || 'Your City';
}

// Prompt Builder for Gemini
const SYSTEM_PROMPT = `You are the "Grand Chronicler of Tarvn," an ancient entity who weaves mundane locations into grand, multi-stage fantasy voyages (Expedition Sagas).
You must select exactly ONE place from each of the three candidate groups, and connect them into a chronological 3-stage campaign.

CORE RULES:
1. FACTUAL INTEGRITY: Use ONLY confirmed names, addresses, and tags. Do not invent amenities or open hours.
2. TARE FRAMEWORK: Every stage quest must define a Task (action), Artifact (item to find/sketch/buy), Requirement (prerequisites), and Environment (atmospheric description).
3. NARRATIVE BINDING: Weave a unified, epic story arc. Explain why the hero scales the mountain (Stage 1), rests at the specific coffee shop (Stage 2), and studies the relics at the museum (Stage 3).

OUTPUT SCHEMA: Return valid JSON matching this schema exactly. Do not wrap in markdown or explanations.`;

function buildExpeditionPrompt(
  city: string,
  vibe: string,
  group1: OrchestratorResult,
  group2: OrchestratorResult,
  group3: OrchestratorResult,
  config: typeof VIBE_INTENT_MAP[keyof typeof VIBE_INTENT_MAP]
): string {
  const formatList = (res: OrchestratorResult) =>
    res.places.slice(0, 3).map(p => 
      `- **${p.name}** [ID: ${p.id}]
        Address: ${p.address}
        Tags: [${p.tags.join(', ')}]
        Description: ${p.description || 'N/A'}`
    ).join('\n\n');

  return `${SYSTEM_PROMPT}

EXPEDITION CONTEXT:
- Target City: ${city}
- Theme Vibe: "${vibe}"

CANDIDATES FOR STAGE 1 (${config.labels[0]} - Category: ${config.categories[0]}):
${formatList(group1)}

CANDIDATES FOR STAGE 2 (${config.labels[1]} - Category: ${config.categories[1]}):
${formatList(group2)}

CANDIDATES FOR STAGE 3 (${config.labels[2]} - Category: ${config.categories[2]}):
${formatList(group3)}

INSTRUCTIONS:
1. Choose exactly ONE place from each group.
2. Write an overall narrative description linking them.
3. Output a strictly formatted JSON matching this exact structure:

{
  "title": "Epic Voyage Title (max 60 chars)",
  "description": "Narrative binding the three stages into a journey (2-3 sentences)",
  "category": "${config.categories[0]}",
  "stages": [
    {
      "step_number": 1,
      "title": "Stage 1 Title (e.g. 'Scout the Whispering Pines')",
      "description": "Visual, RPG description of the task using TARE.",
      "category": "${config.categories[0]}",
      "xp_reward": 50,
      "narrative": {
        "task": "What the hero must do at the location",
        "artifact": "What the hero must find/document",
        "requirement": "Open hours or entry notes",
        "environment": "Factual description of the setting"
      },
      "discovery": {
        "place_id": "Selected ID from Group 1",
        "place_name": "Actual business name",
        "place_address": "Full address",
        "place_coords": {"lat": 0, "lng": 0}
      },
      "ui": {
        "icon_emoji": "Single emoji",
        "theme_color": "#E8B864"
      }
    },
    {
      "step_number": 2,
      "title": "Stage 2 Title (e.g. 'Refuel at the Roaster\\'s Hearth')",
      "description": "Visual, RPG description of the task using TARE.",
      "category": "${config.categories[1]}",
      "xp_reward": 50,
      "narrative": {
        "task": "Action at location",
        "artifact": "What to observe/get",
        "requirement": "Open hours",
        "environment": "Setting description"
      },
      "discovery": {
        "place_id": "Selected ID from Group 2",
        "place_name": "Actual business name",
        "place_address": "Full address",
        "place_coords": {"lat": 0, "lng": 0}
      },
      "ui": {
        "icon_emoji": "Single emoji",
        "theme_color": "#A7F070"
      }
    },
    {
      "step_number": 3,
      "title": "Stage 3 Title (e.g. 'Consult the Ancient Reliquary')",
      "description": "Visual, RPG description of the task using TARE.",
      "category": "${config.categories[2]}",
      "xp_reward": 50,
      "narrative": {
        "task": "Action at location",
        "artifact": "What to observe/get",
        "requirement": "Open hours",
        "environment": "Setting description"
      },
      "discovery": {
        "place_id": "Selected ID from Group 3",
        "place_name": "Actual business name",
        "place_address": "Full address",
        "place_coords": {"lat": 0, "lng": 0}
      },
      "ui": {
        "icon_emoji": "Single emoji",
        "theme_color": "#82A8F4"
      }
    }
  ]
}

CRITICAL: Output ONLY the raw JSON object. No markdown code blocks, no trailing tags.`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const dailyLimit = await checkDailyLimit(userId);
    if (!dailyLimit.allowed) {
      return NextResponse.json({ success: false, message: 'Daily discovery limit reached.' }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: `Validation error: ${parseResult.error.issues.map((i: any) => i.message).join(', ')}` },
        { status: 400 }
      );
    }

    const { city, vibe, coords } = parseResult.data;
    const vibeConfig = VIBE_INTENT_MAP[vibe as keyof typeof VIBE_INTENT_MAP];
    const token = getBearerToken(request) || "";

    // 1. Resolve coordinates
    let coordinates = coords;
    if (!coordinates) {
      // Default fuzzy center
      coordinates = { lat: 45.5152, lng: -122.6784 }; // Default seed
    }

    const locationContext = await buildLocationContext({
      coords: coordinates,
      city,
      privacyLevel: 'approximate',
    });

    const baseSearchParams = {
      location: locationContext,
      radius_km: 25,
      max_results: 6,
    };

    // 2. Discover Places in parallel for all three intents!
    console.info(`[discover:expedition] Fetching places for city: ${city}, vibe: ${vibe}`);
    const [group1, group2, group3] = await Promise.all([
      discoverPlaces({ ...baseSearchParams, intent: vibeConfig.intents[0] }),
      discoverPlaces({ ...baseSearchParams, intent: vibeConfig.intents[1] }),
      discoverPlaces({ ...baseSearchParams, intent: vibeConfig.intents[2] }),
    ]);

    // Ensure we have candidates. If some are empty, use fallback mock places
    if (group1.places.length === 0 || group2.places.length === 0 || group3.places.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Fuzzy search yielded insufficient local places in "${city}". Try a larger regional hub or a different vibe.`,
      }, { status: 422 });
    }

    // 3. Weave using Google Gemini
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Gemini API not configured' }, { status: 500 });
    }

    const promptText = buildExpeditionPrompt(city, vibe, group1, group2, group3, vibeConfig);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = await getLatestFlashModel(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(promptText);
    const responseText = result.response.text().trim();

    let jsonText = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    if (!parsed.title || !parsed.stages || parsed.stages.length !== 3) {
      throw new Error('AI failed to output valid stages');
    }

    // Inject place coordinates from search results
    const findCoords = (groupId: string, stepNum: number) => {
      const candidates = stepNum === 1 ? group1 : stepNum === 2 ? group2 : group3;
      const match = candidates.places.find(p => p.id === groupId);
      return match?.coordinates || coordinates;
    };

    parsed.stages.forEach((stage: any) => {
      stage.discovery.place_coords = findCoords(stage.discovery.place_id, stage.step_number);
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      expedition: {
        title: parsed.title,
        description: parsed.description,
        vibe,
        city,
        stages: parsed.stages,
      },
      generation_time_ms: duration,
      remaining_daily: dailyLimit.remaining,
    });

  } catch (err) {
    console.error('[discover:expedition] Unexpected error:', err);
    return NextResponse.json({ success: false, message: 'Failed to forge travel expedition. Please try again.' }, { status: 500 });
  }
}
