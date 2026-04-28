import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Outsorcy brand palette (Phase 1 stubs — swap when final assets land)
        navy: {
          DEFAULT: "#0A1628",
          50: "#E6E9EE",
          100: "#C2C9D5",
          200: "#9BA6B9",
          300: "#74829D",
          400: "#4D5E80",
          500: "#2A3D5F",
          600: "#1A2B47",
          700: "#0F1E36",
          800: "#0A1628",
          900: "#06101D",
        },
        accent: {
          DEFAULT: "#F5C443",
          fg: "#0A1628",
        },
        ink: "#0A1628",
        paper: "#FAFAF7",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "70ch",
      },
    },
  },
  plugins: [],
};

export default config;
