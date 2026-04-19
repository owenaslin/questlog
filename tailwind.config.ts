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
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "bounce-8bit": "bounce8bit 0.5s step-end infinite",
        "slide-in": "slideIn 0.3s steps(6) forwards",
        flicker: "flicker 2s step-end infinite",
        "pulse-warm": "pulseWarm 2s step-end infinite",
        "float-up": "floatUp 1s steps(8) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
