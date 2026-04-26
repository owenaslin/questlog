/**
 * Tarvn Local Discovery Engine
 * 
 * Export all discovery modules for easy imports.
 */

// Types
export type {
  PrivacyLevel,
  GeoCoordinates,
  LocationContext,
  UserLocationPreferences,
  ProviderSource,
  DiscoveryIntent,
  ProviderPlace,
  ProviderSearchParams,
  ProviderResult,
  OrchestratorConfig,
  OrchestratorResult,
  NarrativeQuest,
  ChainOfThoughtPrompt,
  DiscoveryRequest,
  DiscoveryResponse,
  DiscoveryState,
  CacheTier,
  RegionalCacheKey,
  FallbackQuestTemplate,
} from './types';

// Cache
export {
  getRegionalPlaces,
  setRegionalPlaces,
  getRegionalPlacesStaleWhileRevalidate,
  getTemporalEvents,
  setTemporalEvents,
  getRecentSuggestions,
  addRecentSuggestion,
  getExcludedPlaceIds,
  getCachedQuest,
  setCachedQuest,
  invalidateRegionalCache,
  clearUserSessionCache,
  recordCacheHit,
  type RecentSuggestion,
} from './cache';

// Orchestrator
export {
  discoverPlaces,
  expandSearchRadius,
  registerProvider,
  getProvider,
} from './orchestrator';

// Privacy
export {
  reverseGeocode,
  buildLocationContext,
  getNeighborhoodContext,
  isValidCoordinates,
  sanitizeCoordinates,
  isValidPrivacyLevel,
  getDefaultPrivacyLevel,
  getDefaultDiscoveryPreferences,
  mergeWithDefaults,
} from './privacy';

// Prompts
export {
  GRAND_CHRONICLER_SYSTEM_PROMPT,
  buildChainOfThoughtPrompt,
  assemblePromptForLLM,
  getFallbackTemplate,
  FALLBACK_TEMPLATES,
} from './prompts';

// Providers
export { mockDiscoveryProvider, mockEventProvider } from './providers/mock';
export { 
  openStreetMapProvider,
  buildOverpassQuery,
  fetchFromOverpass,
} from './providers/openstreetmap';

// Constants
export const DISCOVERY_CONSTANTS = {
  DAILY_LIMIT: 5,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: 3,
  CACHE_TTL_REGIONAL_DAYS: 7,
  CACHE_TTL_TEMPORAL_HOURS: 6,
  CACHE_TTL_SESSION_HOURS: 24,
  DEFAULT_RADIUS_KM: 20,
  MAX_RADIUS_KM: 50,
  MAX_RESULTS: 10,
} as const;
