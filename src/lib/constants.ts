/**
 * Application constants
 */

// XP and Leveling
export const XP_PER_LEVEL = 500;

// Legacy base values (kept for reference / backward compat display)
// New quests use the time-proportional formula in src/lib/xp.ts
export const BASE_MAIN_QUEST_XP = 200;   // keep, may still be referenced
export const BASE_SIDE_QUEST_XP = 50;    // keep, may still be referenced

// XP formula caps (enforced in xp.ts and in API routes)
export const MAX_SIDE_QUEST_XP = 2500;
export const MAX_MAIN_QUEST_XP = 8000;
export const MAX_HABIT_XP = 300;
export const MIN_HABIT_XP = 5;

// Difficulty levels
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

// UI Timing (ms)
export const MODAL_DELAY_MS = 1000;
export const ANIMATION_DURATION_MS = 300;
export const XP_ANIMATION_DURATION_MS = 2000;
export const CONFETTI_DELAY_MS = 100;
export const CONTENT_STAGGER_DELAY_MS = 400;

// Auth
export const AUTH_CHECK_TIMEOUT_MS = 8000;
export const MIN_PASSWORD_LENGTH = 6;

// Pagination / Limits
export const DEFAULT_QUEST_LIMIT = 10;
export const MAX_RECENT_QUESTS = 10;
export const MAX_ACTIVE_QUESTS = 8;
export const MAX_SUGGESTIONS = 3;

// Validation
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_QUEST_TITLE_LENGTH = 200;
export const MAX_QUEST_DESCRIPTION_LENGTH = 2000;
export const MAX_LOCATION_LENGTH = 100;
