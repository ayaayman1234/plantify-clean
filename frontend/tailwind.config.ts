import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        /** ===== PLANTIFY NATURE-TECH DESIGN SYSTEM ===== */
        /** Accent Colors — Lime Green as primary */
        lime: {
          50:  "#f8fdf3",
          100: "#f2fbea",
          200: "#e5f7d5",
          300: "#d4f0b8",
          400: "#c8e43b",
          500: "#059967",
          600: "#a3c228",
          700: "#84a321",
          800: "#6b841e",
          900: "#58701c",
          950: "#30400b",
          neon: "#c8e43b", // Neon Bloom reference
          glow: "rgba(200, 228, 59, 0.4)" // Glow effect
        },
        /** Light Mode Palette */
        light: {
          bg: "#F9FAFB",
          text: "#1A1A1A",
          card: "#FFFFFF",
          border: "#E5E7EB",
          secondary: "#F3F4F6"
        },
        /** Dark Mode Palette */
        dark: {
          bg: "#0F0F0F",
          text: "#E2E8F0",
          card: "#1A1A1A",
          border: "#2D2D2D",
          secondary: "#262626"
        },
        // Light mode defaults
        "plantify-bg": "light-dark(#F9FAFB, #0F0F0F)",
        "plantify-text": "light-dark(#1A1A1A, #E2E8F0)",
        "plantify-card": "light-dark(#FFFFFF, #1A1A1A)",
        "plantify-border": "light-dark(#E5E7EB, #2D2D2D)",
        "plantify-secondary": "light-dark(#F3F4F6, #262626)",
        
        // Semantic colors
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)"
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)"
        },
        foreground: "light-dark(#1A1A1A, #E2E8F0)",
        background: "light-dark(#F9FAFB, #0F0F0F)",
        card: {
          DEFAULT: "light-dark(#FFFFFF, #1A1A1A)",
          bg: "var(--card-bg)",
          border: "var(--card-border)"
        },
        border: "light-dark(#E5E7EB, #2D2D2D)",
        muted: "light-dark(#9CA3AF, #6B7280)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)"
        },
        
        // Success, warning, error
        success: "#22c55e",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6"
      },
      
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        serif: ["var(--font-sora)", "system-ui", "sans-serif"],
        arabic: ["var(--font-plex-arabic)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"]
      },
      
      spacing: {
        "13": "3.25rem",
        "15": "3.75rem"
      },
      
      borderWidth: {
        "0.5": "0.5px"
      },
      
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem"
      },
      
      boxShadow: {
        // Light mode shadows
        "sm-light": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "light": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "md-light": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "lg-light": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        
        // Dark mode shadows (glassmorphism)
        "glass": "inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.6)",
        "glass-sm": "inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.4)",
        
        // Lime glow effects
        "lime": "0 0 20px rgba(200, 228, 59, 0.3)",
        "lime-md": "0 0 30px rgba(200, 228, 59, 0.4)",
        "lime-lg": "0 0 40px rgba(200, 228, 59, 0.5)",
        "lime-inner": "inset 0 0 20px rgba(200, 228, 59, 0.1)"
      },
      
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        "stagger-children": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-lime": {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(200, 228, 59, 0.3), inset 0 0 20px rgba(200, 228, 59, 0.05)"
          },
          "50%": {
            boxShadow: "0 0 40px rgba(200, 228, 59, 0.5), inset 0 0 30px rgba(200, 228, 59, 0.15)"
          }
        },
        "sonar": {
          "0%": {
            opacity: "1",
            transform: "scale(1)"
          },
          "100%": {
            opacity: "0",
            transform: "scale(2.5)"
          }
        },
        "glow-pulse": {
          "0%, 100%": {
            opacity: "0.5"
          },
          "50%": {
            opacity: "1"
          }
        },
        "theme-switch": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        }
      },
      
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "pulse-lime": "pulse-lime 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "sonar": "sonar 1.5s ease-out forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "theme-switch": "theme-switch 0.3s ease-out"
      },
      
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "500": "500ms"
      },
      
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px"
      }
    }
  },
  plugins: []
};

export default config;
