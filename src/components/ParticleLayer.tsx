"use client";

import React, { useEffect, useState } from "react";

type ParticleType = "ember" | "smoke" | "dust" | "snow" | "rain" | "coin";

interface ParticleConfig {
  type: ParticleType;
  count: number;
  /** area where particles originate: [x%, y%] of container */
  originX?: [number, number];
  originY?: [number, number];
  durationRange?: [number, number];
  delayRange?: [number, number];
}

interface ParticleLayerProps {
  particles: ParticleConfig[];
  /** Overall opacity multiplier */
  opacity?: number;
  className?: string;
}

const TYPE_CLASS: Record<ParticleType, string> = {
  ember: "particle particle-ember animate-ember",
  smoke: "particle particle-smoke animate-smoke",
  dust:  "particle particle-dust  animate-drift",
  snow:  "particle particle-snow  animate-snow",
  rain:  "particle particle-rain  animate-rain",
  coin:  "particle particle-coin  animate-coin-shower",
};

const TYPE_COLOR_VARIANTS: Record<ParticleType, string[]> = {
  ember: ["#ef7d57", "#c44a36", "#ffcd75", "#f5d76e"],
  smoke: ["#4a3f35", "#6b5a4e", "#333c57"],
  dust:  ["#e8d4a0", "#c4a85a", "#f4f4f4"],
  snow:  ["#f4f4f4", "#e8e8e8", "#ffffff"],
  rain:  ["#94b0c2", "#73eff7", "#566c86"],
  coin:  ["#e8b864", "#ffcd75", "#c49a3c"],
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface Particle {
  id: string;
  type: ParticleType;
  left: string;
  top: string;
  duration: string;
  delay: string;
  color: string;
  size: number;
}

function buildParticles(particles: ParticleConfig[], mobileCap: number): Particle[] {
  return particles.flatMap((cfg) => {
    const count = Math.round(cfg.count * mobileCap);
    const [oxMin, oxMax] = cfg.originX ?? [0, 100];
    const [oyMin, oyMax] = cfg.originY ?? [0, 100];
    const [durMin, durMax] = cfg.durationRange ?? [1.5, 4];
    const [delMin, delMax] = cfg.delayRange ?? [0, 3];
    const colors = TYPE_COLOR_VARIANTS[cfg.type];

    return Array.from({ length: count }, (_, i) => ({
      id: `${cfg.type}-${i}-${Math.random().toString(36).slice(2)}`,
      type: cfg.type,
      left: `${rand(oxMin, oxMax)}%`,
      top:  `${rand(oyMin, oyMax)}%`,
      duration: `${rand(durMin, durMax).toFixed(2)}s`,
      delay: `${rand(delMin, delMax).toFixed(2)}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: cfg.type === "smoke" ? rand(3, 6) : cfg.type === "dust" ? 1 : cfg.type === "coin" ? 4 : 2,
    }));
  });
}

export default function ParticleLayer({
  particles,
  opacity = 1,
  className = "",
}: ParticleLayerProps) {
  // Particles are generated exclusively on the client after first mount
  // to avoid SSR/hydration mismatches from Math.random()
  const [allParticles, setAllParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setMounted(true);
      return;
    }
    const isMobile = window.innerWidth < 640;
    const mobileCap = isMobile ? 0.4 : 1;
    setAllParticles(buildParticles(particles, mobileCap));
    setMounted(true);
  // particles config is stable — intentionally omitted to avoid re-randomising on re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render nothing on the server and before mount (avoids hydration diff entirely)
  if (!mounted) return null;

  return (
    <div
      className={`ambient-scene ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {allParticles.map((p) => (
        <span
          key={p.id}
          className={TYPE_CLASS[p.type]}
          style={{
            left: p.left,
            top:  p.top,
            animationDuration: p.duration,
            animationDelay: p.delay,
            backgroundColor: p.color,
            width:  `${p.size}px`,
            height: p.type === "rain" ? `${p.size * 4}px` : `${p.size}px`,
          }}
        />
      ))}
    </div>
  );
}
