const DEFAULT_AUTH_REDIRECT = "/profile";

export function sanitizeRedirectPath(rawPath: string | null | undefined): string {
  if (!rawPath) {
    return DEFAULT_AUTH_REDIRECT;
  }

  const candidate = rawPath.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return candidate;
}

export function buildAuthUrl(mode: "login" | "signup" | "forgot", redirectPath?: string): string {
  const safeRedirect = sanitizeRedirectPath(redirectPath);
  return `/auth?mode=${mode}&redirect=${encodeURIComponent(safeRedirect)}`;
}

export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
