"use client";

import { useEffect } from "react";

const STORAGE_KEY = "tavrn_theme_mode";

export default function ThemeModeSync() {
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
      document.documentElement.setAttribute("data-theme-mode", stored);
      return;
    }

    document.documentElement.setAttribute("data-theme-mode", "system");
  }, []);

  return null;
}
