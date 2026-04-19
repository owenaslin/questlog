"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { getProfileProgressSummary } from "@/lib/quest-progress";

const navLinks = [
  { href: "/board",    label: "The Board" },
  { href: "/sagas",    label: "Sagas" },
  { href: "/guilds",   label: "Guilds" },
  { href: "/trophies", label: "Trophies" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [heroLevel, setHeroLevel] = useState<number | null>(null);
  const [heroXp, setHeroXp] = useState<number | null>(null);

  const currentPath = pathname || "/";
  const loginUrl  = useMemo(() => buildAuthUrl("login",  currentPath), [currentPath]);
  const signupUrl = useMemo(() => buildAuthUrl("signup", currentPath), [currentPath]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const hydrateSession = async () => {
      const { data } = await supabase.auth.getSession();
      const authed = Boolean(data.session);
      setIsAuthenticated(authed);
      setIsLoadingAuth(false);

      if (authed) {
        try {
          const summary = await getProfileProgressSummary();
          if (summary) {
            setHeroLevel(summary.level);
            setHeroXp(summary.xp_total);
          }
        } catch {
          // non-critical
        }
      }
    };

    hydrateSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setIsAuthenticated(Boolean(session));
        if (!session) { setHeroLevel(null); setHeroXp(null); }
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
    `font-pixel text-[8px] px-3 py-2 uppercase tracking-wider transition-none ${
      isActivePath(href)
        ? "bg-tavern-oak text-tavern-gold border-b-2 border-tavern-gold"
        : "text-tavern-parchment hover:text-tavern-gold hover:bg-tavern-smoke-light"
    }`;

  /* XP bar width (0–100%) based on progress within current level (500 XP/level) */
  const xpPct = heroXp !== null
    ? Math.round(((heroXp % 500) / 500) * 100)
    : 0;

  return (
    <nav className="sticky top-0 z-50 border-b-4 border-tavern-oak-dark"
         style={{ background: "linear-gradient(180deg, #2a1f14 0%, #1a1510 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">

        {/* ── Logo / tavern name ──────────────────── */}
        <Link
          href="/"
          className="font-pixel text-tavern-gold text-sm hover:text-tavern-candle transition-none flex items-center gap-2"
        >
          🍺 <span>TARVN</span>
        </Link>

        {/* ── Mobile hamburger ───────────────────── */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="md:hidden font-pixel text-[10px] px-3 py-2 bg-tavern-smoke text-tavern-parchment border-2 border-tavern-oak"
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
          {isLoadingAuth ? (
            <span className="font-pixel text-tavern-smoke-light text-[8px] px-3 py-2 animate-flicker">...</span>
          ) : isAuthenticated ? (
            <>
              {/* Hero pill */}
              <Link
                href="/journal"
                className="flex items-center gap-2 bg-tavern-smoke border-2 border-tavern-oak px-3 py-1 hover:border-tavern-gold transition-none"
              >
                <span className="text-base leading-none">🧙</span>
                <div className="flex flex-col gap-0.5">
                  {heroLevel !== null && (
                    <span className="font-pixel text-tavern-gold text-[7px]">
                      LVL {heroLevel}
                    </span>
                  )}
                  {heroXp !== null && (
                    <div className="w-16 h-1 bg-tavern-smoke-light relative">
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
                className="font-pixel text-[8px] px-3 py-2 uppercase tracking-wider bg-tavern-ember text-retro-white hover:bg-tavern-ember-dark transition-none"
              >
                Leave
              </button>
            </>
          ) : (
            <>
              <Link
                href={loginUrl}
                className="font-pixel text-[8px] px-3 py-2 uppercase tracking-wider bg-retro-blue text-retro-white hover:bg-retro-lightblue transition-none"
              >
                Enter
              </Link>
              <Link
                href={signupUrl}
                className="font-pixel text-[8px] px-3 py-2 uppercase tracking-wider bg-tavern-gold text-tavern-smoke hover:bg-tavern-candle transition-none"
              >
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
            <Link href="/journal" onClick={() => setIsMenuOpen(false)} className={linkClasses("/journal")}>
              My Journal
            </Link>
          )}

          {isLoadingAuth ? (
            <span className="font-pixel text-tavern-smoke-light text-[8px] px-3 py-2">
              Checking your bounty...
            </span>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="font-pixel text-[8px] px-3 py-3 uppercase tracking-wider bg-tavern-ember text-retro-white text-left"
            >
              Leave the Tavern
            </button>
          ) : (
            <>
              <Link
                href={loginUrl}
                onClick={() => setIsMenuOpen(false)}
                className="font-pixel text-[8px] px-3 py-3 uppercase tracking-wider bg-retro-blue text-retro-white"
              >
                Enter the Tavern
              </Link>
              <Link
                href={signupUrl}
                onClick={() => setIsMenuOpen(false)}
                className="font-pixel text-[8px] px-3 py-3 uppercase tracking-wider bg-tavern-gold text-tavern-smoke"
              >
                Begin Your Legend
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
