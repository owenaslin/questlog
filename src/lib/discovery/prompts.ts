/**
 * Chain-of-Thought Prompt Engineering for the Grand Chronicler
 * 
 * Uses structured prompting to ensure:
 * 1. Factual integrity (no hallucinated amenities)
 * 2. Narrative consistency (TARE framework)
 * 3. Justified selections (CoT reasoning)
 */

import type { 
  ProviderPlace, 
  NarrativeQuest, 
  LocationContext,
  ChainOfThoughtPrompt,
} from './types';

// ============================================
// SYSTEM PROMPT - Core Persona
// ============================================

export const GRAND_CHRONICLER_SYSTEM_PROMPT = `You are the "Grand Chronicler of Tarvn." You are an ancient, wise entity who transforms mundane local businesses and locations into mythic quest destinations worthy of heroes.

CORE DIRECTIVES:

1. NARRATIVE WRAPPING
Transform boring descriptions into epic fantasy prose. Instead of "Go to the coffee shop," say "Seek the legendary Roaster's Haven, where the beans are blessed by the Bean Spirit and the air hums with creative energy."

2. FACTUAL INTEGRITY (CRITICAL)
You MUST use ONLY the 'highlights' and 'tags' provided in the place data. 
- If the data doesn't mention WiFi, don't promise it.
- If the data says "outdoor seating," you can mention it.
- If no data about fireplaces/parking/amenities, DO NOT invent them.
- Violating this causes user disappointment when they arrive.

3. THE "TARE" RULE (Every quest MUST include all four):
- Task: What they must DO at the location
- Artifact: What they must find, observe, or bring back
- Requirement: Any prerequisites (open hours, equipment needed)
- Environment: Atmospheric description of the setting

4. CONTEXTUAL AWARENESS
- Consider the time of day (don't suggest places that closed hours ago)
- Match the requested theme/mood
- Consider the neighborhood's "vibe"

5. HALLUCINATION PREVENTION
Before finalizing, verify: "Did I invent any amenity not in the source data?" If yes, remove it.

OUTPUT FORMAT: Return valid JSON matching the NarrativeQuest schema exactly.`;

// ============================================
// CHAIN-OF-THOUGHT PROMPT BUILDER
// ============================================

interface BuildPromptParams {
  location: LocationContext;
  places: ProviderPlace[];
  intent: string;
  theme?: string;
  heroLevel?: number;
  excludedPlaceIds?: string[];
}

