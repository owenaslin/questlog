/**
 * Tarvn Local Discovery Engine - Type Definitions
 * 
 * Privacy-first location quest discovery with AI narrative wrapping.
 */

// ============================================
// LOCATION & PRIVACY TYPES
// ============================================

export type PrivacyLevel = 'exact' | 'approximate' | 'city-only';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface LocationContext {
  city: string;
  neighborhood?: string;
  region?: string;
  country?: string;
  coords?: GeoCoordinates; // Only available if privacy_level = 'exact'
}

export interface UserLocationPreferences {
  discovery_radius_km: number;
  privacy_level: PrivacyLevel;
  preferred_categories: string[];
  avoid_chains: boolean;
  prefer_high_rated: boolean;
  max_discovery_cost_daily: number;
}

// ============================================
// PROVIDER TYPES
// ============================================

export interface DiscoveryProvider {
  name: ProviderSource;
  search(params: ProviderSearchParams): Promise<ProviderResult>;
}

export type ProviderSource = 
  | 'google_places' 
  | 'openstreetmap' 
  | 'eventbrite' 
  | 'yelp' 
  | 'foursquare'
  | 'mock'
  | 'fallback_generic';

export type DiscoveryIntent = 
  | 'sweat'        // Fitness → OpenStreetMap trails, Gyms
  | 'relax'        // Wellness → Spas, Parks
  | 'learn'        // Education → Museums, Libraries
  | 'create'       // Creative → Art studios, Workshops
  | 'socialize'    // Social → Cafes, Bars, Events
  | 'explore'      // Outdoors → OpenStreetMap trails, Landmarks
  | 'eat'          // Food → Restaurants, Markets
  | 'any';         // No preference

export interface ProviderPlace {
  id: string;
  source: ProviderSource;
  name: string;
  description?: string;
  address: string;
  coordinates: GeoCoordinates;
  rating?: number;
  review_count?: number;
  photos?: string[];
  website?: string;
  phone?: string;
  hours?: string[];
  price_level?: 1 | 2 | 3 | 4;
  categories: string[];
  tags: string[];
  is_open_now?: boolean;
  distance_km?: number;
  metadata?: Record<string, unknown>; // Provider-specific data
}

export interface ProviderSearchParams {
  location: LocationContext;
  intent: DiscoveryIntent;
  radius_km: number;
  categories?: string[];
  max_results: number;
  exclude_place_ids?: string[]; // Already suggested places
}

export interface ProviderResult {
  places: ProviderPlace[];
  source: ProviderSource;
  latency_ms: number;
  cached: boolean;
  error?: string;
}

// ============================================
// ORCHESTRATOR TYPES
// ============================================

export interface OrchestratorConfig {
  timeout_ms: number;
  max_providers: number;
  deduplicate: boolean;
  require_min_results: number;
}

export interface OrchestratorResult {
  places: ProviderPlace[];
  sources_used: ProviderSource[];
  total_latency_ms: number;
  from_cache: boolean;
  partial_results: boolean;
  errors: string[];
}

// ============================================
// AI/NARRATIVE TYPES
// ============================================

export interface NarrativeQuest {
  // Core quest fields (extends base Quest)
  title: string;
  description: string;
  difficulty: number;
  duration_label: string;
  category: string;
  xp_reward: number;
  
  // Narrative elements (TARE framework)
  narrative: {
    task: string;        // What to do
    artifact: string;    // What to find/bring back
    requirement: string; // Prerequisites
    environment: string; // Setting description
    hook: string;        // Opening line
    reward_flavor: string; // XP description
  };
  
  // Discovery metadata
  discovery: {
    place_id: string;
    place_name: string;
    place_address: string;
    place_coords: GeoCoordinates;
    provider_source: ProviderSource;
    neighborhood_context: string;
    discovery_reasoning: string; // CoT: why this place was chosen
  };
  
  // UI metadata
  ui: {
    static_map_url?: string;
    place_photos?: string[];
    icon_emoji: string;
    theme_color: string;
  };
}

export interface ChainOfThoughtPrompt {
  system: string;
  context: string;
  candidates: string;
  instruction: string;
  schema: string;
}

// ============================================
// CACHE TYPES
// ============================================

export type CacheTier = 'regional' | 'temporal' | 'session';

export interface CacheEntry<T> {
  data: T;
  expires_at: number;
  tier: CacheTier;
}

export interface RegionalCacheKey {
  city: string;
  intent: DiscoveryIntent;
  category?: string;
}

// ============================================
// API TYPES
// ============================================

export interface DiscoveryRequest {
  intent: DiscoveryIntent;
  theme?: string; // Optional narrative theme
  exclude_recent?: boolean; // Exclude places from last 5 suggestions
}

export interface DiscoveryResponse {
  success: boolean;
  quest: NarrativeQuest | null;
  fallback: boolean;
  generation_time_ms: number;
  message?: string;
  remaining_daily: number;
}

export interface DiscoveryState {
  status: 'idle' | 'scouting' | 'consulting' | 'manifested' | 'error';
  progress: number; // 0-100
  message: string;
}

// ============================================
// FALLBACK TYPES
// ============================================

export interface FallbackQuestTemplate {
  level: 1 | 2 | 3; // 1=city, 2=regional, 3=global
  condition: 'empty_results' | 'api_error' | 'rate_limited' | 'rural_area';
  template: {
    title_pattern: string;
    description_pattern: string;
    task_pattern: string;
  };
}
