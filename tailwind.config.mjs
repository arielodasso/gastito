import { defineConfig } from "tailwindcss";

export default defineConfig({
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Parchment / Claude Style Reference palette
        "bone-parchment": "#f8f8f6",
        "paper-white": "#ffffff",
        "soft-stone": "#efeeeb",
        "warm-border": "#e7e6e1",
        "carbon-ink": "#121212",
        "graphite": "#373734",
        "ashen": "#7b7974",
        "clay": "#d97757",
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
    },
  },
  plugins: [],
});