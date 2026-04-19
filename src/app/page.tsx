import Link from "next/link";
import Image from "next/image";
import PixelButton from "@/components/PixelButton";
import AmbientScene from "@/components/AmbientScene";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-0">
      <AmbientScene scene="entrance" />

      {/* ── Tavern Sign ─────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center mb-2">
        {/* Hanging chains */}
        <div className="flex gap-24 mb-1">
          <div className="w-1 h-6 bg-tavern-oak-dark opacity-60" />
          <div className="w-1 h-6 bg-tavern-oak-dark opacity-60" />
        </div>
        {/* Sign board */}
        <div className="tavern-card px-8 py-4 text-center relative">
          <div className="absolute -top-2 left-4 right-4 h-1 bg-tavern-oak" />
          <div className="text-4xl mb-2 animate-flicker">🍺</div>
          <h1 className="font-pixel text-tavern-gold text-2xl md:text-3xl leading-relaxed mb-1 text-gold-shimmer">
            TARVN
          </h1>
          <p className="font-pixel text-tavern-parchment text-[8px] tracking-widest">
            THE ADVENTURER&apos;S TAVERN
          </p>
        </div>
      </div>

      {/* ── Tavern Interior Scene ─────────────────────────────── */}
      <div className="w-full max-w-4xl relative mb-8">
        {/* Interior background */}
        <div className="w-full bg-tavern-smoke border-4 border-tavern-oak-dark shadow-pixel-oak relative overflow-hidden"
             style={{ minHeight: "320px" }}>

          {/* Stone floor */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-retro-darkgray border-t-4 border-retro-gray" />

          {/* Left wall — hearth → Journal */}
          <Link href="/journal" className="absolute left-2 md:left-6 bottom-0 group flex flex-col items-center gap-1 cursor-pointer" title="Journal — by the hearth">
            <Image src="/tavern/hearth.svg" alt="Hearth" width={128} height={112} className="image-rendering-pixelated group-hover:brightness-125 transition-none" style={{ imageRendering: "pixelated" }} />
            <span className="font-pixel text-[6px] text-tavern-gold opacity-0 group-hover:opacity-100 transition-none tracking-wider pb-1"
                  style={{ textShadow: "0 0 6px rgba(232,184,100,0.8)" }}>
              JOURNAL
            </span>
          </Link>

          {/* Left torch */}
          <div className="absolute left-36 md:left-44 top-6 torch-halo pointer-events-none">
            <Image src="/tavern/torch.svg" alt="" width={36} height={72} className="image-rendering-pixelated animate-flicker-full" style={{ imageRendering: "pixelated", animationDelay: "0.3s" }} />
          </div>

          {/* Right wall — banner → Sagas */}
          <Link href="/sagas" className="absolute right-2 md:right-6 top-0 group flex flex-col items-center cursor-pointer" title="The Sagas">
            <Image src="/tavern/banner.svg" alt="Banner" width={72} height={120} className="image-rendering-pixelated group-hover:brightness-125 transition-none" style={{ imageRendering: "pixelated" }} />
            <span className="font-pixel text-[6px] text-tavern-gold opacity-0 group-hover:opacity-100 transition-none tracking-wider mt-1"
                  style={{ textShadow: "0 0 6px rgba(232,184,100,0.8)" }}>
              SAGAS
            </span>
          </Link>

          {/* Right torch */}
          <div className="absolute right-20 md:right-28 top-6 torch-halo pointer-events-none">
            <Image src="/tavern/torch.svg" alt="" width={36} height={72} className="image-rendering-pixelated animate-flicker-full" style={{ imageRendering: "pixelated", animationDelay: "1.1s" }} />
          </div>

          {/* Centre — quest board → Board */}
          <Link href="/board" className="absolute left-1/2 -translate-x-1/2 top-4 group flex flex-col items-center gap-1 cursor-pointer" title="Quest Board">
            <Image src="/tavern/board.svg" alt="Quest Board" width={160} height={128} className="image-rendering-pixelated group-hover:brightness-125 transition-none" style={{ imageRendering: "pixelated" }} />
            <p className="font-pixel text-tavern-gold text-[7px] tracking-wider text-center group-hover:animate-pulse"
               style={{ textShadow: "0 0 6px rgba(232,184,100,0.5)" }}>
              QUEST BOARD
            </p>
          </Link>

          {/* Centre bottom — door → Board (enter tavern) */}
          <Link href="/board" className="absolute left-1/2 -translate-x-1/2 bottom-0 group cursor-pointer" title="Enter the tavern">
            <Image src="/tavern/door.svg" alt="Door" width={96} height={120} className="image-rendering-pixelated group-hover:brightness-125 transition-none" style={{ imageRendering: "pixelated" }} />
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-pixel text-[6px] text-tavern-gold opacity-0 group-hover:opacity-100 transition-none whitespace-nowrap"
                  style={{ textShadow: "0 0 6px rgba(232,184,100,0.8)" }}>
              ENTER
            </span>
          </Link>

          {/* Table candles — non-interactive */}
          <div className="absolute bottom-8 left-1/4 pointer-events-none">
            <Image src="/tavern/candle.svg" alt="" width={24} height={36} className="image-rendering-pixelated animate-flicker" style={{ imageRendering: "pixelated", animationDelay: "1.2s" }} />
          </div>
          <div className="absolute bottom-8 right-1/4 pointer-events-none">
            <Image src="/tavern/candle.svg" alt="" width={20} height={30} className="image-rendering-pixelated animate-flicker" style={{ imageRendering: "pixelated", animationDelay: "0.4s" }} />
          </div>

          {/* Mug → Journal */}
          <Link href="/journal" className="absolute bottom-6 left-[35%] hidden sm:block group cursor-pointer" title="Journal">
            <Image src="/tavern/mug.svg" alt="Mug" width={48} height={56} className="image-rendering-pixelated group-hover:brightness-125 transition-none" style={{ imageRendering: "pixelated", opacity: 0.85 }} />
          </Link>

          {/* Ambient warm overlay (stronger) */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: "radial-gradient(ellipse at 20% 90%, rgba(232,184,100,0.14) 0%, transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(196,74,54,0.06) 0%, transparent 50%)" }} />
        </div>
      </div>

      {/* ── Welcome scroll ───────────────────────────────────────── */}
      <div className="parchment-card max-w-lg w-full px-6 py-4 text-center mb-8 relative">
        <div className="flex justify-center mb-2">
          <Image src="/tavern/scroll.svg" alt="" width={96} height={80} className="image-rendering-pixelated opacity-70" style={{ imageRendering: "pixelated" }} />
        </div>
        <p className="font-pixel text-tavern-parchment text-[9px] leading-loose">
          Welcome, adventurer. Pull up a stool.<br />
          The board is full of quests waiting for a hero.<br />
          What legend will you write tonight?
        </p>
      </div>

      {/* ── Three Rooms ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-10">

        <Link href="/board" className="group block">
          <div className="tavern-card p-5 text-center transition-none group-hover:-translate-y-1 group-hover:shadow-pixel-gold h-full">
            <Image src="/tavern/board.svg" alt="" width={40} height={34} className="image-rendering-pixelated mx-auto mb-3" />
            <h2 className="font-pixel text-tavern-gold text-[9px] mb-2">THE BOARD</h2>
            <p className="font-pixel text-tavern-parchment text-[7px] leading-loose opacity-80">
              Browse & collect quests. Ask the Quest Giver for a custom adventure.
            </p>
          </div>
        </Link>

        <Link href="/journal" className="group block">
          <div className="tavern-card p-5 text-center transition-none group-hover:-translate-y-1 group-hover:shadow-pixel-gold h-full">
            <Image src="/tavern/scroll.svg" alt="" width={40} height={34} className="image-rendering-pixelated mx-auto mb-3" />
            <h2 className="font-pixel text-tavern-gold text-[9px] mb-2">MY JOURNAL</h2>
            <p className="font-pixel text-tavern-parchment text-[7px] leading-loose opacity-80">
              Track your active quests, streaks, and weekly deeds by the hearth.
            </p>
          </div>
        </Link>

        <Link href="/sagas" className="group block">
          <div className="tavern-card p-5 text-center transition-none group-hover:-translate-y-1 group-hover:shadow-pixel-gold h-full">
            <Image src="/tavern/banner.svg" alt="" width={32} height={40} className="image-rendering-pixelated mx-auto mb-3" />
            <h2 className="font-pixel text-tavern-gold text-[9px] mb-2">THE SAGAS</h2>
            <p className="font-pixel text-tavern-parchment text-[7px] leading-loose opacity-80">
              Multi-part questlines for heroes who seek a longer legend.
            </p>
          </div>
        </Link>
      </div>

      {/* ── More spots ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full mb-10">
        {[
          { href: "/guilds",   icon: "🏰", label: "GUILDS",   sub: "Browse by category" },
          { href: "/trophies", icon: "🏅", label: "TROPHIES", sub: "Badges & honours" },
          { href: "/board?source=ai", icon: "🤖", label: "AI QUEST",  sub: "Generate with magic" },
          { href: "/board?new=1",     icon: "✏",  label: "CREATE",    sub: "Write your own" },
        ].map(({ href, icon, label, sub }) => (
          <Link key={href} href={href} className="group block">
            <div className="bg-tavern-smoke border-2 border-tavern-oak p-3 text-center transition-none group-hover:border-tavern-gold h-full">
              <div className="text-xl mb-1">{icon}</div>
              <p className="font-pixel text-tavern-gold text-[8px] mb-1">{label}</p>
              <p className="font-pixel text-tavern-parchment text-[6px] opacity-70">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Primary CTA ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <Link href="/board">
          <PixelButton variant="primary" size="lg">
            ⚔ Enter the Tavern
          </PixelButton>
        </Link>
        <Link href="/signup">
          <PixelButton variant="success" size="lg">
            🍺 Start Your Legend
          </PixelButton>
        </Link>
      </div>

      {/* ── Floor pixel divider ───────────────────────────────────── */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2"
            style={{
              backgroundColor: i % 2 === 0 ? "#5c3a1a" : "#8b5a2b",
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <p className="font-pixel text-tavern-smoke-light text-[7px] mb-4">
        🍺 tarvn.xyz — every hero needs a tavern
      </p>
    </div>
  );
}
