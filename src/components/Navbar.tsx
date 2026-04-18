"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/quests", label: "Quests" },
  { href: "/questlines", label: "Questlines" },
  { href: "/categories", label: "Categories" },
  { href: "/badges", label: "Badges" },
  { href: "/generate", label: "AI Gen" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const currentPath = pathname || "/";
  const loginUrl = useMemo(() => buildAuthUrl("login", currentPath), [currentPath]);
  const signupUrl = useMemo(() => buildAuthUrl("signup", currentPath), [currentPath]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const hydrateSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(Boolean(data.session));
      setIsLoadingAuth(false);
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setIsAuthenticated(Boolean(session));
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
    if (!pathname) {
      return false;
    }

    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClasses = (href: string) =>
    `font-pixel text-[8px] px-3 py-2 uppercase tracking-wider transition-none ${
      isActivePath(href)
        ? "bg-retro-darkpurple text-retro-yellow"
        : "text-retro-lightgray hover:text-retro-white hover:bg-retro-darkgray"
    }`;

  return (
    <nav className="bg-retro-black border-b-4 border-retro-darkpurple sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-pixel text-retro-yellow text-sm hover:text-retro-orange transition-none"
        >
          ⚔ QUEST BOARD
        </Link>

        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="md:hidden font-pixel text-[10px] px-3 py-2 bg-retro-darkgray text-retro-white border-2 border-retro-darkpurple"
          aria-label="Toggle navigation"
          aria-expanded={isMenuOpen}
        >
          ☰
        </button>

        <div className="hidden md:flex gap-2 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClasses(link.href)}
            >
              {link.label}
            </Link>
          ))}

          {!isLoadingAuth && isAuthenticated && (
            <Link href="/profile" className={linkClasses("/profile")}>
              Profile
            </Link>
          )}

          {isLoadingAuth ? (
            <span className="font-pixel text-retro-gray text-[8px] px-3 py-2">...</span>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="font-pixel text-[8px] px-3 py-2 uppercase tracking-wider bg-retro-red text-retro-white hover:bg-retro-orange transition-none"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href={loginUrl}
                className="font-pixel text-[8px] px-3 py-2 uppercase tracking-wider bg-retro-blue text-retro-white hover:bg-retro-lightblue transition-none"
              >
                Login
              </Link>
              <Link
                href={signupUrl}
                className="font-pixel text-[8px] px-3 py-2 uppercase tracking-wider bg-retro-green text-retro-white hover:bg-retro-lime transition-none"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t-4 border-retro-darkpurple bg-retro-black px-4 py-3 flex flex-col gap-2">
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
            <Link href="/profile" onClick={() => setIsMenuOpen(false)} className={linkClasses("/profile")}>
              Profile
            </Link>
          )}

          {isLoadingAuth ? (
            <span className="font-pixel text-retro-gray text-[8px] px-3 py-2">Checking session...</span>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="font-pixel text-[8px] px-3 py-3 uppercase tracking-wider bg-retro-red text-retro-white text-left"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href={loginUrl}
                onClick={() => setIsMenuOpen(false)}
                className="font-pixel text-[8px] px-3 py-3 uppercase tracking-wider bg-retro-blue text-retro-white"
              >
                Login
              </Link>
              <Link
                href={signupUrl}
                onClick={() => setIsMenuOpen(false)}
                className="font-pixel text-[8px] px-3 py-3 uppercase tracking-wider bg-retro-green text-retro-white"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
