"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Capacitor builds run inside a native WebView — no SW needed there.
    if (process.env.NEXT_PUBLIC_CAPACITOR_BUILD === "true") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              // New SW is waiting — a refresh toast can be wired here later.
              if (process.env.NODE_ENV === "development") {
                console.log("[SW] Update available — reload to apply.");
              }
            }
          });
        });
      } catch (err) {
        console.error("[SW] Registration failed:", err);
      }
    };

    // Defer until after the page has loaded so the SW registration request
    // does not compete with critical first-paint resources.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
