import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Cream / off-white surfaces
        cream: {
          50: "#FBF8F3",
          100: "#F7F2EA",
          200: "#EFE7D9",
          300: "#E4D8C4",
        },
        // Warm clay accent — the signature color
        clay: {
          50: "#FBF1EC",
          100: "#F5DDD0",
          200: "#EBBBA1",
          300: "#DC9670",
          400: "#CC7849",
          500: "#BD5D2E", // primary
          600: "#A24A22",
          700: "#823A1B",
          800: "#612B14",
          900: "#421D0E",
        },
        // Charcoal text
        ink: {
          50: "#F5F3EF",
          100: "#E5E2DC",
          200: "#C7C2B8",
          300: "#9B958A",
          400: "#6E685D",
          500: "#4A453C",
          600: "#332F28",
          700: "#26231D",
          800: "#1C1A15",
          900: "#13110D",
        },
        // shadcn semantic tokens mapped to our palette
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
