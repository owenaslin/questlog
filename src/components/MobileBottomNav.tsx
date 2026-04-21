"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Tonight", icon: "🍺", exact: true },
  { href: "/board", label: "Board", icon: "�" },
  { href: "/profile", label: "Saga", icon: "🧙" },
  { href: "/sagas", label: "Sagas", icon: "📜" },
  { href: "/trophies", label: "Loot", icon: "🏅" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe tavern-stone"
      style={{ borderTop: "4px solid #5c3a1a" }}
    >
      {/* Oak beam at very top */}
      <div className="oak-beam w-full" />
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 transition-none ${
                active
                  ? "text-tavern-gold nav-active-glow bg-tavern-smoke"
                  : "text-tavern-parchment active:bg-tavern-smoke"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-xl leading-none mb-1">{item.icon}</span>
              <span className="font-pixel text-[8px] uppercase tracking-wider">
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-8 h-1 bg-tavern-gold"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
      {/* Home indicator safe area spacer */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
