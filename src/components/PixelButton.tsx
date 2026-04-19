"use client";

import React from "react";

interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary:
    "bg-retro-blue text-retro-white hover:bg-retro-lightblue border-retro-darkblue",
  secondary:
    "bg-retro-gray text-retro-white hover:bg-retro-lightgray border-retro-darkgray",
  danger:
    "bg-retro-red text-retro-white hover:bg-retro-orange border-retro-darkpurple",
  success:
    "bg-retro-green text-retro-white hover:bg-retro-lime border-retro-darkgreen",
};

const sizeStyles = {
  sm: "px-3 py-2 md:py-1 text-[8px] min-h-[44px] md:min-h-0",
  md: "px-5 py-3 md:py-2 text-[10px] min-h-[48px] md:min-h-0",
  lg: "px-8 py-4 md:py-3 text-xs min-h-[56px] md:min-h-0",
};

export default function PixelButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={`
        font-pixel border-b-4 border-r-4 border-t-2 border-l-2
        active:border-b-2 active:border-r-2 active:border-t-4 active:border-l-4
        active:translate-x-[2px] active:translate-y-[2px]
        transition-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        uppercase tracking-wider
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
