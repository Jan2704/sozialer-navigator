import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      colors: {
        bg: {
          base: "#F2F0EA",
          surface: "#FFFFFF",
          muted: "#E7E3D8",
        },
        text: {
          primary: "#1B1A17",
          secondary: "#6E6A60",
          muted: "#8A8578",
        },
        brand: {
          blue: "#D9622B", // Confident single accent
          indigo: "#B84D1C", // Accent hover/deep
          emerald: "#5B8467", // Muted sage — secondary/success
          navy: "#1F2E24", // Deep charcoal-green
          gold: "#c5a67c", // Premium gold (legal-referral sub-brand)
        },

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1E40AF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#EEF1F5",
          foreground: "#0F172A",
        },
        destructive: {
          DEFAULT: "#B91C1C",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#EEF1F5",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#F7F8FA",
          foreground: "#0F172A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
