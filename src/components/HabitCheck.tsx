"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  const handleClick = () => {
    if (disabled) return;
    setIsAnimating(true);
    onChange(!checked);
    setTimeout(() => setIsAnimating(false), 300);
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
      <AnimatePresence mode="wait">
        {checked && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`${iconSizes[size]} text-tavern-smoke font-bold`}
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>

      {/* Ripple/celebration effect on check */}
      {isAnimating && checked && (
        <motion.div
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 rounded"
          style={{ backgroundColor: color, opacity: 0.3 }}
        />
      )}
    </button>
  );
}
