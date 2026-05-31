import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Page paths that require an authenticated session. Anything not in this
// prefix list is treated as public (landing, /auth, /oauth, /privacy,
// /terms, /reset-password, /offline, /hero/[handle] public sharing, and
// every /api/* route, which enforces auth on its own).
const PROTECTED_PREFIXES = [
  "/board",
  "/journal",
  "/discover",
  "/sagas",
  "/trophies",
  "/habits",
  "/settings",
  "/packs",
  "/guilds",
  "/nearby",
  "/hero/edit",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    redirectUrl.pathname = "/auth";
    redirectUrl.search = `?redirect=${encodeURIComponent(redirectTarget)}`;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
};
