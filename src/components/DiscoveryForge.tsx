/**
 * Discovery Forge Component
 * 
 * The main interface for the Tarvn Local Discovery Engine.
 * Features the 3-stage "Forging" UX:
 * 1. Scouting the local terrain... (Fetching Places)
 * 2. Consulting the Grand Map... (LLM Processing)
 * 3. Quest Manifested! (Display)
 */

'use client';

import { useState, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import type { 
  DiscoveryRequest, 
  DiscoveryResponse, 
  NarrativeQuest,
  DiscoveryIntent,
  DiscoveryState,
} from '@/lib/discovery/types';

interface DiscoveryForgeProps {
  userLocation?: { city?: string; coords?: { lat: number; lng: number } };
  onQuestAccepted?: (quest: NarrativeQuest) => void;
  onQuestDismissed?: () => void;
}

const INTENT_OPTIONS: { value: DiscoveryIntent; label: string; icon: string; description: string }[] = [
  { value: 'sweat', label: 'I want to sweat', icon: '💪', description: 'Fitness, trails, gyms' },
  { value: 'relax', label: 'I need to relax', icon: '🧘', description: 'Parks, spas, quiet' },
  { value: 'learn', label: 'I want to learn', icon: '📚', description: 'Museums, classes' },
  { value: 'create', label: 'I want to create', icon: '🎨', description: 'Art, workshops' },
  { value: 'socialize', label: 'I want to socialize', icon: '🍻', description: 'Cafes, bars, events' },
  { value: 'explore', label: 'I want to explore', icon: '🗺️', description: 'Landmarks, nature' },
  { value: 'eat', label: 'I\'m hungry', icon: '🍽️', description: 'Restaurants, food' },
  { value: 'any', label: 'Surprise me', icon: '✨', description: 'Anything interesting' },
];

const LOADING_STAGES = [
  { message: 'Scouting the local terrain...', progress: 25 },
  { message: 'Consulting the Grand Map...', progress: 60 },
  { message: 'The Chronicler weaves your tale...', progress: 85 },
  { message: 'Quest Manifested!', progress: 100 },
];

export default function DiscoveryForge({ 
  userLocation, 
  onQuestAccepted, 
  onQuestDismissed 
}: DiscoveryForgeProps) {
  const [selectedIntent, setSelectedIntent] = useState<DiscoveryIntent | null>(null);
  const [theme, setTheme] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [discoveredQuest, setDiscoveredQuest] = useState<NarrativeQuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingDaily, setRemainingDaily] = useState<number>(5);

  // Animated progress bar
  const progressSpring = useSpring({
    width: `${LOADING_STAGES[loadingStage]?.progress || 0}%`,
    config: { tension: 120, friction: 14 },
  });

  // Fade animation for quest reveal
  const questSpring = useSpring({
    opacity: discoveredQuest ? 1 : 0,
    transform: discoveredQuest ? 'translateY(0px)' : 'translateY(20px)',
    config: { tension: 200, friction: 20 },
  });

  const handleDiscover = useCallback(async () => {
    if (!selectedIntent) return;
    
    setIsLoading(true);
    setError(null);
    setDiscoveredQuest(null);
    
    // Animate through loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage(prev => {
        if (prev >= LOADING_STAGES.length - 1) {
          clearInterval(stageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    
    try {
      const request: DiscoveryRequest = {
        intent: selectedIntent,
        theme: theme || undefined,
        exclude_recent: true,
      };
      
      // Get auth token from local storage or context
      const token = localStorage.getItem('supabase.auth.token');
      
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      });
      
      const data: DiscoveryResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Discovery failed');
      }
      
      setDiscoveredQuest(data.quest);
      setRemainingDaily(data.remaining_daily);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearInterval(stageInterval);
      setIsLoading(false);
      setLoadingStage(0);
    }
  }, [selectedIntent, theme]);

  const handleAccept = () => {
    if (discoveredQuest && onQuestAccepted) {
      onQuestAccepted(discoveredQuest);
    }
    setDiscoveredQuest(null);
  };

  const handleDismiss = () => {
    setDiscoveredQuest(null);
    if (onQuestDismissed) {
      onQuestDismissed();
    }
  };

  const handleReset = () => {
    setDiscoveredQuest(null);
    setSelectedIntent(null);
    setTheme('');
    setError(null);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-slate-900 rounded-xl border-2 border-amber-600/50">
        <div className="relative w-32 h-32 mb-6">
          {/* Animated rune circle */}
          <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 border-4 border-amber-500/50 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          <div className="absolute inset-4 border-4 border-amber-500/70 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🔮</span>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-amber-400 mb-2 font-pixel">
          {LOADING_STAGES[loadingStage]?.message}
        </h3>
        
        <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden mt-4">
          <animated.div 
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
            style={progressSpring}
          />
        </div>
        
        <p className="text-slate-400 text-sm mt-4">
          The Grand Chronicler is consulting ancient texts...
        </p>
      </div>
    );
  }

  // Quest Revealed State
  if (discoveredQuest) {
    return (
      <animated.div 
        className="max-w-lg mx-auto bg-slate-900 rounded-xl border-2 border-amber-500/50 overflow-hidden shadow-2xl"
        style={questSpring}
      >
        {/* Header with theme color */}
        <div 
          className="p-6 text-center"
          style={{ backgroundColor: `${discoveredQuest.ui.theme_color}20` }}
        >
          <div className="text-6xl mb-3">{discoveredQuest.ui.icon_emoji}</div>
          <span className="text-xs uppercase tracking-widest text-slate-400">New Discovery</span>
          <h2 className="text-2xl font-bold text-amber-400 font-pixel mt-1">
            {discoveredQuest.title}
          </h2>
          <div className="flex justify-center gap-2 mt-2">
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
              {discoveredQuest.category}
            </span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
              {discoveredQuest.duration_label}
            </span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-amber-400">
              {discoveredQuest.xp_reward} XP
            </span>
          </div>
        </div>
        
        {/* Narrative Section */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-amber-500">
            <p className="text-amber-200 italic font-medium">
              &ldquo;{discoveredQuest.narrative.hook}&rdquo;
            </p>
          </div>
          
          <p className="text-slate-300 leading-relaxed">
            {discoveredQuest.description}
          </p>
          
          {/* TARE Framework */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-xs text-amber-500 uppercase tracking-wide mb-1">Task</div>
              <div className="text-sm text-slate-200">{discoveredQuest.narrative.task}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-xs text-amber-500 uppercase tracking-wide mb-1">Artifact</div>
              <div className="text-sm text-slate-200">{discoveredQuest.narrative.artifact}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-xs text-amber-500 uppercase tracking-wide mb-1">Requirement</div>
              <div className="text-sm text-slate-200">{discoveredQuest.narrative.requirement}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-xs text-amber-500 uppercase tracking-wide mb-1">Environment</div>
              <div className="text-sm text-slate-200">{discoveredQuest.narrative.environment}</div>
            </div>
          </div>
          
          {/* Location Info */}
          <div className="bg-slate-800/30 p-3 rounded flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <div className="font-medium text-slate-200">{discoveredQuest.discovery.place_name}</div>
              <div className="text-sm text-slate-400">{discoveredQuest.discovery.place_address}</div>
              {discoveredQuest.discovery.neighborhood_context && (
                <div className="text-xs text-amber-500/70 mt-1">
                  {discoveredQuest.discovery.neighborhood_context}
                </div>
              )}
            </div>
          </div>
          
          {/* Reasoning (for transparency) */}
          <div className="text-xs text-slate-500 italic">
            <span className="text-amber-600">Why this quest?</span> {discoveredQuest.discovery.discovery_reasoning}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 bg-slate-800/50 flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 font-bold rounded-lg hover:from-amber-500 hover:to-amber-400 transition-all transform hover:scale-105"
          >
            Accept Quest (+{discoveredQuest.xp_reward} XP)
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
        
        {/* Remaining counter */}
        <div className="px-6 pb-4 text-center">
          <span className="text-xs text-slate-500">
            {remainingDaily} discoveries remaining today
          </span>
        </div>
      </animated.div>
    );
  }

  // Selection State (default)
  return (
    <div className="max-w-2xl mx-auto bg-slate-900 rounded-xl border-2 border-slate-700 p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-amber-400 font-pixel mb-2">
          The Grand Chronicler
        </h2>
        <p className="text-slate-400">
          Seek local adventures crafted from real places in your realm.
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}
      
      {/* Intent Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          What do you seek today?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {INTENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedIntent(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedIntent === option.value
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-medium text-slate-200 text-sm">{option.label}</div>
              <div className="text-xs text-slate-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Optional Theme */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Optional Theme (e.g., &ldquo;romantic&rdquo;, &ldquo;adventurous&rdquo;, &ldquo;cozy&rdquo;)
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Leave blank for any..."
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
        />
      </div>
      
      {/* Daily Limit Warning */}
      {remainingDaily <= 2 && (
        <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg text-amber-400 text-sm">
          ⚠️ You have {remainingDaily} discoveries remaining today.
        </div>
      )}
      
      {/* Action Button */}
      <button
        onClick={handleDiscover}
        disabled={!selectedIntent}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
          selectedIntent
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 hover:from-amber-500 hover:to-amber-400 transform hover:scale-[1.02]'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        {selectedIntent ? 'Forge New Quest' : 'Select an Intent First'}
      </button>
      
      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
        <p>Powered by the Grand Chronicler AI + Real Local Data</p>
        <p>5 discoveries per day • Privacy-protected location handling</p>
      </div>
    </div>
  );
}
