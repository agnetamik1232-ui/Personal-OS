import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Color tokens (OKLCH via CSS vars) ───────────────────────────────
      colors: {
        // Neutral ink scale
        ink: {
          0: "oklch(var(--ink-0) / <alpha-value>)",
          1: "oklch(var(--ink-1) / <alpha-value>)",
          2: "oklch(var(--ink-2) / <alpha-value>)",
          3: "oklch(var(--ink-3) / <alpha-value>)",
          4: "oklch(var(--ink-4) / <alpha-value>)",
        },
        // Sidebar surface
        sidebar: {
          DEFAULT: "oklch(var(--sidebar) / <alpha-value>)",
          border: "oklch(var(--sidebar-border) / <alpha-value>)",
          text: "oklch(var(--sidebar-text) / <alpha-value>)",
          muted: "oklch(var(--sidebar-muted) / <alpha-value>)",
          active: "oklch(var(--sidebar-active) / <alpha-value>)",
        },
        // Accent
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          muted: "oklch(var(--accent-muted) / <alpha-value>)",
          subtle: "oklch(var(--accent-subtle) / <alpha-value>)",
        },
        // Semantic
        ok: "oklch(var(--ok) / <alpha-value>)",
        warn: "oklch(var(--warn) / <alpha-value>)",
        danger: "oklch(var(--danger) / <alpha-value>)",
        // Surface / border shortcuts
        surface: {
          DEFAULT: "oklch(var(--ink-1) / <alpha-value>)",
          raised: "oklch(var(--ink-0) / <alpha-value>)",
        },
        border: "oklch(var(--ink-2) / <alpha-value>)",
      },

      // ─── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        none: "0",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "32px",
        full: "9999px",
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
        "5xl": ["3rem", { lineHeight: "3.5rem" }],
        "6xl": ["3.75rem", { lineHeight: "4.25rem" }],
      },

      // ─── Spacing ──────────────────────────────────────────────────────────
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        sidebar: "var(--sidebar-w)",
        header: "var(--header-h)",
      },

      // ─── Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        none: "none",
        xs: "0 1px 2px 0 oklch(0 0 0 / 0.04)",
        sm: "0 1px 3px 0 oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.04)",
        md: "0 4px 6px -1px oklch(0 0 0 / 0.06), 0 2px 4px -2px oklch(0 0 0 / 0.04)",
        lg: "0 8px 16px -4px oklch(0 0 0 / 0.08), 0 2px 6px -2px oklch(0 0 0 / 0.04)",
        xl: "0 16px 32px -8px oklch(0 0 0 / 0.1), 0 4px 12px -4px oklch(0 0 0 / 0.05)",
        card: "0 1px 4px 0 oklch(0 0 0 / 0.05), 0 0 0 1px oklch(var(--ink-2) / 0.6)",
        panel: "0 2px 8px -2px oklch(0 0 0 / 0.07), 0 0 0 1px oklch(var(--ink-2) / 0.5)",
        "inner-sm": "inset 0 1px 2px 0 oklch(0 0 0 / 0.05)",
        "accent-glow": "0 0 20px -4px oklch(var(--accent) / 0.25)",
      },

      // ─── Transitions ──────────────────────────────────────────────────────
      transitionDuration: {
        "75": "75ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
        "500": "500ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-expo": "cubic-bezier(0.7, 0, 0.84, 0)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // ─── Backdrop blur ────────────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },

      // ─── Grid ─────────────────────────────────────────────────────────────
      gridTemplateColumns: {
        "dashboard-2": "repeat(2, minmax(0, 1fr))",
        "dashboard-3": "repeat(3, minmax(0, 1fr))",
        "dashboard-4": "repeat(4, minmax(0, 1fr))",
        "dashboard-auto": "repeat(auto-fill, minmax(280px, 1fr))",
        "kpi-4": "repeat(4, minmax(160px, 1fr))",
      },

      // ─── Animation ────────────────────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        pulse: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
