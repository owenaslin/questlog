/**
 * Discovery API Route
 * 
 * POST /api/discover
 * Generates a narrative quest based on user's location and intent.
 * 
 * Features:
 * - Rate limiting (5 discoveries/day per user)
 * - Privacy-first location handling
 * - Parallel provider orchestration
 * - Chain-of-Thought AI prompting
 * - Multi-tier caching
 * - Fallback handling for rural/empty areas
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

import type { 
  DiscoveryRequest, 
  DiscoveryResponse, 
  OrchestratorResult,
  NarrativeQuest,
  ProviderSearchParams,
} from '@/lib/discovery/types';

import { discoverPlaces, expandSearchRadius, registerProvider } from '@/lib/discovery/orchestrator';
import { mockDiscoveryProvider } from '@/lib/discovery/providers/mock';
import { openStreetMapProvider } from '@/lib/discovery/providers/openstreetmap';
import { 
  buildLocationContext, 
  isValidCoordinates,
  sanitizeCoordinates,
  isValidPrivacyLevel,
} from '@/lib/discovery/privacy';
import { 
  buildChainOfThoughtPrompt, 
  assemblePromptForLLM,
  getFallbackTemplate,
} from '@/lib/discovery/prompts';
import { 
  getExcludedPlaceIds,
  addRecentSuggestion,
  getCachedQuest,
} from '@/lib/discovery/cache';
import { getLatestFlashModel } from '@/lib/gemini';

// Register providers for development
registerProvider('mock', mockDiscoveryProvider);
registerProvider('openstreetmap', openStreetMapProvider);

// ============================================
// CONFIGURATION
// ============================================

const DAILY_DISCOVERY_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute between requests
const RATE_LIMIT_MAX_REQUESTS = 3; // Max 3 requests per minute
const ALLOW_RATE_LIMIT_BYPASS = process.env.ALLOW_RATE_LIMIT_BYPASS === 'true'; // Explicit bypass flag

// ============================================
// SCHEMA VALIDATION
// ============================================

const requestSchema = z.object({
  intent: z.enum([
    'sweat', 'relax', 'learn', 'create', 'socialize', 'explore', 'eat', 'any'
  ]),
  theme: z.string().max(100).optional(),
  coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  city: z.string().min(1).max(100).optional(),
  exclude_recent: z.boolean().default(true),
});

// ============================================
// AUTH & RATE LIMITING
// ============================================

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token;
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[discover] Supabase config missing');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

async function checkRateLimit(userId: string): Promise<{ 
  allowed: boolean; 
  remaining: number;
  resetAt?: Date;
}> {
  const key = `rate_limit:discover:${userId}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  
  try {
    const timestamps = await kv.lrange<number>(key, 0, -1);
    const recent = timestamps.filter(ts => ts > windowStart);
    
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
      const oldest = Math.min(...recent);
      const resetAt = new Date(oldest + RATE_LIMIT_WINDOW_MS);
      return { allowed: false, remaining: 0, resetAt };
    }
    
    await kv.lpush(key, now);
    await kv.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    
    return { 
      allowed: true, 
      remaining: RATE_LIMIT_MAX_REQUESTS - recent.length - 1 
    };
  } catch (err) {
    console.warn('[discover] Rate limit check failed:', err);
    // Only fail open if explicitly configured
    if (ALLOW_RATE_LIMIT_BYPASS) {
      console.warn('[discover] Rate limit bypass enabled (ALLOW_RATE_LIMIT_BYPASS=true)');
      return { allowed: true, remaining: 999 };
    }
    return { allowed: false, remaining: 0 };
  }
}

async function checkDailyLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `daily_limit:discover:${userId}:${new Date().toISOString().split('T')[0]}`;
  
  try {
    const count = await kv.get<number>(key) || 0;
    
    if (count >= DAILY_DISCOVERY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    
    await kv.set(key, count + 1, { ex: 24 * 60 * 60 }); // Expire end of day
    return { allowed: true, remaining: DAILY_DISCOVERY_LIMIT - count - 1 };
  } catch (err) {
    console.warn('[discover] Daily limit check failed:', err);
    // Only fail open if explicitly configured
    if (ALLOW_RATE_LIMIT_BYPASS) {
      console.warn('[discover] Rate limit bypass enabled (ALLOW_RATE_LIMIT_BYPASS=true)');
      return { allowed: true, remaining: 999 };
    }
    return { allowed: false, remaining: 0 };
  }
}

// ============================================
// USER PREFERENCES
// ============================================

async function getUserPreferences(userId: string, token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  // Use authenticated client with user's token (RLS enforces access control)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase
    .from('profiles')
    .select('location_city, location_lat, location_lng, discovery_radius_km, privacy_level, discovery_preferences')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.warn('[discover] Failed to fetch user preferences:', error);
    return null;
  }

  return data;
}

// ============================================
// AI GENERATION
// ============================================

async function generateQuestWithAI(
  places: OrchestratorResult,
  location: { city: string; neighborhood?: string },
  intent: string,
  theme?: string
): Promise<NarrativeQuest | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[discover] Gemini API key not configured');
    return null;
  }
  
  const prompt = buildChainOfThoughtPrompt({
    location: {
      city: location.city,
      neighborhood: location.neighborhood,
    },
    places: places.places.slice(0, 5), // Top 5 candidates
    intent,
    theme,
  });
  
  const assembledPrompt = assemblePromptForLLM(prompt);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = await getLatestFlashModel(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent(assembledPrompt);
    const text = result.response.text().trim();
    
    // Extract JSON from response
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate required fields
    if (!parsed.title || !parsed.description || !parsed.narrative || !parsed.discovery) {
      console.error('[discover] AI response missing required fields');
      return null;
    }
    
    // Calculate XP reward
    const baseXP = 50;
    const xpReward = (parsed.difficulty || 3) * baseXP;
    
    return {
      ...parsed,
      xp_reward: xpReward,
      type: 'side',
      source: 'ai',
    } as NarrativeQuest;
    
  } catch (err) {
    console.error('[discover] AI generation failed:', err);
    return null;
  }
}

// ============================================
// FALLBACK GENERATION
// ============================================

function generateFallbackQuest(
  level: 1 | 2 | 3,
  city: string,
  coordinates?: { lat: number; lng: number }
): NarrativeQuest {
  const template = getFallbackTemplate(level);

  // Use provided coordinates or default to reasonable fallback values
  const fallbackCoords = coordinates || { lat: 40.7128, lng: -74.0060 }; // NYC as last resort

  return {
    title: template.title,
    description: template.description,
    difficulty: 2,
    duration_label: '30-60 minutes',
    category: template.category,
    xp_reward: 100,
    narrative: {
      task: template.task,
      artifact: template.artifact,
      requirement: 'Available any time',
      environment: `In or around ${city}`,
      hook: template.description,
      reward_flavor: 'Experience points for your journey',
    },
    discovery: {
      place_id: 'fallback_generic',
      place_name: city,
      place_address: city,
      place_coords: fallbackCoords,
      provider_source: 'fallback_generic',
      neighborhood_context: city,
      discovery_reasoning: 'No local places found; generated generic exploration quest',
    },
    ui: {
      icon_emoji: '🗺️',
      theme_color: '#8B7355',
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authentication
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required', remaining_daily: 0 },
        { status: 401 }
      );
    }
    
    // 2. Rate limiting (per-minute)
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Rate limit exceeded. Try again at ${rateLimit.resetAt?.toLocaleTimeString()}`,
          remaining_daily: 0 
        },
        { status: 429 }
      );
    }
    
    // 3. Daily limit check
    const dailyLimit = await checkDailyLimit(userId);
    if (!dailyLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Daily discovery limit reached. Return tomorrow for more quests.',
          remaining_daily: 0 
        },
        { status: 429 }
      );
    }
    
    // 4. Parse request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body', remaining_daily: dailyLimit.remaining },
        { status: 400 }
      );
    }
    
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Validation error: ${parseResult.error.issues.map((i: { message: string }) => i.message).join(', ')}`,
          remaining_daily: dailyLimit.remaining 
        },
        { status: 400 }
      );
    }
    
    const { intent, theme, coords, city: providedCity, exclude_recent } = parseResult.data;

    // Get the user's auth token for RLS-protected queries
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication token missing', remaining_daily: dailyLimit.remaining },
        { status: 401 }
      );
    }

    // 5. Get user preferences
    const userPrefs = await getUserPreferences(userId, token);
    
    // Determine location
    let city = providedCity;
    let coordinates = coords;
    let privacyLevel = 'approximate';
    let radiusKm = 20;
    
    if (userPrefs) {
      city = city || userPrefs.location_city || 'Your City';
      // Use separate lat/lng columns with validation
      if (!coordinates && 
          typeof userPrefs.location_lat === 'number' && 
          typeof userPrefs.location_lng === 'number' &&
          !isNaN(userPrefs.location_lat) && 
          !isNaN(userPrefs.location_lng)) {
        coordinates = {
          lat: userPrefs.location_lat,
          lng: userPrefs.location_lng,
        };
      }
      privacyLevel = userPrefs.privacy_level || 'approximate';
      radiusKm = userPrefs.discovery_radius_km || 20;
    }
    
    if (!city) {
      city = 'Your City';
    }
    
    // 6. Build location context (privacy-first)
    const locationContext = await buildLocationContext({
      coords: coordinates,
      city,
      privacyLevel: isValidPrivacyLevel(privacyLevel) ? privacyLevel : 'approximate',
      userId,
    });
    
    // 7. Get excluded places (recent suggestions)
    const excludedIds = exclude_recent ? await getExcludedPlaceIds(userId) : [];
    
    // 8. Discover places
    const searchParams: ProviderSearchParams = {
      location: locationContext,
      intent,
      radius_km: radiusKm,
      max_results: 10,
      exclude_place_ids: excludedIds,
    };
    
    let places = await discoverPlaces(searchParams, {
      timeout_ms: 5000,
      max_providers: 3,
      require_min_results: 3,
    });
    
    // 9. If insufficient results, expand radius
    let usedFallback = false;
    let fallbackLevel: 1 | 2 | 3 = 1;
    
    if (places.partial_results || places.places.length < 3) {
      console.info('[discover] Insufficient results, expanding search...');
      places = await expandSearchRadius(searchParams, 2);
      
      if (places.places.length === 0) {
        // Level 1: Expand to 50km already done
        // Level 2: Generic city quest
        usedFallback = true;
        fallbackLevel = 2;
        
        // Try one more expansion
        places = await expandSearchRadius(searchParams, 3);
        
        if (places.places.length === 0) {
          // Level 3: Global fallback
          fallbackLevel = 3;
        }
      }
    }
    
    // 10. Generate quest with AI (or fallback)
    let quest: NarrativeQuest;

    if (usedFallback && fallbackLevel >= 2) {
      quest = generateFallbackQuest(fallbackLevel, city, coordinates);
    } else {
      const generated = await generateQuestWithAI(
        places,
        { city: locationContext.city, neighborhood: locationContext.neighborhood },
        intent,
        theme
      );

      if (!generated) {
        // AI failed, use fallback
        quest = generateFallbackQuest(1, city, coordinates);
        usedFallback = true;
      } else {
        quest = generated;
      }
    }
    
    // 11. Record in session cache
    await addRecentSuggestion(userId, {
      place_id: quest.discovery.place_id,
      place_name: quest.discovery.place_name,
      suggested_at: Date.now(),
    });
    
    const generationTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      quest,
      fallback: usedFallback,
      generation_time_ms: generationTime,
      remaining_daily: dailyLimit.remaining,
    });
    
  } catch (err) {
    console.error('[discover] Unexpected error:', err);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.',
        remaining_daily: 0 
      },
      { status: 500 }
    );
  }
}
