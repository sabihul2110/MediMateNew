// MediMate/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: "#1B3A6B", light: "#2952A3", dark: "#0F2347" },
        accent:   { DEFAULT: "#22C55E", light: "#4ADE80", dark: "#16A34A" },
        danger:   { DEFAULT: "#DC2626", light: "#EF4444", dark: "#B91C1C" },
        warning:  { DEFAULT: "#F59E0B", light: "#FCD34D", dark: "#D97706" },
        surface:  { DEFAULT: "#FFFFFF", muted: "#F4F6FA" },
        border:   { DEFAULT: "#E5E9F2", dark: "#C8D0E0" },
      },
      fontFamily: { sans: ["DM Sans", "sans-serif"] },
      borderRadius: { card: "16px", pill: "999px" },
      boxShadow: {
        card:  "0 2px 12px rgba(27,58,107,0.08)",
        hover: "0 8px 24px rgba(27,58,107,0.14)",
        nav:   "2px 0 16px rgba(27,58,107,0.06)",
      },
    },
  },
  plugins: [],
}