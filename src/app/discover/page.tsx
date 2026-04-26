/**
 * Discovery Page
 * 
 * The main interface for the Tarvn Local Discovery Engine.
 * Allows users to discover location-based quests powered by AI.
 */

import { Metadata } from 'next';
import DiscoveryForge from '@/components/DiscoveryForge';
import { getSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Discover Local Quests | QuestLog',
  description: 'Find epic adventures at real places near you. The Grand Chronicler weaves local businesses into mythic quests.',
};

export default async function DiscoverPage() {
  // Check authentication server-side
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth?redirect=/discover');
  }
  
  // Get user location preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('location_city, location_coords, discovery_radius_km, privacy_level')
    .eq('id', user.id)
    .single();
  
  // Parse location coords if available
  let coords = undefined;
  if (profile?.location_coords) {
    const pointMatch = profile.location_coords.match(/\(([^,]+),([^)]+)\)/);
    if (pointMatch) {
      coords = {
        lng: parseFloat(pointMatch[1]),
        lat: parseFloat(pointMatch[2]),
      };
    }
  }
  
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center text-2xl">
              🔮
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-400 font-pixel">
                The Grand Chronicler
              </h1>
              <p className="text-slate-400 text-sm">
                Discover epic quests at real places near you
              </p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Location Status */}
      {profile?.location_city ? (
        <div className="bg-slate-800/50 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>📍</span>
              <span>
                Scouting quests within {profile.discovery_radius_km || 20}km of{' '}
                <span className="text-amber-400">{profile.location_city}</span>
                {profile.privacy_level === 'approximate' && (
                  <span className="text-slate-500 ml-1">(privacy-protected)</span>
                )}
              </span>
              <a 
                href="/settings/location" 
                className="ml-auto text-amber-500 hover:text-amber-400"
              >
                Change
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-900/20 border-b border-amber-700/30">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <span>⚠️</span>
              <span>
                Location not set. Discoveries will use generic templates.{''}
                <a href="/settings/location" className="underline ml-1">
                  Set location
                </a>
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-medium text-slate-200 mb-1">Real Places</h3>
            <p className="text-sm text-slate-500">
              Quests crafted from actual local businesses and landmarks
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl mb-2">🧙</div>
            <h3 className="font-medium text-slate-200 mb-1">AI Narrative</h3>
            <p className="text-sm text-slate-500">
              The Grand Chronicler transforms mundane locations into epic adventures
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-medium text-slate-200 mb-1">Privacy First</h3>
            <p className="text-sm text-slate-500">
              Your exact location is never shared with AI. Only neighborhood context.
            </p>
          </div>
        </div>
        
        {/* Discovery Forge */}
        <DiscoveryForge 
          userLocation={{
            city: profile?.location_city || undefined,
            coords,
          }}
          onQuestAccepted={(quest) => {
            // This will be handled client-side
            console.log('Quest accepted:', quest);
          }}
          onQuestDismissed={() => {
            console.log('Quest dismissed');
          }}
        />
        
        {/* How It Works */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <h2 className="text-xl font-bold text-slate-200 mb-6">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-slate-900 flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-slate-200">Choose Your Intent</h4>
                <p className="text-sm text-slate-500">
                  Tell the Chronicler what you seek - fitness, learning, socializing, or adventure.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-slate-900 flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-slate-200">Scout Local Places</h4>
                <p className="text-sm text-slate-500">
                  We search real APIs (Google Places, AllTrails, etc.) for matching locations near you.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-slate-900 flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-slate-200">AI Narrative Magic</h4>
                <p className="text-sm text-slate-500">
                  The Chronicler uses Chain-of-Thought prompting to select the best place and wrap it in an epic quest narrative.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-slate-900 flex items-center justify-center font-bold shrink-0">
                4
              </div>
              <div>
                <h4 className="font-medium text-slate-200">Accept & Adventure</h4>
                <p className="text-sm text-slate-500">
                  Accept the quest, visit the location, and complete your adventure for XP!
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Privacy Note */}
        <div className="mt-8 bg-slate-900/30 border border-slate-800 rounded-lg p-4">
          <h4 className="font-medium text-slate-300 mb-2 flex items-center gap-2">
            <span>🔒</span> Privacy by Design
          </h4>
          <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
            <li>Your exact coordinates are never sent to AI models</li>
            <li>We convert locations into &ldquo;neighborhood context&rdquo; (e.g., &ldquo;The Pearl District - artsy, upscale&rdquo;)</li>
            <li>All API calls use fuzzy coordinates rounded to ~1km precision</li>
            <li>You control your privacy level: exact, approximate, or city-only</li>
            <li>Data is cached to minimize API calls and reduce costs</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
