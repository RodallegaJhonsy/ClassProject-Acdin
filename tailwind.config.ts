import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        royal: {
          950: "#0b1530",
          900: "#12204a",
          800: "#1b2d63",
          700: "#26407f",
        },
        beige: {
          50: "#fbf8f2",
          100: "#f4ecdf",
          200: "#e8dac2",
        },
        gold: {
          300: "#e6cf8f",
          400: "#d4b36a",
          500: "#b8964a",
        },
        abyss: {
          950: "#02060d",
          900: "#04111f",
          800: "#06223b",
          700: "#0a3557",
        },
        spooky: {
          950: "#0a0612",
          900: "#130924",
          800: "#22113d",
          700: "#361b5f",
          accent: "#ff7a00",
          lime: "#a3e635",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shake: "shake 0.3s ease-in-out 2",
        pop: "pop 0.25s ease-out",
        fadeIn: "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

