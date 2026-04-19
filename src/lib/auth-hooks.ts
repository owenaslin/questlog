"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { AUTH_CHECK_TIMEOUT_MS } from "@/lib/constants";

interface UseRequireAuthResult {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  authError: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

/**
 * Hook to require authentication on a page
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo?: string): UseRequireAuthResult {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<Omit<UseRequireAuthResult, "isAuthenticated"> & { isAuthenticated: boolean }>({
    isAuthenticated: false,
    isCheckingAuth: true,
    authError: null,
    userId: null,
    userEmail: null,
    userName: null,
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    const timeout = window.setTimeout(() => {
      if (isMounted) {
        setState((prev) => ({
          ...prev,
          authError: "Session check timed out. Please try again.",
          isCheckingAuth: false,
        }));
      }
    }, AUTH_CHECK_TIMEOUT_MS);

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session) {
          const redirectPath = redirectTo || pathname || "/";
          router.replace(buildAuthUrl("login", redirectPath));
          return;
        }

        if (!isMounted) {
          window.clearTimeout(timeout);
          return;
        }

        const userMeta = data.session.user.user_metadata;
        setState({
          isAuthenticated: true,
          isCheckingAuth: false,
          authError: null,
          userId: data.session.user.id,
          userEmail: data.session.user.email || null,
          userName: userMeta?.display_name || userMeta?.name || null,
        });
      } catch (err) {
        if (!isMounted) {
          window.clearTimeout(timeout);
          return;
        }

        setState((prev) => ({
          ...prev,
          authError: err instanceof Error ? err.message : "Could not verify your session.",
          isCheckingAuth: false,
        }));
      } finally {
        window.clearTimeout(timeout);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [pathname, router, redirectTo]);

  return state;
}
