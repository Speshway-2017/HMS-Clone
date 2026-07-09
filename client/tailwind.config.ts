import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        navy: {
          50: "#eef2fb",
          100: "#dbe4f6",
          200: "#b3c6ec",
          300: "#8aa8e1",
          400: "#5a80d0",
          500: "#3660bf",
          600: "#2748a3",
          700: "#1e3a8a",
          800: "#182f6e",
          900: "#132453",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
