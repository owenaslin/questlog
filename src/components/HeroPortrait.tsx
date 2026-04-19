"use client";

import React from "react";
import { AVATAR_PORTRAITS, AvatarKey } from "@/lib/types";

interface HeroPortraitProps {
  spriteKey: string;
  size?: "sm" | "md" | "lg" | "xl";
  selected?: boolean;
  onClick?: () => void;
}

const SIZE = {
  sm: { box: "w-10 h-10", emoji: "text-xl",  border: "border-2" },
  md: { box: "w-16 h-16", emoji: "text-3xl", border: "border-4" },
  lg: { box: "w-24 h-24", emoji: "text-5xl", border: "border-4" },
  xl: { box: "w-32 h-32", emoji: "text-6xl", border: "border-4" },
};

export default function HeroPortrait({
  spriteKey,
  size = "md",
  selected = false,
  onClick,
}: HeroPortraitProps) {
  const portrait = AVATAR_PORTRAITS[spriteKey as AvatarKey] ?? AVATAR_PORTRAITS.wizard;
  const { box, emoji, border } = SIZE[size];

  return (
    <button
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={!onClick}
      className={`
        ${box} ${border} flex items-center justify-center relative
        transition-none select-none
        ${onClick ? "cursor-pointer hover:opacity-90" : "cursor-default"}
        ${selected ? "ring-2 ring-tavern-gold ring-offset-1 ring-offset-retro-black" : ""}
      `}
      style={{
        background: portrait.bg,
        borderColor: selected ? "#e8b864" : "#5c3a1a",
        boxShadow: selected ? "4px 4px 0 #c49a3c" : "2px 2px 0 #5c3a1a",
        imageRendering: "pixelated",
      }}
      aria-label={onClick ? `Select ${portrait.label} portrait` : portrait.label}
      aria-pressed={onClick ? selected : undefined}
    >
      <span className={emoji} style={{ imageRendering: "pixelated" }}>
        {portrait.emoji}
      </span>
      {selected && (
        <span
          className="absolute -top-1 -right-1 font-pixel text-[7px] bg-tavern-gold text-tavern-smoke px-1"
          style={{ lineHeight: "12px" }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

/** Grid of all portraits for the picker */
export function PortraitPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: AvatarKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {(Object.entries(AVATAR_PORTRAITS) as [AvatarKey, (typeof AVATAR_PORTRAITS)[AvatarKey]][]).map(
        ([key, p]) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <HeroPortrait
              spriteKey={key}
              size="md"
              selected={selected === key}
              onClick={() => onSelect(key)}
            />
            <span className="font-pixel text-tavern-smoke-light text-[6px]">
              {p.label}
            </span>
          </div>
        )
      )}
    </div>
  );
}
