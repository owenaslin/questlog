"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PixelButton from "@/components/ui/PixelButton";
import PasswordStrengthMeter from "@/components/ui/PasswordStrengthMeter";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl, sanitizeRedirectPath } from "@/lib/auth-redirect";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string>("/profile");

  const handlePasswordKeyState = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState("CapsLock"));
  };

  useEffect(() => {
    const supabase = getSupabaseClient();

    const initializeRecovery = async () => {
      const params = new URLSearchParams(window.location.search);
      setRedirectTarget(sanitizeRedirectPath(params.get("redirect")));
      const hasRecoveryType = params.get("type") === "recovery";
      const { data } = await supabase.auth.getSession();

      if (hasRecoveryType || data.session) {
        setIsRecoveryValid(true);
      }

      setIsChecking(false);
    };

    initializeRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryValid(true);
        setIsChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);

      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        router.replace(`${buildAuthUrl("login", redirectTarget)}&status=password-updated`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isChecking) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 text-center">
          <p className="text-body-sm text-retro-lightgray">Checking reset link...</p>
        </div>
      </div>
    );
  }

  if (!isRecoveryValid) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-subhead text-retro-yellow mb-3">Invalid Reset Link</h1>
          <p className="text-body text-retro-lightgray leading-relaxed mb-4">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/auth?mode=forgot">
            <PixelButton variant="primary">Request New Link</PixelButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-10">
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6" aria-busy={isSaving}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-subhead text-retro-yellow mb-2">Set new password</h1>
          <p className="text-body-sm text-retro-lightgray leading-relaxed">
            Choose a new secure password for your account.
          </p>
          <p className="text-body-sm text-retro-gray mt-2 break-all">
            After login, you will continue to: {redirectTarget}
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <div>
            <label className="text-body-sm text-retro-lightgray block mb-2">New Password</label>
            <div className="flex gap-2 items-stretch">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={handlePasswordKeyState}
                onKeyDown={handlePasswordKeyState}
                minLength={6}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-body-sm px-3 border-2 border-retro-darkgray bg-retro-black text-retro-lightgray hover:text-retro-white"
                aria-label={showPassword ? "Hide new password" : "Show new password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
          </div>

          <div>
            <label className="text-body-sm text-retro-lightgray block mb-2">Confirm Password</label>
            <div className="flex gap-2 items-stretch">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyUp={handlePasswordKeyState}
                onKeyDown={handlePasswordKeyState}
                minLength={6}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-body-sm px-3 border-2 border-retro-darkgray bg-retro-black text-retro-lightgray hover:text-retro-white"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {isCapsLockOn && (
            <p className="text-body-sm text-retro-orange">Caps Lock is on.</p>
          )}

          <p className="text-body-sm text-retro-gray leading-relaxed">
            For best security, use at least 8 characters with mixed case, numbers, and symbols.
          </p>

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

          <PixelButton type="submit" variant="success" size="lg" disabled={isSaving}>
            {isSaving ? "Updating Password..." : "Update Password"}
          </PixelButton>
        </form>
      </div>
    </div>
  );
}
