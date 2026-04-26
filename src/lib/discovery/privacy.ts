/**
 * Privacy-First Location Proxy (Geo-Fence Middleware)
 * 
 * Converts raw coordinates into "Neighborhood Context" for AI.
 * Protects user privacy while preserving location-aware quest generation.
 */

import type { 
  GeoCoordinates, 
  LocationContext, 
  PrivacyLevel,
  UserLocationPreferences,
} from './types';

// ============================================
// NEIGHBORHOOD CONTEXT DATABASE (US Cities)
// ============================================

interface NeighborhoodData {
  name: string;
  vibe: string;
  landmarks: string[];
}

const NEIGHBORHOOD_DB: Record<string, Record<string, NeighborhoodData>> = {
  'portland': {
    'pearl': { 
      name: 'The Pearl District', 
      vibe: 'Upscale, artsy, converted warehouse lofts, boutique shopping',
      landmarks: ['Powell\'s Books', 'Lan Su Garden'],
    },
    'alberta': { 
      name: 'Alberta Arts District', 
      vibe: 'Bohemian, colorful murals, diverse food scene, community-focused',
      landmarks: ['Last Thursday art walk'],
    },
    'hawthorne': { 
      name: 'Hawthorne District', 
      vibe: 'Hipster haven, vintage shops, craft coffee, eclectic dining',
      landmarks: ['Bagdad Theater'],
    },
    'mississippi': { 
      name: 'Mississippi Avenue', 
      vibe: 'Trendy, indie boutiques, food carts, live music venues',
      landmarks: ['ReBuilding Center'],
    },
    'downtown': { 
      name: 'Downtown Portland', 
      vibe: 'Urban core, business district, cultural institutions',
      landmarks: ['Pioneer Courthouse Square', 'Portland Art Museum'],
    },
    'division': { 
      name: 'Division/Clinton', 
      vibe: 'Foodie paradise, upscale casual dining, craft cocktails',
      landmarks: ['Clinton Street Theater'],
    },
    'sellwood': { 
      name: 'Sellwood-Moreland', 
      vibe: 'Family-friendly, antique shops, quiet residential, river access',
      landmarks: ['Oaks Bottom Wildlife Refuge'],
    },
  },
  // Add more cities as needed
  'seattle': {
    'capitol_hill': { 
      name: 'Capitol Hill', 
      vibe: 'LGBTQ+ hub, nightlife, music venues, progressive',
      landmarks: ['Volunteer Park'],
    },
    'ballard': { 
      name: 'Ballard', 
      vibe: 'Maritime heritage, breweries, Sunday farmers market',
      landmarks: ['Hiram M. Chittenden Locks'],
    },
  },
  'san_francisco': {
    'mission': { 
      name: 'The Mission', 
      vibe: 'Latino culture, murals, taquerias, tech meets tradition',
      landmarks: ['Mission Dolores', 'Clarion Alley'],
    },
    'haight': { 
      name: 'Haight-Ashbury', 
      vibe: 'Historic hippie culture, vintage clothing, counterculture heritage',
      landmarks: ['Ben & Jerry\'s', 'Amoeba Music'],
    },
  },
};

// ============================================
// REVERSE GEOCODING (Simplified)
// ============================================

interface ReverseGeocodeResult {
  city: string;
  neighborhood?: string;
  region?: string;
  country: string;
}

/**
 * Mock reverse geocoding - in production, use Google Geocoding or similar
 */
export async function reverseGeocode(coords: GeoCoordinates): Promise<ReverseGeocodeResult> {
  // In production, this would call an API
  // For now, return mock data based on rough bounds
  
  // Portland bounds (very rough)
  if (coords.lat >= 45.45 && coords.lat <= 45.65 && 
      coords.lng >= -122.85 && coords.lng <= -122.40) {
    
    // Determine neighborhood based on coordinates
    let neighborhood: string | undefined;
    
    if (coords.lat > 45.52 && coords.lng < -122.67) {
      neighborhood = 'pearl';
    } else if (coords.lat > 45.55) {
      neighborhood = 'alberta';
    } else if (coords.lng > -122.62) {
      neighborhood = 'hawthorne';
    } else {
      neighborhood = 'downtown';
    }
    
    return {
      city: 'Portland',
      neighborhood,
      region: 'Oregon',
      country: 'USA',
    };
  }
  
  // Default fallback
  return {
    city: 'Unknown City',
    country: 'USA',
  };
}

// ============================================
// PRIVACY PROXY - Location Context Builder
// ============================================

interface BuildLocationContextParams {
  coords?: GeoCoordinates;
  city?: string;
  privacyLevel: PrivacyLevel;
  userId: string;
}

