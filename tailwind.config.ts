import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        brand: "#1A1A2E",
        accent: "#FF6B5B",
        "coral-light": "#FFF0ED",
        "coral-mid": "#FFDDD6",
        success: "#34C759",
        warning: "#FF9500",
        surface: "rgba(255, 255, 255, 0.72)",
        "glass-border": "rgba(0, 0, 0, 0.06)"
      },
      borderRadius: {
        "2xl": "24px",
        "3xl": "32px"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.04)",
        glass: "0 4px 30px rgba(0, 0, 0, 0.03)",
        premium: "0 20px 50px rgba(26, 26, 46, 0.07)",
        "inner-glow": "inset 0 1px 1px rgba(255, 255, 255, 0.85)",
        "lift": "0 12px 40px rgba(26, 26, 46, 0.08)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
