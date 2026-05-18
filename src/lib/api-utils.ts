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
