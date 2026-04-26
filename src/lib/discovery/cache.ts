/**
 * Multi-Tier Adaptive Caching Layer for Discovery Engine
 * 
 * Tier 1 (Regional): Places by city/intent - 7 days (trails don't move)
 * Tier 2 (Temporal): Events - 6 hours
 * Tier 3 (Session): User's recent suggestions - 24 hours
 */

import { kv } from '@vercel/kv';
import type { 
  CacheTier, 
  RegionalCacheKey, 
  ProviderPlace, 
  NarrativeQuest,
  DiscoveryIntent 
} from './types';

const CACHE_TTL = {
  regional: 7 * 24 * 60 * 60,    // 7 days
  temporal: 6 * 60 * 60,          // 6 hours  
  session: 24 * 60 * 60,          // 24 hours
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

function buildTemporalKey(city: string, date: string): string {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, '_');
  return `discovery:temporal:${normalizedCity}:${date}`;
}

function buildSessionKey(userId: string): string {
  return `discovery:session:${userId}:recent`;
}

function buildSuggestionKey(userId: string, city: string): string {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, '_');
  return `discovery:suggestions:${userId}:${normalizedCity}`;
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

// Stale-while-revalidate helper
export async function getRegionalPlacesStaleWhileRevalidate(
  city: string,
  intent: DiscoveryIntent,
  category?: string,
  region?: string,
  country?: string
): Promise<{ data: ProviderPlace[] | null; stale: boolean }> {
  const key = buildRegionalKey(city, intent, category, region, country);
  
  try {
    // Try to get value and TTL
    const [data, ttl] = await Promise.all([
      kv.get<ProviderPlace[]>(key),
      kv.ttl(key),
    ]);
    
    // If TTL is low (< 1 day), consider it stale and trigger revalidate
    const isStale = ttl !== null && ttl < 24 * 60 * 60;
    
    return { data, stale: isStale };
  } catch (err) {
    console.warn('[discovery:cache] SWR fetch failed:', err);
    return { data: null, stale: false };
  }
}

// ============================================
// TEMPORAL CACHE (Tier 2) - For Events
// ============================================

export async function getTemporalEvents(
  city: string,
  date?: string
): Promise<ProviderPlace[] | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const key = buildTemporalKey(city, targetDate);
  
  try {
    return await kv.get<ProviderPlace[]>(key);
  } catch (err) {
    console.warn('[discovery:cache] Temporal fetch failed:', err);
    return null;
  }
}

export async function setTemporalEvents(
  city: string,
  events: ProviderPlace[],
  date?: string
): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const key = buildTemporalKey(city, targetDate);
  
  try {
    await kv.set(key, events, { ex: CACHE_TTL.temporal });
  } catch (err) {
    console.warn('[discovery:cache] Temporal store failed:', err);
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

// ============================================
// CACHED QUEST STORAGE (For "Accepted" quests)
// ============================================

export async function getCachedQuest(userId: string, city: string): Promise<NarrativeQuest | null> {
  const key = buildSuggestionKey(userId, city);
  
  try {
    return await kv.get<NarrativeQuest>(key);
  } catch (err) {
    console.warn('[discovery:cache] Quest fetch failed:', err);
    return null;
  }
}

export async function setCachedQuest(
  userId: string,
  city: string,
  quest: NarrativeQuest,
  ttlHours: number = 24
): Promise<void> {
  const key = buildSuggestionKey(userId, city);
  
  try {
    await kv.set(key, quest, { ex: ttlHours * 60 * 60 });
  } catch (err) {
    console.warn('[discovery:cache] Quest store failed:', err);
  }
}

// ============================================
// CACHE INVALIDATION & METRICS
// ============================================

export async function invalidateRegionalCache(
  city: string,
  intent?: DiscoveryIntent
): Promise<void> {
  try {
    const pattern = intent 
      ? `discovery:regional:${city.toLowerCase().replace(/\s+/g, '_')}:${intent}*`
      : `discovery:regional:${city.toLowerCase().replace(/\s+/g, '_')}:*`;
    
    // Vercel KV doesn't support pattern delete, so we'd need to track keys
    // For now, just let them expire naturally
    console.info('[discovery:cache] Regional cache invalidation requested for pattern:', pattern);
  } catch (err) {
    console.warn('[discovery:cache] Invalidation failed:', err);
  }
}

export async function clearUserSessionCache(userId: string): Promise<void> {
  try {
    const sessionKey = buildSessionKey(userId);
    await kv.del(sessionKey);
  } catch (err) {
    console.warn('[discovery:cache] Session clear failed:', err);
  }
}

// ============================================
// CACHE ANALYTICS (for monitoring)
// ============================================

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