export function buildChainOfThoughtPrompt(params: BuildPromptParams): ChainOfThoughtPrompt {
  const { location, places, theme, intent, heroLevel = 1 } = params;
  
  const currentHour = new Date().getHours();
  const timeContext = getTimeContext(currentHour);
  
  const candidates = places
    .filter(p => !params.excludedPlaceIds?.includes(p.id))
    .map(p => formatPlaceForPrompt(p))
    .join('\n\n');
  
  return {
    system: GRAND_CHRONICLER_SYSTEM_PROMPT,
    
    context: `QUEST CONTEXT:
- Hero Location: ${location.city}${location.neighborhood ? `, ${location.neighborhood}` : ''}
- Current Time: ${new Date().toLocaleTimeString()} (${timeContext})
- Hero Level: ${heroLevel}
- Quest Intent: "${intent}"${theme ? `
- Requested Theme: "${theme}"` : ''}
- Available Candidates: ${places.length} places`,
    
    candidates: `RANKED CANDIDATES (sorted by relevance):
${candidates}`,
    
    instruction: `INSTRUCTIONS:

Step 1 - SELECTION (Chain of Thought):
Analyze each candidate considering:
- Does it match the intent "${intent}"? (Score 1-10)
- Does it fit the theme "${theme || 'any'}"? (Score 1-10)
- Is it likely open now? (Check hours, current time)
- Which has the best "narrative potential" based on tags?

Step 2 - JUSTIFICATION:
Write 2-3 sentences explaining WHY you chose this place. Reference specific tags/highlights from the data.
Example: "I chose Powell's Books because the tags ['literary', 'cozy', 'historic'] perfectly match a 'learn' intent, and it's open until 9pm."

Step 3 - NARRATIVE CONSTRUCTION:
Using ONLY the factual data provided (tags: [LIST THEM], description: [DATA]), construct a quest following TARE:
- Task: What must the hero do?
- Artifact: What must they find/observe?
- Requirement: When is it open? Anything needed?
- Environment: Atmospheric description using only confirmed details

Step 4 - VERIFICATION:
Check: "Did I add any amenity not in the source data?" List what you invented and remove it.

FINAL OUTPUT: Return JSON matching this schema exactly:

{
  "title": "Epic quest title (max 60 chars)",
  "description": "RPG-style quest description using TARE framework (2-3 sentences)",
  "difficulty": 1-5 based on complexity,
  "duration_label": "e.g., '30-60 minutes', '2-3 hours'",
  "category": "One of: Fitness, Education, Creative, Tech, Food, Outdoors, Social, Wellness, Community, Career, Business, Culture, Productivity",
  "xp_reward": calculated from difficulty,
  "narrative": {
    "task": "Specific action to take",
    "artifact": "What to find/bring back",
    "requirement": "Prerequisites/open hours",
    "environment": "Atmospheric description",
    "hook": "Opening line to grab attention",
    "reward_flavor": "How the XP is described"
  },
  "discovery": {
    "place_id": "ID from candidate data",
    "place_name": "Actual business name",
    "place_address": "Full address",
    "place_coords": {"lat": number, "lng": number},
    "provider_source": "e.g., 'google_places'",
    "neighborhood_context": "Vibe of the area",
    "discovery_reasoning": "Your 2-3 sentence justification from Step 2"
  },
  "ui": {
    "icon_emoji": "Single emoji representing the quest",
    "theme_color": "Hex color matching the vibe"
  }
}`,
    
    schema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["title", "description", "difficulty", "duration_label", "category", "xp_reward", "narrative", "discovery", "ui"],
  "properties": {
    "title": {"type": "string", "maxLength": 60},
    "description": {"type": "string", "maxLength": 500},
    "difficulty": {"type": "integer", "minimum": 1, "maximum": 5},
    "duration_label": {"type": "string"},
    "category": {"type": "string", "enum": ["Fitness", "Education", "Creative", "Tech", "Food", "Outdoors", "Social", "Wellness", "Community", "Career", "Business", "Culture", "Productivity"]},
    "xp_reward": {"type": "integer"},
    "narrative": {
      "type": "object",
      "required": ["task", "artifact", "requirement", "environment", "hook", "reward_flavor"],
      "properties": {
        "task": {"type": "string"},
        "artifact": {"type": "string"},
        "requirement": {"type": "string"},
        "environment": {"type": "string"},
        "hook": {"type": "string"},
        "reward_flavor": {"type": "string"}
      }
    },
    "discovery": {
      "type": "object",
      "required": ["place_id", "place_name", "place_address", "place_coords", "provider_source", "neighborhood_context", "discovery_reasoning"],
      "properties": {
        "place_id": {"type": "string"},
        "place_name": {"type": "string"},
        "place_address": {"type": "string"},
        "place_coords": {"type": "object", "properties": {"lat": {"type": "number"}, "lng": {"type": "number"}}},
        "provider_source": {"type": "string"},
        "neighborhood_context": {"type": "string"},
        "discovery_reasoning": {"type": "string"}
      }
    },
    "ui": {
      "type": "object",
      "required": ["icon_emoji", "theme_color"],
      "properties": {
        "icon_emoji": {"type": "string"},
        "theme_color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"}
      }
    }
  }
}`,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPlaceForPrompt(place: ProviderPlace): string {
  const openStatus = place.is_open_now !== undefined 
    ? (place.is_open_now ? ' [OPEN NOW]' : ' [CLOSED]')
    : '';
  
  const rating = place.rating ? `⭐ ${place.rating}` : '';
  const reviews = place.review_count ? `(${place.review_count} reviews)` : '';
  const distance = place.distance_km ? `${place.distance_km.toFixed(1)}km away` : '';
  
  return `- **${place.name}**${openStatus}
  ID: ${place.id}
  Source: ${place.source}
  Address: ${place.address}
  Rating: ${rating} ${reviews}
  Distance: ${distance}
  Description: ${place.description || 'N/A'}
  Tags: [${place.tags.join(', ')}]
  Categories: [${place.categories.join(', ')}]
  Hours: ${place.hours?.join(', ') || 'N/A'}
  Price: ${place.price_level ? '$'.repeat(place.price_level) : 'N/A'}`;
}

function getTimeContext(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning - places opening';
  if (hour >= 12 && hour < 14) return 'lunch time - restaurants busy';
  if (hour >= 14 && hour < 17) return 'afternoon - museums/activities open';
  if (hour >= 17 && hour < 21) return 'evening - dinner/entertainment time';
  if (hour >= 21 || hour < 2) return 'night - limited options, check closing times';
  return 'late night/early morning - most places closed';
}

// ============================================
// FALLBACK QUEST TEMPLATES
// ============================================

export interface FallbackTemplate {
  level: 1 | 2 | 3;
  title: string;
  description: string;
  task: string;
  artifact: string;
  category: string;
}

export const FALLBACK_TEMPLATES: FallbackTemplate[] = [
  // Level 1: City-specific (still uses location)
  {
    level: 1,
    title: 'Seeker of Local Secrets',
    description: 'The Grand Chronicler senses your location, but the local establishments are shrouded in mundane auras. A different path emerges.',
    task: 'Explore your immediate neighborhood on foot and document 3 interesting things you notice',
    artifact: '3 photos or written observations of local details',
    category: 'Outdoors',
  },
  // Level 2: Regional
  {
    level: 2,
    title: 'Wanderer of the Region',
    description: 'The local archives hold no suitable destinations. Your quest must expand beyond the immediate vicinity.',
    task: 'Travel to the nearest town or natural landmark and document your journey',
    artifact: 'A reflection on what you discovered in the wider region',
    category: 'Outdoors',
  },
  // Level 3: Global/Universal
  {
    level: 3,
    title: 'The Hermit\'s Quest',
    description: 'No place in the realm calls to you today. The Grand Chronicler suggests an inward journey.',
    task: 'Create a comfortable space at home and engage in deep reflection or creative work',
    artifact: 'A journal entry, artwork, or meditation log',
    category: 'Wellness',
  },
];

export function getFallbackTemplate(level: 1 | 2 | 3): FallbackTemplate {
  return FALLBACK_TEMPLATES.find(t => t.level === level) || FALLBACK_TEMPLATES[2];
}

// ============================================
// PROMPT ASSEMBLY
// ============================================

export function assemblePromptForLLM(prompt: ChainOfThoughtPrompt): string {
  return `${prompt.system}

${prompt.context}

${prompt.candidates}

${prompt.instruction}

Schema:
${prompt.schema}

CRITICAL: Respond with ONLY the JSON object. No markdown, no code fences, no explanations outside the JSON.`;
}
