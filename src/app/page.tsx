import Link from "next/link";
import PixelButton from "@/components/PixelButton";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      {/* Pixel Art Hero */}
      <div className="relative">
        <div className="text-6xl mb-4 animate-bounce-8bit">⚔</div>
        <h1 className="font-pixel text-retro-yellow text-2xl md:text-3xl leading-relaxed mb-2">
          QUESTLOG
        </h1>
        <div className="font-pixel text-retro-lightgray text-[10px] md:text-xs leading-loose">
          Your adventure awaits, adventurer!
        </div>
      </div>

      {/* Pixel Art Divider */}
      <div className="flex gap-2 items-center">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 ${
              i % 3 === 0
                ? "bg-retro-red"
                : i % 3 === 1
                  ? "bg-retro-yellow"
                  : "bg-retro-blue"
            }`}
          />
        ))}
      </div>

      {/* Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6">
          <div className="text-3xl mb-3">🗡</div>
          <h2 className="font-pixel text-retro-red text-xs mb-3">
            MAIN QUESTS
          </h2>
          <p className="font-pixel text-retro-lightgray text-[8px] leading-loose">
            Epic challenges that take months to complete. Learn a language,
            train for a marathon, or build something amazing.
          </p>
        </div>

        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6">
          <div className="text-3xl mb-3">⚡</div>
          <h2 className="font-pixel text-retro-blue text-xs mb-3">
            SIDE QUESTS
          </h2>
          <p className="font-pixel text-retro-lightgray text-[8px] leading-loose">
            Quick adventures from a few hours to a weekend. Cook something new,
            explore a trail, or sketch a masterpiece.
          </p>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel-sm p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <h3 className="font-pixel text-retro-lime text-[9px] mb-2">EARN XP</h3>
          <p className="font-pixel text-retro-lightgray text-[7px] leading-loose">
            Complete quests to earn experience points and level up your adventurer.
          </p>
        </div>
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel-sm p-4 text-center">
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-pixel text-retro-cyan text-[9px] mb-2">AI QUESTS</h3>
          <p className="font-pixel text-retro-lightgray text-[7px] leading-loose">
            Generate custom quests based on your location and interests with AI.
          </p>
        </div>
        <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel-sm p-4 text-center">
          <div className="text-2xl mb-2">✏</div>
          <h3 className="font-pixel text-retro-orange text-[9px] mb-2">CREATE</h3>
          <p className="font-pixel text-retro-lightgray text-[7px] leading-loose">
            Design your own quests and share the adventure with others.
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/quests">
          <PixelButton variant="primary" size="lg">
            Browse Quests
          </PixelButton>
        </Link>
        <Link href="/signup">
          <PixelButton variant="success" size="lg">
            Start Adventure
          </PixelButton>
        </Link>
      </div>

      {/* Pixel Art Footer Decoration */}
      <div className="flex gap-1 mt-8">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-retro-darkgray"
            style={{
              opacity: [0.3, 0.5, 0.4, 0.6, 0.35, 0.45, 0.55, 0.4, 0.5, 0.3, 0.6, 0.4, 0.5, 0.35, 0.45, 0.55, 0.4, 0.5, 0.3, 0.6][i],
            }}
          />
        ))}
      </div>
    </div>
  );
}
