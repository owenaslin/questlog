/**
 * Mock Discovery Provider
 * 
 * Simulates real API responses for development and testing.
 * No API keys required, no rate limits, predictable data.
 */

import type { 
  DiscoveryProvider,
  ProviderSearchParams,
  ProviderResult,
  ProviderPlace,
  ProviderSource,
} from '../types';

// Mock data for various cities
const MOCK_PLACES: Record<string, ProviderPlace[]> = {
  'portland': [
    {
      id: 'mock_powells_001',
      source: 'mock' as ProviderSource,
      name: "Powell's City of Books",
      description: 'The largest independent new and used bookstore in the world.',
      address: '1005 W Burnside St, Portland, OR 97209',
      coordinates: { lat: 45.5235, lng: -122.6819 },
      rating: 4.8,
      review_count: 8472,
      photos: [],
      website: 'https://www.powells.com',
      phone: '+1 (503) 228-4651',
      hours: ['9:00 AM - 9:00 PM'],
      price_level: 2,
      categories: ['bookstore', 'landmark'],
      tags: ['cozy', 'historic', 'literary', 'indoor'],
      is_open_now: true,
      distance_km: 0.5,
    },
    {
      id: 'mock_voodoo_002',
      source: 'mock' as ProviderSource,
      name: 'Voodoo Doughnut',
      description: 'Iconic Portland doughnut shop known for creative and eccentric doughnuts.',
      address: '22 SW 3rd Ave, Portland, OR 97204',
      coordinates: { lat: 52.3, lng: -122.6727 },
      rating: 4.2,
      review_count: 5213,
      photos: [],
      website: 'https://www.voodoodoughnut.com',
      phone: '+1 (503) 241-4704',
      hours: ['24 hours'],
      price_level: 1,
      categories: ['bakery', 'dessert'],
      tags: ['quirky', 'iconic', 'sweet', 'late-night'],
      is_open_now: true,
      distance_km: 1.2,
    },
    {
      id: 'mock_forest_003',
      source: 'mock' as ProviderSource,
      name: 'Forest Park',
      description: 'A massive urban forest with over 80 miles of trails.',
      address: 'Portland, OR 97231',
      coordinates: { lat: 45.5806, lng: -122.7731 },
      rating: 4.9,
      review_count: 2156,
      photos: [],
      website: 'https://www.forestparkconservancy.org',
      phone: undefined,
      hours: ['Dawn to Dusk'],
      price_level: 1,
      categories: ['park', 'hiking', 'nature'],
      tags: ['forest', 'trails', 'peaceful', 'outdoor', 'scenic'],
      is_open_now: true,
      distance_km: 8.5,
    },
    {
      id: 'mock_lan_su_004',
      source: 'mock' as ProviderSource,
      name: 'Lan Su Chinese Garden',
      description: 'A beautiful Ming Dynasty-style garden in the heart of Portland.',
      address: '239 NW Everett St, Portland, OR 97209',
      coordinates: { lat: 45.5253, lng: -122.6743 },
      rating: 4.7,
      review_count: 1892,
      photos: [],
      website: 'https://lansugarden.org',
      phone: '+1 (503) 228-8131',
      hours: ['10:00 AM - 6:00 PM'],
      price_level: 2,
      categories: ['garden', 'museum', 'culture'],
      tags: ['serene', 'cultural', 'authentic', 'zen', 'photo-worthy'],
      is_open_now: true,
      distance_km: 0.8,
    },
    {
      id: 'mock_stumptown_005',
      source: 'mock' as ProviderSource,
      name: 'Stumptown Coffee Roasters',
      description: 'Portland coffee roaster known for pioneering the third-wave coffee movement.',
      address: '128 SW 3rd Ave, Portland, OR 97204',
      coordinates: { lat: 45.5215, lng: -122.6745 },
      rating: 4.6,
      review_count: 3421,
      photos: [],
      website: 'https://www.stumptowncoffee.com',
      phone: '+1 (503) 295-6166',
      hours: ['6:00 AM - 6:00 PM'],
      price_level: 2,
      categories: ['cafe', 'coffee'],
      tags: ['artisan', 'hipster', 'craft', 'cozy', 'wifi-friendly'],
      is_open_now: true,
      distance_km: 0.3,
    },
    {
      id: 'mock_montage_006',
      source: 'mock' as ProviderSource,
      name: 'Le Pigeon',
      description: 'Intimate French-inspired restaurant with communal seating.',
      address: '738 E Burnside St, Portland, OR 97214',
      coordinates: { lat: 45.5227, lng: -122.6575 },
      rating: 4.7,
      review_count: 1243,
      photos: [],
      website: 'https://www.lepigeon.com',
      phone: '+1 (503) 546-8796',
      hours: ['5:00 PM - 10:00 PM'],
      price_level: 3,
      categories: ['restaurant', 'fine_dining'],
      tags: ['romantic', 'french', 'date-night', 'communal', 'intimate'],
      is_open_now: false,
      distance_km: 2.1,
    },
    {
      id: 'mock_ground_kontrol_007',
      source: 'mock' as ProviderSource,
      name: 'Ground Kontrol',
      description: 'Retro arcade bar with classic games and pinball machines.',
      address: '511 NW Couch St, Portland, OR 97209',
      coordinates: { lat: 45.5242, lng: -122.6769 },
      rating: 4.5,
      review_count: 2156,
      photos: [],
      website: 'https://www.groundkontrol.com',
      phone: '+1 (503) 796-9364',
      hours: ['12:00 PM - 2:30 AM'],
      price_level: 2,
      categories: ['bar', 'entertainment'],
      tags: ['retro', 'gaming', 'arcade', 'pinball', 'bar', 'social'],
      is_open_now: true,
      distance_km: 0.6,
    },
  ],
  // Default/generic places for unknown cities
  'default': [
    {
      id: 'mock_local_cafe',
      source: 'mock' as ProviderSource,
      name: 'The Corner Cafe',
      description: 'A cozy neighborhood cafe with excellent coffee and pastries.',
      address: '123 Main St',
      coordinates: { lat: 45.5152, lng: -122.6784 },
      rating: 4.4,
      review_count: 156,
      categories: ['cafe', 'breakfast'],
      tags: ['cozy', 'local', 'wifi', 'quiet'],
      is_open_now: true,
      distance_km: 0.3,
    },
    {
      id: 'mock_local_park',
      source: 'mock' as ProviderSource,
      name: 'City Central Park',
      description: 'Green space perfect for walks, picnics, and outdoor activities.',
      address: '456 Park Ave',
      coordinates: { lat: 45.5284, lng: -122.6893 },
      rating: 4.3,
      review_count: 423,
      categories: ['park', 'outdoor'],
      tags: ['green', 'walking', 'family', 'relaxing'],
      is_open_now: true,
      distance_km: 1.2,
    },
    {
      id: 'mock_local_bookstore',
      source: 'mock' as ProviderSource,
      name: 'Readers & Writers Bookshop',
      description: 'Independent bookstore with a curated selection and reading nooks.',
      address: '789 Literary Lane',
      coordinates: { lat: 45.5123, lng: -122.6721 },
      rating: 4.6,
      review_count: 89,
      categories: ['bookstore', 'shopping'],
      tags: ['cozy', 'literary', 'quiet', 'community'],
      is_open_now: true,
      distance_km: 0.8,
    },
    {
      id: 'mock_local_gym',
      source: 'mock' as ProviderSource,
      name: 'Peak Fitness Center',
      description: 'Modern gym with state-of-the-art equipment and classes.',
      address: '321 Fitness Blvd',
      coordinates: { lat: 45.5345, lng: -122.6987 },
      rating: 4.2,
      review_count: 312,
      categories: ['gym', 'fitness'],
      tags: ['modern', 'classes', 'equipment', '24-hour'],
      is_open_now: true,
      distance_km: 1.5,
    },
    {
      id: 'mock_local_trail',
      source: 'mock' as ProviderSource,
      name: 'Riverside Trail',
      description: 'Scenic trail along the river, perfect for walking or cycling.',
      address: 'Trail Access Point',
      coordinates: { lat: 45.5412, lng: -122.7056 },
      rating: 4.7,
      review_count: 267,
      categories: ['trail', 'hiking', 'cycling'],
      tags: ['scenic', 'river', 'active', 'nature'],
      is_open_now: true,
      distance_km: 3.2,
    },
    {
      id: 'mock_local_museum',
      source: 'mock' as ProviderSource,
      name: 'City History Museum',
      description: 'Local history and cultural exhibits in a beautiful historic building.',
      address: '555 Heritage Dr',
      coordinates: { lat: 45.5098, lng: -122.6645 },
      rating: 4.5,
      review_count: 178,
      categories: ['museum', 'culture'],
      tags: ['educational', 'historic', 'family', 'indoor'],
      is_open_now: true,
      distance_km: 1.8,
    },
  ],
};

