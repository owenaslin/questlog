/**
 * Discovery Cache Layer
 *
 * Tier 1 (Regional): Places by city/intent - 7 days (trails don't move)
 * Tier 3 (Session): User's recent suggestions - 24 hours
 */

import { kv } from '@vercel/kv';
import type {
  CacheTier,
  ProviderPlace,
  DiscoveryIntent
} from './types';

const CACHE_TTL = {
  regional: 7 * 24 * 60 * 60,  // 7 days
  session: 24 * 60 * 60,        // 24 hours
};

// ============================================
// KEY BUILDERS
// ============================================

function buildRegionalKey(
  city: string,
  intent: DiscoveryIntent,
  category?: string,
  region?: string,
  country?: string
): string {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, '_');
  const normalizedRegion = region?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  const normalizedCountry = country?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  const parts = ['discovery', 'regional', normalizedCountry, normalizedRegion, normalizedCity, intent];
  if (category) parts.push(category);
  return parts.join(':');
}

function buildSessionKey(userId: string): string {
  return `discovery:session:${userId}:recent`;
}

// ============================================
// REGIONAL CACHE (Tier 1)
// ============================================

export async function getRegionalPlaces(
  city: string,
  intent: DiscoveryIntent,
  category?: string,
  region?: string,
  country?: string
): Promise<ProviderPlace[] | null> {
  try {
    const key = buildRegionalKey(city, intent, category, region, country);
    const cached = await kv.get<ProviderPlace[]>(key);
    return cached;
  } catch (err) {
    console.warn('[discovery:cache] Regional fetch failed:', err);
    return null;
  }
}

export async function setRegionalPlaces(
  city: string,
  intent: DiscoveryIntent,
  places: ProviderPlace[],
  category?: string,
  region?: string,
  country?: string
): Promise<void> {
  try {
    const key = buildRegionalKey(city, intent, category, region, country);
    await kv.set(key, places, { ex: CACHE_TTL.regional });
  } catch (err) {
    console.warn('[discovery:cache] Regional store failed:', err);
  }
}

// ============================================
// SESSION CACHE (Tier 3) - User's Recent Suggestions
// ============================================

export interface RecentSuggestion {
  place_id: string;
  place_name: string;
  suggested_at: number;
  quest_id?: string;
}

export async function getRecentSuggestions(userId: string): Promise<RecentSuggestion[]> {
  try {
    const key = buildSessionKey(userId);
    const suggestions = await kv.lrange<RecentSuggestion>(key, 0, -1);
    return suggestions || [];
  } catch (err) {
    console.warn('[discovery:cache] Session fetch failed:', err);
    return [];
  }
}

export async function addRecentSuggestion(
  userId: string,
  suggestion: RecentSuggestion,
  maxHistory: number = 5
): Promise<void> {
  try {
    const key = buildSessionKey(userId);
    
    // Add to front of list
    await kv.lpush(key, suggestion);
    
    // Trim to max history
    await kv.ltrim(key, 0, maxHistory - 1);
    
    // Set expiration
    await kv.expire(key, CACHE_TTL.session);
  } catch (err) {
    console.warn('[discovery:cache] Session store failed:', err);
  }
}

export async function getExcludedPlaceIds(userId: string): Promise<string[]> {
  const recent = await getRecentSuggestions(userId);
  return recent.map(r => r.place_id);
}

export async function recordCacheHit(tier: CacheTier, hit: boolean): Promise<void> {
  const metric = hit ? 'hit' : 'miss';
  const key = `metrics:cache:${tier}:${metric}`;
  
  try {
    await kv.incr(key);
    // Keep metrics for 30 days
    await kv.expire(key, 30 * 24 * 60 * 60);
  } catch {
    // Silently fail - metrics are non-critical
  }
}
