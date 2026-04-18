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
      },
      boxShadow: {
        pixel: "4px 4px 0px 0px rgba(0,0,0,1)",
        "pixel-sm": "2px 2px 0px 0px rgba(0,0,0,1)",
        "pixel-lg": "6px 6px 0px 0px rgba(0,0,0,1)",
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
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "bounce-8bit": "bounce8bit 0.5s step-end infinite",
        "slide-in": "slideIn 0.3s steps(6) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
