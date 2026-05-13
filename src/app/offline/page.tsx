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
        <h1 className="font-pixel text-tavern-gold text-[12px] leading-relaxed mb-4">
          The Tavern is Dark
        </h1>
        <p className="text-body text-[--parchment-dim] leading-relaxed max-w-sm">
          You&apos;ve wandered beyond the reach of the signal fire.
          <br />
          Return to the village and reconnect to continue your quest.
        </p>
      </div>

      <Link
        href="/"
        className="tavrn-btn tavrn-btn-primary tavrn-btn-lg"
      >
        ▶ Try Again
      </Link>
    </div>
  );
}
