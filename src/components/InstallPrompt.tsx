"use client";

import { useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "tavrn_install_prompt_dismissed";
// Show the prompt 45 s after the browser fires beforeinstallprompt.
// This avoids interrupting the first page load impression.
const DELAY_MS = 45_000;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Already running as a standalone installed PWA — don't show.
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Capacitor builds live inside a native WebView — no browser install prompt.
    if (process.env.NEXT_PUBLIC_CAPACITOR_BUILD === "true") return;
    // User already dismissed previously.
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      timerRef.current = setTimeout(() => setVisible(true), DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleLater = () => {
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50"
      role="status"
      aria-live="polite"
      aria-label="Install tavrn"
    >
      <div
        className="border-4 border-tavern-oak-dark"
        style={{
          background: "#1a1208",
          boxShadow: "6px 6px 0 #5c3a1a",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b-4 border-tavern-oak-dark bg-tavern-smoke">
          <span className="font-pixel text-tavern-gold text-[8px] tracking-wider">
            New Quest Unlocked
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="font-pixel text-tavern-smoke-light text-[7px] hover:text-tavern-parchment px-1 leading-none"
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex items-start gap-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl border-2 border-tavern-oak-dark"
            style={{ background: "#0f0d07" }}
            aria-hidden="true"
          >
            🍺
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-pixel text-[9px] text-tavern-gold leading-relaxed mb-1">
              Install tavrn
            </p>
            <p className="font-pixel text-[7px] text-tavern-smoke-light leading-loose mb-3">
              Add to your home screen for the full tavern experience. No app store required.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="font-pixel text-[8px] px-4 py-2 bg-tavern-gold text-retro-black border-b-4 border-tavern-gold-dark hover:bg-tavern-candle active:border-b-0 active:translate-y-1 transition-none"
              >
                ▶ Install
              </button>
              <button
                type="button"
                onClick={handleLater}
                className="font-pixel text-[8px] px-4 py-2 border-2 border-tavern-oak text-tavern-parchment hover:border-tavern-gold transition-none"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
