import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: "#0e5c43",
          50: "#eef6f2",
          100: "#d3e9df",
          600: "#0e5c43",
          700: "#0a4733",
          800: "#083a2a",
          900: "#062c20",
        },
        gold: {
          DEFAULT: "#b8893f",
          light: "#d9b878",
          dark: "#8c651f",
        },
        cream: {
          DEFAULT: "#faf6ec",
          dark: "#f1ead7",
        },
        ink: "#1c2b26",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
