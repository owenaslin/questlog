"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface FloatingActionButtonProps {
  href: string;
  icon: string;
  label: string;
  variant?: "primary" | "secondary";
}

export default function FloatingActionButton({
  href,
  icon,
  label,
  variant = "primary",
}: FloatingActionButtonProps) {
  const bgColor =
    variant === "primary"
      ? "bg-tavern-gold text-tavern-smoke"
      : "bg-retro-blue text-retro-white";

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.95 }}
      className="md:hidden fixed bottom-24 right-4 z-40"
    >
      <Link
        href={href}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-pixel-lg ${bgColor} active:shadow-pixel transition-none`}
        aria-label={label}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-pixel text-[10px] whitespace-nowrap">{label}</span>
      </Link>
    </motion.div>
  );
}
