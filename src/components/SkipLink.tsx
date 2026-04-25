'use client';

/**
 * SkipLink component for accessibility
 * Allows keyboard users to skip to main content
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-retro-yellow focus:text-retro-black focus:font-pixel"
    >
      Skip to main content
    </a>
  );
}
