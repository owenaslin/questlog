"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ViewMode = "auto" | "desktop" | "compact";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isDesktopActive: boolean;
}

const DESKTOP_MIN_WIDTH = 1100;
const DESKTOP_MIN_ASPECT_RATIO = 1.25;
const STORAGE_KEY = "tarvn_view_mode";

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function resolveDesktopFromViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const width = window.innerWidth;
  const height = Math.max(window.innerHeight, 1);
  const ratio = width / height;

  return width >= DESKTOP_MIN_WIDTH && ratio >= DESKTOP_MIN_ASPECT_RATIO;
}

export default function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("auto");
  const [autoDesktop, setAutoDesktop] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored === "auto" || stored === "desktop" || stored === "compact") {
      setViewModeState(stored);
    }

    const recompute = () => {
      setAutoDesktop(resolveDesktopFromViewport());
    };

    recompute();
    window.addEventListener("resize", recompute);

    return () => {
      window.removeEventListener("resize", recompute);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const value = useMemo<ViewModeContextValue>(() => {
    const isDesktopActive = viewMode === "desktop" || (viewMode === "auto" && autoDesktop);

    return {
      viewMode,
      setViewMode: setViewModeState,
      isDesktopActive,
    };
  }, [autoDesktop, viewMode]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within ViewModeProvider");
  }
  return context;
}
