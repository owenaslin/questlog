/**
 * Discovery Orchestrator
 * 
 * Parallel, race-conditioned fetching from multiple providers
 * with intelligent provider ranking based on user intent.
 */

import type { 
  ProviderSource,
  ProviderPlace,
  ProviderResult,
  ProviderSearchParams,
  OrchestratorConfig,
  OrchestratorResult,
  DiscoveryIntent,
} from './types';
import { 
  getRegionalPlaces, 
  setRegionalPlaces,
  getTemporalEvents,
  setTemporalEvents,
  recordCacheHit,
} from './cache';

// ============================================
// PROVIDER PRIORITY MATRIX
// ============================================

const PROVIDER_PRIORITY: Record<DiscoveryIntent, ProviderSource[]> = {
  'sweat': ['openstreetmap', 'google_places', 'foursquare'],
  'relax': ['google_places', 'openstreetmap', 'foursquare'],
  'learn': ['google_places', 'eventbrite', 'foursquare'],
  'create': ['google_places', 'eventbrite', 'yelp'],
  'socialize': ['eventbrite', 'google_places', 'yelp'],
  'explore': ['openstreetmap', 'google_places', 'foursquare'],
  'eat': ['google_places', 'yelp', 'foursquare'],
  'any': ['google_places', 'openstreetmap', 'foursquare'],
};

// Category mappings for each provider
const PROVIDER_CATEGORIES: Record<ProviderSource, Record<string, string[]>> = {
  'openstreetmap': {
    'sweat': ['trail', 'track', 'fitness_station'],
    'relax': ['park', 'garden', 'nature_reserve'],
    'explore': ['hiking', 'trail', 'viewpoint', 'peak'],
    'any': ['tourism', 'attraction'],
  },
  'google_places': {
    'sweat': ['gym', 'fitness_center', 'sports_complex'],
    'relax': ['spa', 'park', 'retreat'],
    'learn': ['museum', 'library', 'university'],
    'create': ['art_gallery', 'studio', 'workshop'],
    'socialize': ['cafe', 'bar', 'restaurant'],
    'explore': ['park', 'tourist_attraction', 'landmark'],
    'eat': ['restaurant', 'cafe', 'bakery'],
    'any': ['point_of_interest', 'establishment'],
  },
  'eventbrite': {
    'learn': ['class', 'workshop', 'seminar'],
    'create': ['art', 'workshop', 'creative'],
    'socialize': ['social', 'meetup', 'party'],
    'any': ['event'],
  },
  'yelp': {
    'sweat': ['gyms', 'fitness'],
    'relax': ['spas', 'massage', 'parks'],
    'eat': ['restaurants', 'food'],
    'socialize': ['bars', 'cafes'],
    'any': ['local_flavor'],
  },
  'foursquare': {
    'sweat': ['gym', 'outdoors'],
    'relax': ['spa', 'outdoors'],
    'explore': ['outdoors', 'historic_site'],
    'socialize': ['coffee', 'nightlife'],
    'eat': ['food'],
    'any': ['arts', 'shops'],
  },
  'mock': {},
  'fallback_generic': {},
};

// ============================================
// PROVIDER INTERFACES (to be implemented)
// ============================================

interface DiscoveryProvider {
  search(params: ProviderSearchParams): Promise<ProviderResult>;
  name: ProviderSource;
}

// Placeholder imports - these will be implemented in separate files
let mockProvider: DiscoveryProvider;
let googlePlacesProvider: DiscoveryProvider;
let openStreetMapProvider: DiscoveryProvider;

// Provider registry
const providerRegistry: Map<ProviderSource, DiscoveryProvider> = new Map();

export function registerProvider(source: ProviderSource, provider: DiscoveryProvider): void {
  providerRegistry.set(source, provider);
}

export function getProvider(source: ProviderSource): DiscoveryProvider | undefined {
  return providerRegistry.get(source);
}

// ============================================
// ORCHESTRATOR
// ============================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  timeout_ms: 5000,
  max_providers: 3,
  deduplicate: true,
  require_min_results: 3,
};

