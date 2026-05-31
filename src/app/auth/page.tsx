"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PixelButton from "@/components/ui/PixelButton";
import PasswordStrengthMeter from "@/components/ui/PasswordStrengthMeter";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl, getSiteUrl, sanitizeRedirectPath } from "@/lib/auth-redirect";

type AuthMode = "login" | "signup" | "forgot";

function parseMode(value: string | null): AuthMode {
  if (value === "signup" || value === "forgot") {
    return value;
  }
  return "login";
}

function mapAuthErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Authentication failed.";
  const msg = raw.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Incorrect email or password. Try again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please verify your email before logging in.";
  }
  if (msg.includes("already registered")) {
    return "This email is already registered. Log in instead.";
  }
  if (msg.includes("password") && (msg.includes("character") || msg.includes("at least") || msg.includes("too short"))) {
    return "Password must be at least 8 characters.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network issue detected. Check your connection and try again.";
  }

  return raw;
}

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [safeRedirect, setSafeRedirect] = useState<string>("/profile");
  const [hasParsedParams, setHasParsedParams] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(parseMode(params.get("mode")));
    setSafeRedirect(sanitizeRedirectPath(params.get("redirect")));

    const status = params.get("status");
    if (status === "password-updated") {
      setMessage("Password updated. You can log in now.");
      setMode("login");
    }

    setHasParsedParams(true);
  }, []);

  useEffect(() => {
    if (!hasParsedParams) {
      return;
    }

    const supabase = getSupabaseClient();

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(safeRedirect);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace(safeRedirect);
      }
    });

    return () => subscription.unsubscribe();
  }, [hasParsedParams, router, safeRedirect]);

  const switchMode = (nextMode: AuthMode) => {
    setError(null);
    setMessage(null);
    setMode(nextMode);
    router.replace(buildAuthUrl(nextMode, safeRedirect));
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const supabase = getSupabaseClient();
      const redirectTo = `${getSiteUrl()}${buildAuthUrl("login", safeRedirect)}`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (authError) {
        throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in. Try again.");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const supabase = getSupabaseClient();

      if (mode === "forgot") {
        const resetRedirect = `${getSiteUrl()}/reset-password?redirect=${encodeURIComponent(safeRedirect)}`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resetRedirect,
        });

        if (resetError) {
          throw resetError;
        }

        setMessage("Reset email sent. Check your inbox for the link.");
        setMode("login");
        setPassword("");
        router.replace(buildAuthUrl("login", safeRedirect));
        return;
      }

      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

        if (loginError) {
          throw loginError;
        }

        router.replace(safeRedirect);
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${getSiteUrl()}${buildAuthUrl("login", safeRedirect)}`,
        },
      });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace(safeRedirect);
      } else {
        setMessage("Account created. Verify your email, then log in.");
        setMode("login");
        setPassword("");
        router.replace(buildAuthUrl("login", safeRedirect));
      }
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const primaryLabel =
    mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Email";
  const loadingLabel =
    mode === "login" ? "Logging In..." : mode === "signup" ? "Creating Account..." : "Sending Reset Email...";

  const handlePasswordKeyState = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState("CapsLock"));
  };

  return (
    <div className="max-w-5xl mx-auto mt-4 md:mt-10 px-2">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 md:gap-8">
        <section className="hidden lg:block bg-retro-darkgray border-4 border-retro-black shadow-pixel p-8">
          <h1 className="text-heading text-retro-yellow mb-4">Authenticate Your Adventure</h1>
          <p className="text-body text-retro-lightgray leading-relaxed mb-6">
            Use one secure auth screen across desktop and mobile. Sign in with email or Google, reset your password anytime, and continue where you left off.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-retro-black border-2 border-retro-darkpurple p-3">
              <div className="kicker mb-1">Return URL</div>
              <div className="text-body-sm text-retro-lightgray break-all">{safeRedirect}</div>
            </div>
            <div className="bg-retro-black border-2 border-retro-darkpurple p-3">
              <div className="kicker text-retro-lime mb-1">Cross-device Ready</div>
              <div className="text-body-sm text-retro-lightgray">Optimized controls for touch and desktop keyboards.</div>
            </div>
          </div>
        </section>

        <section className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-4 md:p-6" aria-busy={isLoading}>
          <div className="text-center mb-5">
            <div className="text-3xl md:text-4xl mb-3">🔐</div>
            <h2 className="text-subhead text-retro-yellow mb-2">
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
            </h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              {mode === "login"
                ? "Log in to continue your adventure."
                : mode === "signup"
                ? "Create your account in seconds."
                : "Get a reset link by email."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={isLoading}
              aria-pressed={mode === "login"}
              className={`text-body-sm font-medium py-3 min-h-[44px] border-2 uppercase ${
                mode === "login"
                  ? "bg-retro-blue text-retro-white border-retro-darkblue"
                  : "bg-retro-black text-retro-lightgray border-retro-darkgray"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              disabled={isLoading}
              aria-pressed={mode === "signup"}
              className={`text-body-sm font-medium py-3 min-h-[44px] border-2 uppercase ${
                mode === "signup"
                  ? "bg-retro-green text-retro-white border-retro-darkgreen"
                  : "bg-retro-black text-retro-lightgray border-retro-darkgray"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Sign Up
            </button>
          </div>

          {mode !== "forgot" && (
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full text-body-sm font-medium bg-retro-white text-retro-black px-4 py-3 min-h-[44px] border-b-4 border-r-4 border-retro-lightgray border-t-2 border-l-2 hover:bg-retro-lightgray active:translate-x-[2px] active:translate-y-[2px] active:border-b-2 active:border-r-2 active:border-t-4 active:border-l-4 transition-none disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              G - Continue with Google
            </button>
          )}

          {mode !== "forgot" && (
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-[2px] bg-retro-gray" />
              <span className="kicker">OR</span>
              <div className="flex-1 h-[2px] bg-retro-gray" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label className="text-body-sm text-retro-lightgray block mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your adventurer name"
                  required
                  minLength={2}
                  className="w-full"
                />
              </div>
            )}

            <div>
              <label className="text-body-sm text-retro-lightgray block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adventurer@quest.io"
                required
                autoComplete="email"
                autoCapitalize="none"
                className="w-full"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="text-body-sm text-retro-lightgray block mb-2">Password</label>
                <div className="flex gap-2 items-stretch">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handlePasswordKeyState}
                    onKeyDown={handlePasswordKeyState}
                    placeholder="••••••••"
                    required
                    minLength={mode === "signup" ? 8 : 6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-body-sm px-3 border-2 border-retro-darkgray bg-retro-black text-retro-lightgray hover:text-retro-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {isCapsLockOn && (
                  <p className="mt-2 text-body-sm text-retro-orange">
                    Caps Lock is on.
                  </p>
                )}
                {mode === "signup" && <PasswordStrengthMeter password={password} />}
                {mode === "signup" && (
                  <p className="mt-2 text-body-sm text-retro-gray">
                    Use 8+ characters with letters, numbers, and symbols.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="text-body-sm text-retro-red leading-relaxed bg-retro-black border-2 border-retro-red p-2" role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            {message && (
              <p className="text-body-sm text-retro-lime leading-relaxed bg-retro-black border-2 border-retro-green p-2" role="status" aria-live="polite">
                {message}
              </p>
            )}

            <PixelButton type="submit" size="lg" variant={mode === "signup" ? "success" : "primary"} disabled={isLoading}>
              {isLoading ? loadingLabel : primaryLabel}
            </PixelButton>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-body-sm text-retro-cyan hover:text-retro-lightblue"
              >
                Forgot password?
              </button>
            ) : mode === "forgot" ? (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-body-sm text-retro-cyan hover:text-retro-lightblue"
              >
                ← Back to login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-body-sm text-retro-cyan hover:text-retro-lightblue"
              >
                Already have an account?
              </button>
            )}

            <Link href="/" className="text-body-sm text-retro-gray hover:text-retro-lightgray">
              Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
