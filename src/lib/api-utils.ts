import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export class AppError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
    this.name = "AppError";
  }
}

export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export function sanitize(input: string, maxLength = 100): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, maxLength);
}

/**
 * Sanitize free-text that will be embedded into an LLM prompt. In addition to
 * the regular sanitize() pass, this collapses runs of newlines/whitespace into
 * single spaces so an attacker cannot use blank lines to forge new "instruction"
 * blocks (prompt injection). Use only for short fields (topic/location), never
 * for multi-line content the user legitimately needs to keep formatted.
 */
export function sanitizePromptInput(input: string, maxLength = 100): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// Re-export lightweight, dependency-free validators from og-utils so node API
// routes and edge OG routes share a single source of truth.
export { isUuid, isValidHandle } from "./og-utils";
