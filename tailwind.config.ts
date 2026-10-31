import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f6f8f5",
        foreground: "#111815",
        brand: {
          dark: "#0e392c", // Deep forest green
          darker: "#09271e",
          primary: "#113e31",
          lime: "#c2f07d", // Pastel neon lime / pistachio
          limeLight: "#e5f9c5",
          limeHover: "#b4e86a",
          mint: "#eef7ee",
          muted: "#718079",
          border: "#e6ebe4",
          surface: "#ffffff",
          cardBg: "#ffffff",
        },
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'soft': '0 2px 14px 0 rgba(16, 38, 28, 0.04)',
        'card': '0 4px 20px -2px rgba(16, 38, 28, 0.05)',
      },
    },
  },
  plugins: [],
};
export default config;
