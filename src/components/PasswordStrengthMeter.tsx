import React from "react";
import { evaluatePasswordStrength } from "@/lib/password-strength";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

const levelColors: Record<string, string> = {
  very_weak: "bg-retro-red",
  weak: "bg-retro-orange",
  fair: "bg-retro-yellow",
  good: "bg-retro-cyan",
  strong: "bg-retro-green",
};

export default function PasswordStrengthMeter({ password, className = "" }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, level, label } = evaluatePasswordStrength(password);
  const filledBars = Math.max(1, Math.min(5, score));

  return (
    <div className={`mt-2 ${className}`} aria-live="polite">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 border border-retro-black ${
              i < filledBars ? levelColors[level] : "bg-retro-darkgray"
            }`}
          />
        ))}
      </div>
      <p className="font-pixel text-[7px] text-retro-lightgray">
        Password Strength: <span className="text-retro-white">{label}</span>
      </p>
    </div>
  );
}