/**
 * Builds a privacy-respecting location context for AI consumption
 */
export async function buildLocationContext(
  params: BuildLocationContextParams
): Promise<LocationContext> {
  const { coords, city, privacyLevel, userId } = params;
  
  // If city-only privacy, discard coordinates entirely
  if (privacyLevel === 'city-only') {
    return {
      city: city || 'Your City',
    };
  }
  
  // If we have coordinates and privacy allows
  if (coords && (privacyLevel === 'exact' || privacyLevel === 'approximate')) {
    // Get full location data
    const geocode = await reverseGeocode(coords);
    
    const cityKey = geocode.city?.toLowerCase().replace(/\s+/g, '_');
    const neighborhoods = cityKey ? NEIGHBORHOOD_DB[cityKey] : undefined;
    
    let neighborhoodContext: string | undefined;
    
    if (geocode.neighborhood && neighborhoods) {
      const hoodData = neighborhoods[geocode.neighborhood];
      if (hoodData) {
        neighborhoodContext = `${hoodData.name} - ${hoodData.vibe}`;
      }
    }
    
    // Approximate: include neighborhood context but fuzzy coords
    if (privacyLevel === 'approximate') {
      // Round coordinates to ~1km precision for privacy
      const fuzzedCoords = {
        lat: Math.round(coords.lat * 100) / 100,
        lng: Math.round(coords.lng * 100) / 100,
      };
      
      return {
        city: geocode.city || city || 'Your City',
        neighborhood: neighborhoodContext,
        region: geocode.region,
        country: geocode.country,
        coords: fuzzedCoords, // Fuzzed for privacy
      };
    }
    
    // Exact: full precision (user explicitly opted in)
    return {
      city: geocode.city || city || 'Your City',
      neighborhood: neighborhoodContext,
      region: geocode.region,
      country: geocode.country,
      coords, // Exact coordinates
    };
  }
  
  // Fallback to city-only
  return {
    city: city || 'Your City',
  };
}

// ============================================
// NEIGHBORHOOD CONTEXT GETTER (for AI)
// ============================================

export function getNeighborhoodContext(city: string, neighborhoodKey?: string): string {
  const cityKey = city.toLowerCase().replace(/\s+/g, '_');
  const cityData = NEIGHBORHOOD_DB[cityKey];
  
  if (!cityData) {
    return `${city} - a city full of hidden adventures`;
  }
  
  if (neighborhoodKey && cityData[neighborhoodKey]) {
    const hood = cityData[neighborhoodKey];
    return `${hood.name}: ${hood.vibe}. Notable: ${hood.landmarks.join(', ')}.`;
  }
  
  // Return general city context
  const neighborhoods = Object.values(cityData);
  const allVibes = neighborhoods.map(n => n.name).join(', ');
  return `${city} includes neighborhoods like ${allVibes}. Each has its own unique character.`;
}

// ============================================
// COORDINATE VALIDATION
// ============================================

export function isValidCoordinates(coords: unknown): coords is GeoCoordinates {
  if (!coords || typeof coords !== 'object') return false;
  
  const c = coords as Record<string, unknown>;
  return (
    typeof c.lat === 'number' &&
    typeof c.lng === 'number' &&
    c.lat >= -90 && c.lat <= 90 &&
    c.lng >= -180 && c.lng <= 180
  );
}

export function sanitizeCoordinates(coords: GeoCoordinates): GeoCoordinates {
  return {
    lat: Math.max(-90, Math.min(90, coords.lat)),
    lng: Math.max(-180, Math.min(180, coords.lng)),
  };
}

// ============================================
// PRIVACY LEVEL VALIDATION
// ============================================

export function isValidPrivacyLevel(level: unknown): level is PrivacyLevel {
  return level === 'exact' || level === 'approximate' || level === 'city-only';
}

export function getDefaultPrivacyLevel(): PrivacyLevel {
  return 'approximate';
}

// ============================================
// USER PREFERENCES HELPERS
// ============================================

export function getDefaultDiscoveryPreferences(): UserLocationPreferences {
  return {
    discovery_radius_km: 20,
    privacy_level: 'approximate',
    preferred_categories: ['Outdoors', 'Food', 'Culture', 'Fitness'],
    avoid_chains: false,
    prefer_high_rated: true,
    max_discovery_cost_daily: 5,
  };
}

export function mergeWithDefaults(
  prefs: Partial<UserLocationPreferences>
): UserLocationPreferences {
  const defaults = getDefaultDiscoveryPreferences();
  return {
    ...defaults,
    ...prefs,
    // Ensure arrays are properly merged, not overwritten
    preferred_categories: prefs.preferred_categories || defaults.preferred_categories,
  };
}
