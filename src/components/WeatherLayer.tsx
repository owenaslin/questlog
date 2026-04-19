"use client";

import React, { useEffect, useState } from "react";
import ParticleLayer from "./ParticleLayer";

type WeatherCondition = "clear" | "rain" | "snow" | "mist";

/** Deterministic daily seed based on year+month+day */
function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getCondition(): WeatherCondition {
  const now   = new Date();
  const hour  = now.getHours();
  const month = now.getMonth() + 1; // 1-12
  const seed  = dailySeed();

  // Night mist (10pm–6am)
  if (hour >= 22 || hour < 6) return "mist";

  // Snow in Dec–Jan
  if (month === 12 || month === 1) {
    // ~40% chance of snow
    if (seed % 10 < 4) return "snow";
  }

  // Rain ~20% of days
  if (seed % 5 === 0) return "rain";

  return "clear";
}

export default function WeatherLayer() {
  const [condition, setCondition] = useState<WeatherCondition>("clear");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCondition(getCondition());
    setMounted(true);

    // Re-evaluate at midnight
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => setCondition(getCondition()), msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || condition === "clear") return null;

  if (condition === "mist") {
    return (
      <div
        className="ambient-scene"
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {/* Fog strip 1 */}
        <div
          className="animate-fog-drift"
          style={{
            position: "absolute",
            bottom: "10%",
            left: 0,
            width: "200%",
            height: "60px",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(74,63,53,0.12) 40%, rgba(74,63,53,0.12) 60%, transparent 100%)",
            animationDuration: "22s",
          }}
        />
        {/* Fog strip 2 (offset) */}
        <div
          className="animate-fog-drift"
          style={{
            position: "absolute",
            bottom: "25%",
            left: "-30%",
            width: "200%",
            height: "40px",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(41,54,111,0.08) 40%, rgba(41,54,111,0.08) 60%, transparent 100%)",
            animationDuration: "30s",
            animationDelay: "8s",
          }}
        />
      </div>
    );
  }

  if (condition === "rain") {
    return (
      <ParticleLayer
        opacity={0.6}
        particles={[
          {
            type: "rain",
            count: 40,
            originX: [0, 100],
            originY: [0, 5],
            durationRange: [0.6, 1.2],
            delayRange: [0, 2],
          },
        ]}
      />
    );
  }

  if (condition === "snow") {
    return (
      <ParticleLayer
        opacity={0.8}
        particles={[
          {
            type: "snow",
            count: 25,
            originX: [0, 100],
            originY: [0, 5],
            durationRange: [4, 9],
            delayRange: [0, 5],
          },
        ]}
      />
    );
  }

  return null;
}