// Intent-based place filtering
const INTENT_TAGS: Record<string, string[]> = {
  'sweat': ['active', 'gym', 'fitness', 'workout', '24-hour', 'equipment', 'classes', 'trails', 'hiking'],
  'relax': ['peaceful', 'cozy', 'quiet', 'serene', 'zen', 'family', 'relaxing', 'green'],
  'learn': ['educational', 'historic', 'museum', 'library', 'literary', 'cultural'],
  'create': ['art', 'studio', 'craft', 'community', 'inspiring'],
  'socialize': ['social', 'bar', 'gaming', 'date-night', 'communal', 'arcade', 'late-night', 'wifi', 'wifi-friendly'],
  'explore': ['trails', 'hiking', 'scenic', 'nature', 'outdoor', 'forest', 'photo-worthy'],
  'eat': ['restaurant', 'french', 'romantic', 'bakery', 'sweet', 'iconic', 'quirky', 'artisan', 'breakfast', 'fine_dining'],
  'any': [],
};

export const mockDiscoveryProvider: DiscoveryProvider = {
  name: 'mock' as ProviderSource,
  
  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    const startTime = Date.now();
    
    // Simulate network latency (50-300ms)
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 250));
    
    const city = params.location.city.toLowerCase().replace(/\s+/g, '_');
    const places = MOCK_PLACES[city] || MOCK_PLACES['default'];
    
    // Filter by intent
    const intentTags = INTENT_TAGS[params.intent] || [];
    let filtered = places;
    
    if (intentTags.length > 0) {
      filtered = places.filter(place => 
        place.tags.some(tag => intentTags.includes(tag)) ||
        place.categories.some(cat => intentTags.includes(cat))
      );
    }
    
    // Filter out excluded places
    if (params.exclude_place_ids && params.exclude_place_ids.length > 0) {
      filtered = filtered.filter(p => !params.exclude_place_ids?.includes(p.id));
    }
    
    // Limit results
    const limited = filtered.slice(0, params.max_results);
    
    // Simulate distance calculation based on radius
    const placesWithDistance = limited.map(p => ({
      ...p,
      distance_km: p.distance_km || Math.random() * params.radius_km,
    }));
    
    return {
      places: placesWithDistance,
      source: 'mock' as ProviderSource,
      latency_ms: Date.now() - startTime,
      cached: false,
    };
  },
};

// Additional mock providers for different data types
export const mockEventProvider: DiscoveryProvider = {
  name: 'mock' as ProviderSource,
  
  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 100));
    
    // Return "event" places
    const events: ProviderPlace[] = [
      {
        id: 'mock_event_001',
        source: 'mock' as ProviderSource,
        name: 'Local Art Walk',
        description: 'Monthly art walk featuring local galleries and artists.',
        address: 'Downtown Arts District',
        coordinates: { lat: 45.52, lng: -122.68 },
        rating: 4.5,
        categories: ['event', 'art', 'social'],
        tags: ['art', 'social', 'free', 'evening'],
        is_open_now: false,
        distance_km: 1.0,
      },
    ];
    
    return {
      places: events,
      source: 'mock' as ProviderSource,
      latency_ms: Date.now() - startTime,
      cached: false,
    };
  },
};
