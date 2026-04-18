/**
 * Zod validation schemas for input sanitization
 */
import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_QUEST_TITLE_LENGTH,
  MAX_QUEST_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
} from "./constants";

// Auth schemas
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email is too long");

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(100, "Password is too long");

export const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(MAX_DISPLAY_NAME_LENGTH, `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`)
  .regex(/^[a-zA-Z0-9_\-\s]+$/, "Display name can only contain letters, numbers, spaces, hyphens, and underscores");

// Quest generation schemas
export const locationSchema = z
  .string()
  .min(1, "Location is required")
  .max(MAX_LOCATION_LENGTH, `Location must be ${MAX_LOCATION_LENGTH} characters or less`)
  .trim();

export const topicSchema = z
  .string()
  .max(100, "Topic is too long")
  .trim()
  .optional();

export const questTypeSchema = z.enum(["main", "side"]);

// Quest schemas
export const questTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(MAX_QUEST_TITLE_LENGTH, `Title must be ${MAX_QUEST_TITLE_LENGTH} characters or less`)
  .trim();

export const questDescriptionSchema = z
  .string()
  .min(1, "Description is required")
  .max(MAX_QUEST_DESCRIPTION_LENGTH, `Description must be ${MAX_QUEST_DESCRIPTION_LENGTH} characters or less`)
  .trim();

export const difficultySchema = z
  .number()
  .int()
  .min(MIN_DIFFICULTY)
  .max(MAX_DIFFICULTY);

// URL / Redirect schemas
export const redirectPathSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_\-\/]*$/, "Invalid redirect path")
  .max(200)
  .optional();

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .slice(0, 1000); // Hard limit
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const result = emailSchema.safeParse(email);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  const result = displayNameSchema.safeParse(name);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateLocation(location: string): { valid: boolean; error?: string } {
  const result = locationSchema.safeParse(location);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}
