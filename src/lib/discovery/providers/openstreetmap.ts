/**
 * OpenStreetMap Discovery Provider (Mock)
 * 
 * Simulates OSM/Overpass API responses for development.
 * 
 * In production, this would query:
 * - Overpass API (overpass-api.de) for real-time OSM data
 * - Nominatim for geocoding
 * 
 * OSM tags used:
 * - leisure=park, garden, nature_reserve
 * - tourism=attraction, viewpoint
 * - highway=path, trail, footway
 * - sport=running, fitness
 */

import type { 
  DiscoveryProvider,
  ProviderSearchParams,
  ProviderResult,
  ProviderPlace,
  ProviderSource,
} from '../types';

// Mock OSM data for outdoor/trail locations
const MOCK_OSM_PLACES: Record<string, ProviderPlace[]> = {
  'portland': [
    {
      id: 'osm_forest_park_001',
      source: 'openstreetmap' as ProviderSource,
      name: 'Forest Park - Wildwood Trail',
      description: 'A 30-mile trail network through one of the largest urban forests in the US.',
      address: 'Forest Park, Portland, OR',
      coordinates: { lat: 45.5806, lng: -122.7731 },
      rating: 4.9,
      review_count: 1847,
      photos: [],
      website: 'https://www.forestparkconservancy.org',
      phone: undefined,
      hours: ['Dawn to Dusk'],
      price_level: 1,
      categories: ['park', 'trail', 'nature_reserve'],
      tags: ['hiking', 'forest', 'wildlife', 'peaceful', 'scenic', 'trail-running'],
      is_open_now: true,
      distance_km: 5.2,
      metadata: {
        osm_tags: ['leisure=nature_reserve', 'route=hiking'],
        trail_length: '30 miles',
        difficulty: 'moderate',
      },
    },
    {
      id: 'osm_powell_butte_002',
      source: 'openstreetmap' as ProviderSource,
      name: 'Powell Butte Nature Preserve',
      description: 'Extinct cinder cone volcano with panoramic views of Portland and surrounding mountains.',
      address: '14001 SE Powell Blvd, Portland, OR 97236',
      coordinates: { lat: 45.4889, lng: -122.5156 },
      rating: 4.7,
      review_count: 923,
      photos: [],
      website: 'https://www.portland.gov/parks/powell-butte',
      phone: undefined,
      hours: ['5:00 AM - 10:00 PM'],
      price_level: 1,
      categories: ['park', 'viewpoint', 'nature_reserve'],
      tags: ['hiking', 'volcano', 'views', 'cycling', 'birdwatching', 'sunset'],
      is_open_now: true,
      distance_km: 12.4,
      metadata: {
        osm_tags: ['leisure=nature_reserve', 'tourism=viewpoint'],
        elevation_gain: '400 ft',
      },
    },
    {
      id: 'osm_mount_tabor_003',
      source: 'openstreetmap' as ProviderSource,
      name: 'Mount Tabor Park',
      description: 'City park on an extinct volcano featuring reservoirs, trails, and an amphitheater.',
      address: 'SE 60th Ave & Salmon St, Portland, OR 97215',
      coordinates: { lat: 45.5125, lng: -122.5944 },
      rating: 4.8,
      review_count: 1567,
      photos: [],
      website: 'https://www.portland.gov/parks/mount-tabor',
      phone: undefined,
      hours: ['5:00 AM - 12:00 AM'],
      price_level: 1,
      categories: ['park', 'viewpoint'],
      tags: ['volcano', 'reservoir', 'running', 'stairs', 'views', 'historic'],
      is_open_now: true,
      distance_km: 3.8,
      metadata: {
        osm_tags: ['leisure=park', 'volcano=extinct'],
        reservoir: 'open',
      },
    },
    {
      id: 'osm_terwilliger_004',
      source: 'openstreetmap' as ProviderSource,
      name: 'Terwilliger Parkway Trails',
      description: 'Scenic parkway with paved and unpaved trails along the Willamette River bluffs.',
      address: 'Terwilliger Blvd, Portland, OR',
      coordinates: { lat: 45.5023, lng: -122.6834 },
      rating: 4.6,
      review_count: 634,
      photos: [],
      website: undefined,
      phone: undefined,
      hours: ['24 hours'],
      price_level: 1,
      categories: ['park', 'trail'],
      tags: ['cycling', 'running', 'views', 'river', 'paved', 'accessible'],
      is_open_now: true,
      distance_km: 2.1,
      metadata: {
        osm_tags: ['highway=path', 'leisure=park'],
        trail_surface: 'paved',
      },
    },
    {
      id: 'osm_lan_su_005',
      source: 'openstreetmap' as ProviderSource,
      name: 'Lan Su Chinese Garden',
      description: 'Authentic Ming Dynasty-style garden in Chinatown.',
      address: '239 NW Everett St, Portland, OR 97209',
      coordinates: { lat: 45.5253, lng: -122.6743 },
      rating: 4.7,
      review_count: 1892,
      photos: [],
      website: 'https://lansugarden.org',
      phone: '+1 (503) 228-8131',
      hours: ['10:00 AM - 6:00 PM'],
      price_level: 2,
      categories: ['garden', 'tourism'],
      tags: ['zen', 'authentic', 'cultural', 'peaceful', 'photo-worthy'],
      is_open_now: true,
      distance_km: 0.8,
      metadata: {
        osm_tags: ['leisure=garden', 'tourism=attraction'],
        style: 'Ming Dynasty',
      },
    },
    {
      id: 'osm_washington_park_006',
      source: 'openstreetmap' as ProviderSource,
      name: 'Washington Park',
      description: 'Large urban park featuring the Zoo, Japanese Garden, and hiking trails.',
      address: '4033 SW Canyon Rd, Portland, OR 97221',
      coordinates: { lat: 45.5190, lng: -122.7056 },
      rating: 4.8,
      review_count: 2456,
      photos: [],
      website: 'https://www.portland.gov/parks/washington-park',
      phone: undefined,
      hours: ['5:00 AM - 10:00 PM'],
      price_level: 1,
      categories: ['park', 'tourism', 'garden'],
      tags: ['family', 'hiking', 'forest', 'zoo', 'japanese_garden', 'views'],
      is_open_now: true,
      distance_km: 4.5,
      metadata: {
        osm_tags: ['leisure=park', 'tourism=attraction'],
        attractions: ['Zoo', 'Japanese Garden', 'Rose Garden'],
      },
    },
  ],
  // Generic fallback data
  'default': [
    {
      id: 'osm_local_park_001',
      source: 'openstreetmap' as ProviderSource,
      name: 'City Central Park',
      description: 'Large urban green space with walking trails and picnic areas.',
      address: 'Downtown',
      coordinates: { lat: 45.5152, lng: -122.6784 },
      rating: 4.4,
      review_count: 523,
      categories: ['park'],
      tags: ['walking', 'family', 'green', 'picnic'],
      is_open_now: true,
      distance_km: 1.2,
      metadata: {
        osm_tags: ['leisure=park'],
      },
    },
    {
      id: 'osm_riverside_trail_002',
      source: 'openstreetmap' as ProviderSource,
      name: 'Riverside Trail',
      description: 'Paved trail along the river for walking, running, and cycling.',
      address: 'River District',
      coordinates: { lat: 45.5284, lng: -122.6893 },
      rating: 4.6,
      review_count: 412,
      categories: ['trail', 'park'],
      tags: ['cycling', 'running', 'scenic', 'river'],
      is_open_now: true,
      distance_km: 2.3,
      metadata: {
        osm_tags: ['highway=path', 'leisure=park'],
      },
    },
    {
      id: 'osm_nature_reserve_003',
      source: 'openstreetmap' as ProviderSource,
      name: 'Urban Nature Reserve',
      description: 'Protected natural area with hiking trails and wildlife viewing.',
      address: 'North District',
      coordinates: { lat: 45.5412, lng: -122.7056 },
      rating: 4.7,
      review_count: 298,
      categories: ['nature_reserve', 'park'],
      tags: ['hiking', 'wildlife', 'forest', 'peaceful'],
      is_open_now: true,
      distance_km: 5.8,
      metadata: {
        osm_tags: ['leisure=nature_reserve'],
      },
    },
    {
      id: 'osm_viewpoint_004',
      source: 'openstreetmap' as ProviderSource,
      name: 'City Viewpoint',
      description: 'Scenic overlook with panoramic views of the city and surrounding area.',
      address: 'Hilltop District',
      coordinates: { lat: 45.5056, lng: -122.6823 },
      rating: 4.5,
      review_count: 678,
      categories: ['viewpoint', 'tourism'],
      tags: ['views', 'sunset', 'photography', 'scenic'],
      is_open_now: true,
      distance_km: 3.4,
      metadata: {
        osm_tags: ['tourism=viewpoint'],
      },
    },
  ],
};

