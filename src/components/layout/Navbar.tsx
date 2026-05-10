"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { getUserDashboardSnapshot } from "@/lib/quest-progress";
import { getOwnHeroProfile } from "@/lib/hero";
import { useViewMode } from "@/components/ui/ViewModeProvider";

const navLinks = [
  { href: "/", label: "Tonight" },
  { href: "/board", label: "The Board" },
  { href: "/profile", label: "My Saga" },
  { href: "/settings", label: "Settings" },
  { href: "/habits", label: "Habits" },
  { href: "/sagas", label: "Questlines" },
  { href: "/trophies", label: "Trophies" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { viewMode, setViewMode, isDesktopActive } = useViewMode();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [heroLevel, setHeroLevel] = useState<number | null>(null);
  const [heroXp, setHeroXp] = useState<number | null>(null);
  const [heroHandle, setHeroHandle] = useState<string | null>(null);

  const loginUrl = useMemo(() => buildAuthUrl("login", pathname || "/"), [pathname]);
  const signupUrl = useMemo(() => buildAuthUrl("signup", pathname || "/"), [pathname]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const hydrateSession = async () => {
      const { data } = await supabase.auth.getSession();
      const authed = Boolean(data.session);
      setIsAuthenticated(authed);
      setIsLoadingAuth(false);

      if (authed) {
        try {
          const [snapshot, heroData] = await Promise.all([
            getUserDashboardSnapshot(),
            getOwnHeroProfile(),
          ]);
          const summary = snapshot?.profileSummary ?? null;
          if (summary) {
            setHeroLevel(summary.level);
            setHeroXp(summary.xp_total);
          }
          if (heroData?.handle) setHeroHandle(heroData.handle);
        } catch {
          // non-critical
        }
      }
    };

    hydrateSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setIsAuthenticated(Boolean(session));
        if (!session) { setHeroLevel(null); setHeroXp(null); setHeroHandle(null); }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.push("/");
  };

  const isActivePath = (href: string) => {
    if (!pathname) return false;
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClasses = (href: string) =>
    `text-body-sm px-3 py-2 font-medium whitespace-nowrap transition-none relative ${
      isActivePath(href)
        ? "text-tavern-gold nav-active-glow after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-tavern-gold"
        : "text-[--parchment-dim] hover:text-tavern-parchment hover:bg-white/[0.04]"
    }`;

  /* XP bar width (0–100%) based on progress within current level (500 XP/level) */
  const xpPct = heroXp !== null
    ? Math.round(((heroXp % 500) / 500) * 100)
    : 0;

  return (
    <nav className="sticky top-0 z-50"
         style={{ background: "linear-gradient(180deg, #2a1f14 0%, #1a1510 100%)" }}>
      {/* Oak beam top accent */}
      <div className="oak-beam w-full" />
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">

        {/* ── Logo / tavern name ──────────────────── */}
        <Link
          href="/"
          className="text-tavern-gold hover:text-tavern-candle transition-none flex items-center gap-2"
        >
          🍺 <span className="tavrn-wordmark text-2xl leading-none">tavrn</span>
        </Link>

        {/* ── Mobile hamburger ───────────────────── */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="md:hidden font-pixel text-[10px] px-4 py-3 min-h-[48px] min-w-[48px] bg-tavern-smoke text-tavern-parchment border-2 border-tavern-oak active:bg-tavern-oak transition-none touch-target"
          aria-label="Toggle navigation"
          aria-expanded={isMenuOpen}
        >
          ☰
        </button>

        {/* ── Desktop nav ────────────────────────── */}
        <div className="hidden md:flex gap-1 items-center flex-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClasses(link.href)} aria-current={isActivePath(link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Hero pill (authed) / auth buttons ─── */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 bg-tavern-smoke border-2 border-tavern-oak px-2 py-1">
            <span className="kicker text-[--parchment-dim]">View</span>
            <select
              aria-label="View mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "auto" | "desktop" | "compact")}
              className="text-body-sm bg-tavern-smoke text-tavern-parchment border-0 p-0"
            >
              <option value="auto">Auto</option>
              <option value="desktop">Desktop</option>
              <option value="compact">Compact</option>
            </select>
            <span className={`kicker ${isDesktopActive ? "text-retro-lime" : "text-retro-lightblue"}`}>
              {isDesktopActive ? "DESK" : "COMP"}
            </span>
          </div>

          {isLoadingAuth ? (
            <span className="text-body-sm text-[--parchment-dim] px-3 py-2">...</span>
          ) : isAuthenticated ? (
            <>
              {/* Hero pill */}
              <Link
                href={heroHandle ? `/hero/${heroHandle}` : "/hero/edit"}
                className="flex items-center gap-2.5 bg-tavern-smoke border border-tavern-oak rounded px-3 py-1.5 hover:border-tavern-gold/30 transition-none"
              >
                <span className="text-xl leading-none">🧙</span>
                <div className="flex flex-col gap-1">
                  {heroLevel !== null && (
                    <span className="text-body-sm font-semibold text-tavern-gold leading-none">
                      Lv. {heroLevel}
                    </span>
                  )}
                  {heroXp !== null && (
                    <div className="w-16 h-1.5 bg-black/40 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-tavern-gold rounded-sm transition-none"
                        style={{ width: `${xpPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="tavrn-btn tavrn-btn-danger tavrn-btn-sm"
              >
                Leave
              </button>
            </>
          ) : (
            <>
              <Link href={loginUrl} className="tavrn-btn tavrn-btn-ghost tavrn-btn-sm">
                Enter
              </Link>
              <Link href={signupUrl} className="tavrn-btn tavrn-btn-primary tavrn-btn-sm">
                Join
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile menu ──────────────────────────── */}
      {isMenuOpen && (
        <div className="md:hidden border-t-4 border-tavern-oak-dark px-4 py-3 flex flex-col gap-2"
             style={{ background: "#1a1510" }}>
          <div className="bg-tavern-smoke border-2 border-tavern-oak p-2">
            <label className="kicker text-[--parchment-dim] block mb-1.5">View Mode</label>
            <select
              aria-label="View mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "auto" | "desktop" | "compact")}
              className="w-full text-body-sm"
            >
              <option value="auto">Auto</option>
              <option value="desktop">Desktop</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={linkClasses(link.href)}
              aria-current={isActivePath(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}

          {!isLoadingAuth && isAuthenticated && (
            <>
              <Link href="/journal" onClick={() => setIsMenuOpen(false)} className={linkClasses("/journal")}>
                My Journal
              </Link>
              <Link href="/hero/edit" onClick={() => setIsMenuOpen(false)} className={linkClasses("/hero/edit")}>
                Edit Hero
              </Link>
            </>
          )}

          {isLoadingAuth ? (
            <span className="text-body-sm text-[--parchment-dim] px-3 py-2">
              Checking your bounty...
            </span>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="tavrn-btn tavrn-btn-danger w-full justify-start"
            >
              Leave the Tavern
            </button>
          ) : (
            <>
              <Link
                href={loginUrl}
                onClick={() => setIsMenuOpen(false)}
                className="tavrn-btn tavrn-btn-ghost w-full justify-start"
              >
                Enter the Tavern
              </Link>
              <Link
                href={signupUrl}
                onClick={() => setIsMenuOpen(false)}
                className="tavrn-btn tavrn-btn-primary w-full justify-start"
              >
                Begin Your Legend
              </Link>
            </>
          )}
        </div>
      )}
      {/* Oak beam bottom border */}
      <div className="oak-beam w-full" />
    </nav>
  );
}
