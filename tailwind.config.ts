import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "cursive"],
        fell: ['"IM Fell English SC"', "Georgia", "serif"],
      },
      colors: {
        retro: {
          black: "#1a1c2c",
          darkpurple: "#5d275d",
          red: "#b13e53",
          orange: "#ef7d57",
          yellow: "#ffcd75",
          lime: "#a7f070",
          green: "#38b764",
          darkgreen: "#257179",
          darkblue: "#29366f",
          blue: "#3b5dc9",
          lightblue: "#41a6f6",
          cyan: "#73eff7",
          white: "#f4f4f4",
          lightgray: "#94b0c2",
          gray: "#566c86",
          darkgray: "#333c57",
        },
        tavern: {
          /* COZY-DARK tavern palette */
          cream: "#2a1d14",
          "cream-2": "#3a2a1d",
          "cream-3": "#4a3625",
          smoke: "#1f1611",
          "smoke-2": "#2f221a",
          oak: "#3a2a1d",
          "oak-2": "#4a3625",
          "oak-3": "#6b4a2b",
          parchment: "#f3e0b3",
          "parchment-2": "#d8bd84",
          "parchment-dim": "rgba(243,224,179,0.72)",
          "parchment-faint": "rgba(243,224,179,0.45)",
          gold: "#e8b864",
          "gold-2": "#c49a3c",
          ember: "#d27349",
          lime: "#a7c46c",
          cyan: "#6fa8a8",
          ink: "#f3e0b3",
          "ink-dim": "rgba(243,224,179,0.62)",
          stroke: "#1a110b",
          "stroke-soft": "rgba(26,17,11,0.7)",
          /* Legacy aliases for compatibility */
          "gold-dark": "#c49a3c",
          "ember-dark": "#8b2a1a",
          "parchment-dark": "#d8bd84",
          candle: "#f5d76e",
          "smoke-light": "#2f221a",
        },
      },
      boxShadow: {
        pixel: "4px 4px 0px 0px rgba(0,0,0,1)",
        "pixel-sm": "2px 2px 0px 0px rgba(0,0,0,1)",
        "pixel-lg": "6px 6px 0px 0px rgba(0,0,0,1)",
        "pixel-gold": "4px 4px 0px 0px #c49a3c",
        "pixel-ember": "4px 4px 0px 0px #8b2a1a",
        "pixel-oak": "4px 4px 0px 0px #5c3a1a",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        bounce8bit: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "25%": { opacity: "0.85" },
          "50%": { opacity: "0.95" },
          "75%": { opacity: "0.8" },
        },
        pulseWarm: {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(232,184,100,0.3)" },
          "50%": { boxShadow: "0 0 16px 4px rgba(232,184,100,0.6)" },
        },
        floatUp: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-32px)", opacity: "0" },
        },
        // New — environmental
        ember: {
          "0%":   { transform: "translateY(0) translateX(0)",    opacity: "1" },
          "30%":  { transform: "translateY(-20px) translateX(4px)",  opacity: "0.9" },
          "60%":  { transform: "translateY(-40px) translateX(-4px)", opacity: "0.6" },
          "100%": { transform: "translateY(-64px) translateX(6px)",  opacity: "0" },
        },
        smoke: {
          "0%":   { transform: "translateY(0) scale(1)",   opacity: "0.4" },
          "50%":  { transform: "translateY(-24px) scale(1.5)", opacity: "0.2" },
          "100%": { transform: "translateY(-48px) scale(2)",   opacity: "0" },
        },
        drift: {
          "0%":   { transform: "translateX(0) translateY(0)",     opacity: "0.6" },
          "50%":  { transform: "translateX(16px) translateY(-8px)",  opacity: "0.4" },
          "100%": { transform: "translateX(32px) translateY(-4px)",  opacity: "0" },
        },
        rain: {
          "0%":   { transform: "translateY(-16px) translateX(0)",    opacity: "0.7" },
          "100%": { transform: "translateY(100vh) translateX(-20px)", opacity: "0.4" },
        },
        snow: {
          "0%":   { transform: "translateY(-8px) translateX(0)",   opacity: "0.9" },
          "33%":  { transform: "translateY(33vh) translateX(8px)",  opacity: "0.8" },
          "66%":  { transform: "translateY(66vh) translateX(-8px)", opacity: "0.7" },
          "100%": { transform: "translateY(100vh) translateX(4px)", opacity: "0.6" },
        },
        fogDrift: {
          "0%":   { transform: "translateX(-10%)", opacity: "0" },
          "20%":  { opacity: "0.12" },
          "80%":  { opacity: "0.12" },
          "100%": { transform: "translateX(10%)",  opacity: "0" },
        },
        coinShower: {
          "0%":   { transform: "translateY(-16px) rotate(0deg)",    opacity: "1" },
          "100%": { transform: "translateY(80px)  rotate(360deg)",   opacity: "0" },
        },
        tavernFlickerFull: {
          "0%, 88%, 100%": { opacity: "1" },
          "90%":  { opacity: "0.7" },
          "92%":  { opacity: "1" },
          "94%":  { opacity: "0.8" },
          "96%":  { opacity: "1" },
        },
        parallaxSlow: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "bounce-8bit": "bounce8bit 0.5s step-end infinite",
        "slide-in": "slideIn 0.3s steps(6) forwards",
        flicker: "flicker 2s step-end infinite",
        "pulse-warm": "pulseWarm 2s step-end infinite",
        "float-up": "floatUp 1s steps(8) forwards",
        // New
        ember: "ember 2.4s steps(12) infinite",
        smoke: "smoke 3s steps(8) infinite",
        drift: "drift 6s steps(12) infinite",
        rain: "rain 0.8s linear infinite",
        snow: "snow 6s steps(16) infinite",
        "fog-drift": "fogDrift 18s linear infinite",
        "coin-shower": "coinShower 1s steps(8) forwards",
        "flicker-full": "tavernFlickerFull 4s step-end infinite",
        "parallax-slow": "parallaxSlow 60s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