// OSM-specific tag mappings for filtering
const OSM_INTENT_TAGS: Record<string, string[]> = {
  'sweat': ['fitness_station', 'track', 'running', 'trail-running', 'cycling', 'stairs'],
  'relax': ['park', 'garden', 'peaceful', 'zen', 'nature_reserve'],
  'explore': ['hiking', 'trail', 'viewpoint', 'volcano', 'forest', 'wildlife', 'historic'],
  'any': ['park', 'tourism', 'attraction'],
};

export const openStreetMapProvider: DiscoveryProvider = {
  name: 'openstreetmap' as ProviderSource,
  
  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    const startTime = Date.now();
    
    // Simulate Overpass API latency (100-500ms - OSM is typically fast)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    const city = params.location.city.toLowerCase().replace(/\s+/g, '_');
    const places = MOCK_OSM_PLACES[city] || MOCK_OSM_PLACES['default'];
    
    // Filter by OSM tags matching intent
    const intentTags = OSM_INTENT_TAGS[params.intent] || [];
    let filtered = places;
    
    if (intentTags.length > 0) {
      filtered = places.filter(place => 
        place.tags.some(tag => intentTags.includes(tag)) ||
        place.categories.some(cat => intentTags.includes(cat)) ||
        // Check OSM metadata tags
        Object.values(place.metadata?.osm_tags || []).some((tag: string) =>
          intentTags.some(it => tag.includes(it))
        )
      );
    }
    
    // Filter out excluded places
    if (params.exclude_place_ids && params.exclude_place_ids.length > 0) {
      filtered = filtered.filter(p => !params.exclude_place_ids?.includes(p.id));
    }
    
    // Limit results
    const limited = filtered.slice(0, params.max_results);
    
    // Add realistic distance calculation
    const placesWithDistance = limited.map(p => ({
      ...p,
      distance_km: p.distance_km || Math.round(Math.random() * params.radius_km * 10) / 10,
    }));
    
    return {
      places: placesWithDistance,
      source: 'openstreetmap' as ProviderSource,
      latency_ms: Date.now() - startTime,
      cached: false,
    };
  },
};

