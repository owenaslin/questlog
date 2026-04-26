"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSpring, animated } from "@react-spring/web";

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
  const [isPressed, setIsPressed] = useState(false);
  const bgColor =
    variant === "primary"
      ? "bg-tavern-gold text-tavern-smoke"
      : "bg-tavern-cyan text-tavern-cream";

  const springs = useSpring({
    transform: isPressed ? "scale(0.95)" : "scale(1)",
    opacity: 1,
    config: { tension: 300, friction: 10 },
  });

  return (
    <animated.div
      style={springs}
      className="md:hidden fixed bottom-24 right-4 z-40"
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <Link
        href={href}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-pixel-lg ${bgColor} active:shadow-pixel transition-none`}
        aria-label={label}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-pixel text-[10px] whitespace-nowrap">{label}</span>
      </Link>
    </animated.div>
  );
}
