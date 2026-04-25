"use client";

import React, { useState } from "react";
import { useSpring, animated, config } from "@react-spring/web";

interface HabitCheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export default function HabitCheck({
  checked,
  onChange,
  disabled = false,
  size = "md",
  color = "#e8b864",
}: HabitCheckProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  const checkmark = useSpring({
    transform: checked ? "scale(1)" : "scale(0)",
    opacity: checked ? 1 : 0,
    config: { tension: 500, friction: 30 },
  });

  const ripple = useSpring({
    transform: isAnimating && checked ? "scale(2)" : "scale(0.5)",
    opacity: isAnimating && checked ? 0 : 1,
    config: { duration: 400 },
  });

  const handleClick = () => {
    if (disabled) return;
    setIsAnimating(true);
    onChange(!checked);
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center rounded
        border-2 transition-all duration-150
        ${sizeClasses[size]}
        ${checked
          ? "border-transparent"
          : "border-tavern-oak bg-tavern-smoke hover:border-tavern-gold/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      style={{
        backgroundColor: checked ? color : undefined,
      }}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <animated.span
          style={checkmark}
          className={`${iconSizes[size]} text-tavern-smoke font-bold`}
        >
          ✓
        </animated.span>
      )}

      {isAnimating && checked && (
        <animated.div
          style={{
            ...ripple,
            backgroundColor: color,
          }}
          className="absolute inset-0 rounded"
        />
      )}
    </button>
  );
}
