/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eefbf3",
          100: "#d6f5e3",
          200: "#b0eacc",
          300: "#7dd8ae",
          400: "#47be8b",
          500: "#25a270",
          600: "#188259",
          700: "#146849",
          800: "#13533c",
          900: "#114532",
          950: "#07271d",
        },
        dark: {
          900: "#0a0f0d",
          800: "#111a14",
          700: "#182019",
          600: "#1e2b20",
          500: "#243027",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-pattern":
          "radial-gradient(ellipse at top, #182019 0%, #0a0f0d 60%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
