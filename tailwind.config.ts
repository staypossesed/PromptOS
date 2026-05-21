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
        serif: ["var(--font-bricolage)", "var(--font-geist-sans)", "ui-sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Cream / off-white surfaces
        cream: {
          50: "#FFFDF8",   // soft warm surface (#FFFDF8)
          100: "#F7F2EA",  // background cream (#F7F2EA)
          200: "#EFE7D9",
          300: "#E4D8C4",
        },
        // Warm clay — primary brand color
        clay: {
          50: "#FBF1EC",
          100: "#F5DDD0",
          200: "#EBBBA1",
          300: "#DC9670",
          400: "#CC7849",
          500: "#BD5A2C",  // primary clay (#BD5A2C)
          600: "#A84E26",  // hover clay (#A84E26)
          700: "#843E1C",
          800: "#612B14",
          900: "#421D0E",
        },
        // Charcoal ink — text
        ink: {
          50: "#F5F3EF",
          100: "#E6DDD2",  // soft border (#E6DDD2)
          200: "#C7C2B8",
          300: "#9B958A",
          400: "#6F6760",  // muted text (#6F6760)
          500: "#4A453C",
          600: "#332F28",
          700: "#26231D",
          800: "#1C1814",  // dark ink (#1C1814)
          900: "#13110D",
        },
        // Sage — success / saved states
        sage: {
          50: "#EEF3ED",
          100: "#D8E9D6",
          200: "#B3D0B0",
          300: "#8DB88A",
          400: "#7CA878",
          500: "#7C9278",  // primary sage (#7C9278)
          600: "#697F66",
          700: "#556653",
        },
        // shadcn semantic tokens
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
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
