import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline — tavrn",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-8">
      <div className="text-5xl" aria-hidden="true">🍺</div>

      <div>
        <h1 className="text-heading text-tavern-gold leading-snug mb-4">
          The Tavern is Dark
        </h1>
        <p className="text-body text-tavern-smoke-light leading-relaxed max-w-sm">
          You&apos;ve wandered beyond the reach of the signal fire.
          <br />
          Return to the village and reconnect to continue your quest.
        </p>
      </div>

      <Link
        href="/"
        className="text-body-sm font-medium px-6 py-3 min-h-[44px] bg-tavern-gold text-retro-black border-b-4 border-tavern-gold-dark hover:bg-tavern-candle active:border-b-0 active:translate-y-1 transition-none"
      >
        ▶ Try Again
      </Link>
    </div>
  );
}
