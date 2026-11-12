/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#f26654",
        "brand-ink": "#d8483a",
        "brand-soft": "#fdebe7",
        surface: "#f6f7f9",
        "surface-2": "#eef0f4",
        canvas: "#ffffff",
        ink: "#1f2330",
        "ink-soft": "#535a6b",
        muted: "#7d8394",
        line: "#e4e6ec",
        mint: "#c9f3e4",
        sky: "#cfe9f5",
        lemon: "#f2ebc9",
        rose: "#f8d3d0",
        lilac: "#d9d2f2",
        clay: "#f26654",
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