export async function discoverPlaces(
  params: ProviderSearchParams,
  config: Partial<OrchestratorConfig> = {}
): Promise<OrchestratorResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  
  // 1. Check regional cache first (Tier 1)
  const cached = await getRegionalPlaces(
    params.location.city,
    params.intent
  );
  
  if (cached && cached.length >= mergedConfig.require_min_results) {
    await recordCacheHit('regional', true);
    console.info('[discovery:orchestrator] Cache hit - returning cached places');
    
    // Filter out excluded places
    const filtered = params.exclude_place_ids 
      ? cached.filter(p => !params.exclude_place_ids?.includes(p.id))
      : cached;
    
    return {
      places: filtered.slice(0, params.max_results),
      sources_used: ['mock'], // Would track actual sources
      total_latency_ms: Date.now() - startTime,
      from_cache: true,
      partial_results: false,
      errors: [],
    };
  }
  
  await recordCacheHit('regional', false);
  
  // 2. Determine provider priority for this intent
  const priorityList = PROVIDER_PRIORITY[params.intent] || PROVIDER_PRIORITY['any'];
  const providersToQuery = priorityList.slice(0, mergedConfig.max_providers);
  
  // 3. Parallel fetch with race condition
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, mergedConfig.timeout_ms);
  
  try {
    // Build fetch promises
    const fetchPromises = providersToQuery.map(async (source) => {
      const provider = getProvider(source);
      if (!provider) {
        return {
          source,
          places: [],
          latency_ms: 0,
          cached: false,
          error: 'Provider not registered',
        } as ProviderResult;
      }
      
      const providerStart = Date.now();
      try {
        // Add category mapping
        const enhancedParams = {
          ...params,
          categories: PROVIDER_CATEGORIES[source]?.[params.intent] || [],
        };
        
        const result = await provider.search(enhancedParams);
        return {
          ...result,
          source,
          latency_ms: Date.now() - providerStart,
        };
      } catch (err) {
        return {
          source,
          places: [],
          latency_ms: Date.now() - providerStart,
          cached: false,
          error: err instanceof Error ? err.message : String(err),
        } as ProviderResult;
      }
    });
    
    // Wait for all to settle (or timeout)
    const results = await Promise.allSettled(fetchPromises);
    clearTimeout(timeout);
    
    // 4. Aggregate results
    const successful: ProviderResult[] = [];
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.error) {
          errors.push(`${result.value.source}: ${result.value.error}`);
        } else {
          successful.push(result.value);
        }
      } else {
        errors.push(`${providersToQuery[index]}: ${result.reason}`);
      }
    });
    
    // 5. Deduplicate and merge
    let allPlaces = successful.flatMap(r => r.places);
    
    if (mergedConfig.deduplicate) {
      allPlaces = deduplicatePlaces(allPlaces);
    }
    
    // 6. Filter excluded places
    if (params.exclude_place_ids) {
      allPlaces = allPlaces.filter(p => !params.exclude_place_ids?.includes(p.id));
    }
    
    // 7. Sort by relevance (rating + distance + review count)
    allPlaces = rankPlaces(allPlaces);
    
    // 8. Cache if we have enough results
    if (allPlaces.length >= mergedConfig.require_min_results) {
      await setRegionalPlaces(params.location.city, params.intent, allPlaces);
    }
    
    const totalLatency = Date.now() - startTime;
    const partial_results = allPlaces.length < mergedConfig.require_min_results;
    
    // 9. If insufficient results, trigger fallback logic
    if (allPlaces.length === 0) {
      return {
        places: [],
        sources_used: [],
        total_latency_ms: totalLatency,
        from_cache: false,
        partial_results: true,
        errors: [...errors, 'No results from any provider'],
      };
    }
    
    return {
      places: allPlaces.slice(0, params.max_results),
      sources_used: successful.map(s => s.source),
      total_latency_ms: totalLatency,
      from_cache: false,
      partial_results,
      errors,
    };
    
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ============================================
// PLACE DEDUPLICATION
// ============================================

function deduplicatePlaces(places: ProviderPlace[]): ProviderPlace[] {
  const seen = new Map<string, ProviderPlace>();
  
  for (const place of places) {
    const key = generatePlaceKey(place);
    const existing = seen.get(key);
    
    if (!existing) {
      seen.set(key, place);
    } else {
      // Merge metadata, prefer higher-rated
      if ((place.rating || 0) > (existing.rating || 0)) {
        seen.set(key, {
          ...place,
          metadata: { ...existing.metadata, ...place.metadata },
        });
      }
    }
  }
  
  return Array.from(seen.values());
}

function generatePlaceKey(place: ProviderPlace): string {
  // Normalize address for better deduping
  const normalizedAddress = place.address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd)\b/gi, '')
    .trim();
  
  // Round coordinates to ~100m precision for fuzzy matching
  const roundedLat = Math.round(place.coordinates.lat * 1000) / 1000;
  const roundedLng = Math.round(place.coordinates.lng * 1000) / 1000;
  
  return `${place.name.toLowerCase().trim()}_${roundedLat}_${roundedLng}`;
}

// ============================================
// PLACE RANKING
// ============================================

function rankPlaces(places: ProviderPlace[]): ProviderPlace[] {
  return places.sort((a, b) => {
    // Composite score: rating * log(review_count + 1) - distance_penalty
    const scoreA = calculateRelevanceScore(a);
    const scoreB = calculateRelevanceScore(b);
    return scoreB - scoreA;
  });
}

function calculateRelevanceScore(place: ProviderPlace): number {
  const rating = place.rating || 3;
  const reviewCount = place.review_count || 0;
  const distance = place.distance_km || 0;
  
  // Rating component (0-5)
  const ratingScore = rating;
  
  // Review count component (logarithmic scale)
  const reviewScore = Math.log10(reviewCount + 1);
  
  // Distance penalty (closer is better, -0.5 per km)
  const distancePenalty = distance * 0.5;
  
  // Price level bonus (prefer mid-range, 2-3)
  const priceBonus = place.price_level === 2 || place.price_level === 3 ? 0.5 : 0;
  
  return ratingScore + reviewScore - distancePenalty + priceBonus;
}

// ============================================
// FALLBACK HANDLING
// ============================================

export async function expandSearchRadius(
  params: ProviderSearchParams,
  multiplier: number = 2
): Promise<OrchestratorResult> {
  const expandedParams = {
    ...params,
    radius_km: Math.min(params.radius_km * multiplier, 50), // Cap at 50km
  };
  
  return discoverPlaces(expandedParams, { 
    timeout_ms: 8000, // Allow more time for expanded search
    require_min_results: 1, // Lower threshold for fallback
  });
}

// ============================================
// PROVIDER REGISTRATION
// ============================================

// Placeholder: Providers are registered at runtime
// registerProvider('google_places', googlePlacesProvider);
// registerProvider('openstreetmap', openStreetMapProvider);
// registerProvider('mock', mockDiscoveryProvider);
