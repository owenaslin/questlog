"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { getUserDashboardSnapshot } from "@/lib/quest-progress";
import { getOwnHeroProfile } from "@/lib/hero";
import { useViewMode } from "@/components/ViewModeProvider";

const navLinks = [
  { href: "/", label: "Tonight" },
  { href: "/board", label: "The Board" },
  { href: "/profile", label: "My Saga" },
  { href: "/sagas", label: "Sagas" },
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
    `mobile-label px-3 py-2 uppercase tracking-wider transition-none ${
      isActivePath(href)
        ? "bg-tavern-oak text-tavern-gold border-b-2 border-tavern-gold nav-active-glow"
        : "text-tavern-parchment hover:text-tavern-gold hover:bg-tavern-smoke-2"
    }`;

  /* XP bar width (0–100%) based on progress within current level (500 XP/level) */
  const xpPct = heroXp !== null
    ? Math.round(((heroXp % 500) / 500) * 100)
    : 0;

  return (
    <nav className="sticky top-0 z-50 bg-tavern-cream">
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
          className="md:hidden mobile-caption px-4 py-3 min-h-[48px] min-w-[48px] bg-tavern-smoke text-tavern-parchment border-2 border-tavern-oak active:bg-tavern-oak transition-none touch-target"
          aria-label="Toggle navigation"
          aria-expanded={isMenuOpen}
        >
          ☰
        </button>

        {/* ── Desktop nav ────────────────────────── */}
        <div className="hidden md:flex gap-1 items-center flex-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Hero pill (authed) / auth buttons ─── */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 bg-tavern-smoke border-2 border-tavern-oak px-2 py-1">
            <span className="mobile-label text-tavern-ink-dim uppercase tracking-wider">
              View
            </span>
            <select
              aria-label="View mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "auto" | "desktop" | "compact")}
              className="mobile-caption bg-tavern-smoke text-tavern-ink border-0 p-0"
            >
              <option value="auto">Auto</option>
              <option value="desktop">Desktop</option>
              <option value="compact">Compact</option>
            </select>
            <span className={`mobile-label ${isDesktopActive ? "text-tavern-lime" : "text-tavern-cyan"}`}>
              {isDesktopActive ? "DESK" : "COMP"}
            </span>
          </div>

          {isLoadingAuth ? (
            <span className="mobile-caption text-tavern-parchment-dim px-3 py-2 animate-flicker">...</span>
          ) : isAuthenticated ? (
            <>
              {/* Hero pill */}
              <Link
                href={heroHandle ? `/hero/${heroHandle}` : "/hero/edit"}
                className="flex items-center gap-2 bg-tavern-smoke border-2 border-tavern-oak px-3 py-1 hover:border-tavern-gold transition-none"
              >
                <span className="text-base leading-none">🧙</span>
                <div className="flex flex-col gap-0.5">
                  {heroLevel !== null && (
                    <span className="mobile-caption text-tavern-gold">
                      LVL {heroLevel}
                    </span>
                  )}
                  {heroXp !== null && (
                    <div className="w-16 h-1 bg-tavern-cream-2 relative">
                      <div
                        className="h-full bg-tavern-gold absolute left-0 top-0 transition-none"
                        style={{ width: `${xpPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="mobile-label px-3 py-2 uppercase tracking-wider bg-tavern-ember text-white hover:bg-tavern-ember-dark transition-none"
              >
                Leave
              </button>
            </>
          ) : (
            <>
              <Link
                href={loginUrl}
                className="mobile-label px-3 py-2 uppercase tracking-wider bg-tavern-cream-3 text-tavern-ink hover:bg-tavern-oak-3 transition-none"
              >
                Enter
              </Link>
              <Link
                href={signupUrl}
                className="mobile-label px-3 py-2 uppercase tracking-wider bg-tavern-gold text-tavern-cream hover:bg-tavern-gold-2 transition-none"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile menu ──────────────────────────── */}
      {isMenuOpen && (
        <div className="md:hidden border-t-4 border-tavern-oak-2 px-4 py-3 flex flex-col gap-2 bg-tavern-cream">
          <div className="bg-tavern-smoke border-2 border-tavern-oak p-2">
            <label className="mobile-caption text-tavern-parchment-dim block mb-1 uppercase">View Mode</label>
            <select
              aria-label="View mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "auto" | "desktop" | "compact")}
              className="w-full mobile-caption"
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
            <span className="mobile-caption text-tavern-parchment-dim px-3 py-2">
              Checking your bounty...
            </span>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="mobile-label px-3 py-3 uppercase tracking-wider bg-tavern-ember text-white text-left"
            >
              Leave the Tavern
            </button>
          ) : (
            <>
              <Link
                href={loginUrl}
                onClick={() => setIsMenuOpen(false)}
                className="mobile-label px-3 py-3 uppercase tracking-wider bg-tavern-cream-3 text-tavern-ink"
              >
                Enter the Tavern
              </Link>
              <Link
                href={signupUrl}
                onClick={() => setIsMenuOpen(false)}
                className="mobile-label px-3 py-3 uppercase tracking-wider bg-tavern-gold text-tavern-cream"
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
