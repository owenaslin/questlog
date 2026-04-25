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
          gold: "#e8b864",
          "gold-dark": "#c49a3c",
          ember: "#c44a36",
          "ember-dark": "#8b2a1a",
          oak: "#8b5a2b",
          "oak-dark": "#5c3a1a",
          parchment: "#e8d4a0",
          "parchment-dark": "#c4a85a",
          "parchment-dim": "#a08c6a",
          candle: "#f5d76e",
          smoke: "#4a3f35",
          "smoke-light": "#6b5a4e",
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
  plugins: [
    // Custom plugin for screen reader utilities
    function({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
      });
    },
  ],
};

export default config;
