"use client";

import React from "react";
import Image from "next/image";
import ParticleLayer from "./ParticleLayer";

export type SceneType =
  | "tavern-interior"
  | "common-room"
  | "hearthside"
  | "quest-alcove"
  | "hero-quarters"
  | "hall-of-fame"
  | "map-room"
  | "entrance"
  | "none";

interface AmbientSceneProps {
  scene: SceneType;
}

/** Warm amber overlay gradient */
function WarmOverlay({ intensity = 0.06 }: { intensity?: number }) {
  return (
    <div
      className="scene-layer"
      style={{
        background: `radial-gradient(ellipse at 50% 90%, rgba(232,184,100,${intensity}) 0%, transparent 65%)`,
      }}
    />
  );
}

/** Stone floor strip at bottom */
function StoneFloor() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-16 tavern-stone"
      style={{ borderTop: "4px solid #1a1c2c" }}
    />
  );
}

/** Generic corner torch */
function WallTorch({
  side,
  top = "20%",
  flameDelay = "0s",
}: {
  side: "left" | "right";
  top?: string;
  flameDelay?: string;
}) {
  return (
    <div
      className="absolute torch-halo"
      style={{
        [side]: "2%",
        top,
        width: 48,
        height: 96,
      }}
    >
      <Image
        src="/tavern/torch.svg"
        alt="torch"
        width={48}
        height={96}
        className="animate-flicker-full"
        style={{ animationDelay: flameDelay, imageRendering: "pixelated" }}
        priority={false}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────── Scenes ──── */

function TavernInterior() {
  return (
    <>
      {/* Dark warm background */}
      <div className="scene-layer" style={{ background: "#1a1510" }} />
      {/* Wooden floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 tavern-wood-grain"
        style={{ borderTop: "4px solid #5c3a1a" }}
      />
      {/* Left wall hearth */}
      <div className="absolute bottom-20 left-[3%] hidden sm:block">
        <Image
          src="/tavern/hearth.svg"
          alt="hearth"
          width={128}
          height={112}
          priority={false}
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      {/* Right wall banner */}
      <div className="absolute top-8 right-[4%] hidden sm:block">
        <Image
          src="/tavern/banner.svg"
          alt="banner"
          width={96}
          height={160}
          priority={false}
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      {/* Left torch */}
      <WallTorch side="left" top="15%" flameDelay="0.3s" />
      {/* Right torch */}
      <WallTorch side="right" top="15%" flameDelay="1.1s" />
      {/* Ember particles from hearth */}
      <ParticleLayer
        opacity={0.9}
        particles={[
          {
            type: "ember",
            count: 12,
            originX: [2, 18],
            originY: [40, 70],
            durationRange: [1.8, 3.2],
            delayRange: [0, 3],
          },
          {
            type: "smoke",
            count: 6,
            originX: [4, 16],
            originY: [30, 50],
            durationRange: [2.5, 4],
            delayRange: [0, 2],
          },
        ]}
      />
      <WarmOverlay intensity={0.08} />
    </>
  );
}

function CommonRoom() {
  return (
    <>
      <div className="scene-layer" style={{ background: "#16120e" }} />
      <StoneFloor />
      {/* Quest board on back wall */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 hidden sm:block">
        <Image
          src="/tavern/board.svg"
          alt="quest board"
          width={160}
          height={128}
          priority={false}
          style={{ imageRendering: "pixelated", opacity: 0.7 }}
        />
      </div>
      {/* Torches flanking board */}
      <WallTorch side="left" top="10%" flameDelay="0.5s" />
      <WallTorch side="right" top="10%" flameDelay="1.8s" />
      {/* Dust motes */}
      <ParticleLayer
        opacity={0.7}
        particles={[
          {
            type: "dust",
            count: 18,
            originX: [20, 80],
            originY: [10, 60],
            durationRange: [5, 10],
            delayRange: [0, 8],
          },
        ]}
      />
      <WarmOverlay intensity={0.05} />
    </>
  );
}

function Hearthside() {
  return (
    <>
      <div className="scene-layer" style={{ background: "#1a1510" }} />
      {/* Large close-up hearth on left */}
      <div className="absolute bottom-16 left-[5%] hidden sm:block">
        <Image
          src="/tavern/hearth.svg"
          alt="hearth"
          width={192}
          height={168}
          priority={false}
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      {/* Candle cluster right */}
      <div className="absolute bottom-16 right-[6%] flex gap-4 hidden sm:flex">
        <Image
          src="/tavern/candle.svg"
          alt="candle"
          width={32}
          height={48}
          className="animate-flicker"
          style={{ animationDelay: "0.4s", imageRendering: "pixelated" }}
          priority={false}
        />
        <Image
          src="/tavern/candle.svg"
          alt="candle"
          width={24}
          height={36}
          className="animate-flicker"
          style={{ animationDelay: "1.2s", imageRendering: "pixelated" }}
          priority={false}
        />
      </div>
      {/* Wooden floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 tavern-wood-grain"
        style={{ borderTop: "4px solid #5c3a1a" }}
      />
      {/* Ember particles */}
      <ParticleLayer
        opacity={0.9}
        particles={[
          {
            type: "ember",
            count: 16,
            originX: [3, 20],
            originY: [30, 65],
            durationRange: [1.5, 3],
            delayRange: [0, 3],
          },
          {
            type: "smoke",
            count: 8,
            originX: [4, 18],
            originY: [20, 45],
            durationRange: [2, 4],
            delayRange: [0, 2.5],
          },
        ]}
      />
      <WarmOverlay intensity={0.1} />
    </>
  );
}

function QuestAlcove() {
  return (
    <>
      <div className="scene-layer" style={{ background: "#12100e" }} />
      <StoneFloor />
      {/* Stone wall texture sides */}
      <div className="absolute top-0 left-0 w-16 h-full tavern-stone hidden sm:block" />
      <div className="absolute top-0 right-0 w-16 h-full tavern-stone hidden sm:block" />
      {/* Dungeon background on desktop */}
      <div className="absolute inset-0 hidden md:block" style={{ opacity: 0.3 }}>
        <Image
          src="/tavern/dungeon.svg"
          alt=""
          fill
          style={{ objectFit: "cover", imageRendering: "pixelated" }}
          priority={false}
        />
      </div>
      {/* Left torch */}
      <WallTorch side="left" top="20%" flameDelay="0.6s" />
      {/* Right torch */}
      <WallTorch side="right" top="20%" flameDelay="1.5s" />
      {/* Ember + smoke from torches */}
      <ParticleLayer
        opacity={0.8}
        particles={[
          {
            type: "ember",
            count: 8,
            originX: [0, 10],
            originY: [15, 35],
            durationRange: [1.5, 2.5],
            delayRange: [0, 2],
          },
          {
            type: "ember",
            count: 8,
            originX: [90, 100],
            originY: [15, 35],
            durationRange: [1.5, 2.5],
            delayRange: [0.5, 2.5],
          },
        ]}
      />
      <WarmOverlay intensity={0.04} />
    </>
  );
}

function HeroQuarters() {
  return (
    <>
      <div className="scene-layer" style={{ background: "#1a1510" }} />
      {/* Wood floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 tavern-wood-grain"
        style={{ borderTop: "4px solid #5c3a1a" }}
      />
      {/* Shield on left wall */}
      <div className="absolute top-8 left-[5%] hidden sm:block">
        <Image
          src="/tavern/shield.svg"
          alt="shield"
          width={96}
          height={112}
          priority={false}
          style={{ imageRendering: "pixelated", opacity: 0.8 }}
        />
      </div>
      {/* Chest on floor right */}
      <div className="absolute bottom-20 right-[6%] hidden sm:block">
        <Image
          src="/tavern/chest.svg"
          alt="chest"
          width={128}
          height={96}
          priority={false}
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      {/* Candle on left */}
      <div className="absolute bottom-24 left-[20%] hidden sm:block">
        <Image
          src="/tavern/candle.svg"
          alt="candle"
          width={32}
          height={48}
          className="animate-flicker"
          style={{ animationDelay: "0.8s", imageRendering: "pixelated" }}
          priority={false}
        />
      </div>
      <ParticleLayer
        opacity={0.6}
        particles={[
          {
            type: "dust",
            count: 10,
            originX: [15, 85],
            originY: [10, 60],
            durationRange: [6, 12],
            delayRange: [0, 6],
          },
        ]}
      />
      <WarmOverlay intensity={0.06} />
    </>
  );
}

function HallOfFame() {
  return (
    <>
      <div className="scene-layer" style={{ background: "#12100e" }} />
      <StoneFloor />
      {/* Stone wall */}
      <div className="absolute top-0 left-0 right-0 h-32 tavern-stone hidden sm:block" />
      {/* Hanging banners */}
      <div className="absolute top-0 left-[10%] hidden sm:block">
        <Image src="/tavern/banner.svg" alt="" width={64} height={107} priority={false}
          style={{ imageRendering: "pixelated", opacity: 0.7 }} />
      </div>
      <div className="absolute top-0 right-[10%] hidden sm:block">
        <Image src="/tavern/banner.svg" alt="" width={64} height={107} priority={false}
          style={{ imageRendering: "pixelated", opacity: 0.6, transform: "scaleX(-1)" }} />
      </div>
      {/* Raven perch */}
      <div className="absolute top-[15%] right-[8%] hidden md:block">
        <Image src="/tavern/raven.svg" alt="" width={96} height={80} priority={false}
          style={{ imageRendering: "pixelated", opacity: 0.8 }} />
      </div>
      {/* Torches */}
      <WallTorch side="left" top="8%" flameDelay="0.4s" />
      <WallTorch side="right" top="8%" flameDelay="1.6s" />
      <ParticleLayer
        opacity={0.7}
        particles={[
          { type: "ember", count: 6, originX: [0, 8], originY: [5, 25], durationRange: [1.5, 2.5], delayRange: [0, 2] },
          { type: "ember", count: 6, originX: [92, 100], originY: [5, 25], durationRange: [1.5, 2.5], delayRange: [0.5, 2.5] },
          { type: "dust",  count: 12, originX: [20, 80], originY: [10, 60], durationRange: [7, 14], delayRange: [0, 8] },
        ]}
      />
      <WarmOverlay intensity={0.04} />
    </>
  );
}

function MapRoom() {
  return (
    <>
      {/* Parchment map background */}
      <div className="scene-layer parchment-texture" style={{ opacity: 0.15 }} />
      <div className="scene-layer" style={{ background: "rgba(26,21,16,0.85)" }} />
      {/* Candles */}
      <div className="absolute bottom-8 left-[8%] hidden sm:block">
        <Image src="/tavern/candle.svg" alt="" width={32} height={48} className="animate-flicker"
          style={{ animationDelay: "0.3s", imageRendering: "pixelated" }} priority={false} />
      </div>
      <div className="absolute bottom-8 right-[8%] hidden sm:block">
        <Image src="/tavern/candle.svg" alt="" width={32} height={48} className="animate-flicker"
          style={{ animationDelay: "1.4s", imageRendering: "pixelated" }} priority={false} />
      </div>
      {/* Scroll */}
      <div className="absolute top-[20%] right-[6%] hidden sm:block" style={{ opacity: 0.5 }}>
        <Image src="/tavern/scroll.svg" alt="" width={96} height={80} priority={false}
          style={{ imageRendering: "pixelated" }} />
      </div>
      <ParticleLayer
        opacity={0.6}
        particles={[
          { type: "dust", count: 14, originX: [10, 90], originY: [5, 70], durationRange: [5, 12], delayRange: [0, 7] },
        ]}
      />
      <WarmOverlay intensity={0.05} />
    </>
  );
}

function TavernEntrance() {
  return (
    <>
      {/* Night sky */}
      <div className="scene-layer" style={{ background: "linear-gradient(180deg, #0d0d1a 0%, #1a1c2c 60%, #1a1510 100%)" }} />
      {/* Stars */}
      <div className="scene-layer hidden sm:block" style={{ opacity: 0.7 }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={i % 3 === 0 ? "animate-blink" : ""}
            style={{
              position: "absolute",
              width: 2, height: 2,
              backgroundColor: "#f4f4f4",
              left: `${(i * 37 + 11) % 90 + 5}%`,
              top:  `${(i * 23 + 7) % 40 + 3}%`,
              animationDelay: `${(i * 0.4) % 2}s`,
            }}
          />
        ))}
      </div>
      {/* Mountain silhouette */}
      <div className="absolute bottom-24 left-0 right-0 hidden sm:block" style={{ opacity: 0.5 }}>
        <Image src="/tavern/mountain.svg" alt="" fill
          style={{ objectFit: "cover", imageRendering: "pixelated", objectPosition: "bottom" }}
          priority={false} />
      </div>
      {/* Door center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 hidden sm:block">
        <Image src="/tavern/door.svg" alt="tavern door" width={128} height={160} priority={false}
          style={{ imageRendering: "pixelated" }} />
      </div>
      {/* Torches either side of door */}
      <WallTorch side="left" top="35%" flameDelay="0.2s" />
      <WallTorch side="right" top="35%" flameDelay="1.0s" />
      {/* Forest silhouette at bottom */}
      <div className="absolute bottom-0 left-0 right-0 hidden sm:block" style={{ height: 96, opacity: 0.6 }}>
        <Image src="/tavern/forest.svg" alt="" fill
          style={{ objectFit: "cover", imageRendering: "pixelated", objectPosition: "bottom" }}
          priority={false} />
      </div>
      <ParticleLayer
        opacity={0.8}
        particles={[
          { type: "ember", count: 8, originX: [0, 12], originY: [25, 50], durationRange: [1.5, 3], delayRange: [0, 2] },
          { type: "ember", count: 8, originX: [88, 100], originY: [25, 50], durationRange: [1.5, 3], delayRange: [0.5, 2.5] },
        ]}
      />
      <WarmOverlay intensity={0.06} />
    </>
  );
}

/* ──────────────────────────────────────────────── Main ──── */

export default function AmbientScene({ scene }: AmbientSceneProps) {
  if (scene === "none") return null;

  const content: Record<SceneType, React.ReactNode> = {
    "tavern-interior": <TavernInterior />,
    "common-room":     <CommonRoom />,
    "hearthside":      <Hearthside />,
    "quest-alcove":    <QuestAlcove />,
    "hero-quarters":   <HeroQuarters />,
    "hall-of-fame":    <HallOfFame />,
    "map-room":        <MapRoom />,
    "entrance":        <TavernEntrance />,
    "none":            null,
  };

  return (
    <div className="ambient-scene" aria-hidden="true">
      {content[scene]}
    </div>
  );
}