/**
 * Build Overpass API query for production use
 * 
 * @example
 * const query = buildOverpassQuery(45.52, -122.68, 5000, ['leisure=park', 'tourism=viewpoint']);
 * const response = await fetch('https://overpass-api.de/api/interpreter', {
 *   method: 'POST',
 *   body: query
 * });
 */
export function buildOverpassQuery(
  lat: number,
  lng: number,
  radiusMeters: number,
  tags: string[]
): string {
  // Convert tags to Overpass filter format
  const tagFilters = tags.map(tag => {
    const [key, value] = tag.split('=');
    return value && value !== '*' 
      ? `["${key}"="${value}"]`
      : `["${key}"]`;
  }).join('');
  
  return `
[out:json][timeout:25];
(
  node${tagFilters}(around:${radiusMeters},${lat},${lng});
  way${tagFilters}(around:${radiusMeters},${lat},${lng});
);
out body;
>;
out skel qt;
  `.trim();
}

/**
 * Fetch places from Overpass API (for production)
 */
export async function fetchFromOverpass(
  lat: number,
  lng: number,
  radiusMeters: number,
  tags: string[]
): Promise<ProviderPlace[]> {
  const query = buildOverpassQuery(lat, lng, radiusMeters, tags);
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Transform OSM elements to ProviderPlace format
  return data.elements
    .filter((el: { tags?: Record<string, string> }) => el.tags?.name)
    .map((el: { id: number; lat?: number; lon?: number; tags: Record<string, string>; center?: { lat: number; lon: number } }) => ({
      id: `osm_${el.id}`,
      source: 'openstreetmap' as ProviderSource,
      name: el.tags.name,
      description: el.tags.description || '',
      address: '', // Would need reverse geocoding
      coordinates: {
        lat: el.lat || el.center?.lat || lat,
        lng: el.lon || el.center?.lon || lng,
      },
      categories: Object.keys(el.tags)
        .filter(k => ['leisure', 'tourism', 'sport', 'amenity'].includes(k))
        .map(k => el.tags[k]),
      tags: Object.entries(el.tags).map(([k, v]) => `${k}=${v}`),
      is_open_now: undefined, // Would need opening_hours parsing
      metadata: { osm_tags: Object.entries(el.tags).map(([k, v]) => `${k}=${v}`) },
    }));
}

/**
 * Notes for Production Implementation:
 * 
 * 1. OVERPASS API QUERY EXAMPLE:
 *    [out:json][timeout:25];
 *    (
 *      node["leisure"="park"](around:${radius},${lat},${lng});
 *      way["leisure"="park"](around:${radius},${lat},${lng});
 *      node["tourism"="viewpoint"](around:${radius},${lat},${lng});
 *      way["highway"="path"]["foot"="yes"](around:${radius},${lat},${lng});
 *    );
 *    out body;
 *    >;
 *    out skel qt;
 * 
 * 2. RATE LIMITS:
 *    - Overpass API: Fair use policy (be nice, cache aggressively)
 *    - Nominatim: 1 request per second max
 * 
 * 3. COST:
 *    - Completely free! No API keys required for basic usage
 *    - Commercial high-volume users should consider hosting own Overpass instance
 * 
 * 4. ADVANTAGES OVER ALLTRAILS:
 *    - No ToS violations
 *    - Global coverage
 *    - Community-maintained (very up-to-date)
 *    - Rich tagging system
 *    - Works offline with planet extracts
 */
