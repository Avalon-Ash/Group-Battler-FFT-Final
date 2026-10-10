/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./data/**/*.{js,ts,jsx,tsx}",
    "./engine/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'rgb(var(--token-surface-base) / <alpha-value>)',
          panel: 'rgb(var(--token-surface-panel) / <alpha-value>)',
          slot: 'rgb(var(--token-surface-slot) / <alpha-value>)',
          subtle: 'rgb(var(--token-surface-subtle) / <alpha-value>)',
          dark: 'rgb(var(--token-surface-dark) / <alpha-value>)',
          card: 'rgb(var(--token-surface-card) / <alpha-value>)',
        },
        line: {
          subtle: 'rgb(var(--token-line-subtle) / <alpha-value>)',
          muted: 'rgb(var(--token-line-muted) / <alpha-value>)',
          default: 'rgb(var(--token-line-default) / <alpha-value>)',
          accent: 'rgb(var(--token-line-accent) / <alpha-value>)',
          danger: 'rgb(var(--token-line-danger) / <alpha-value>)',
          warn: 'rgb(var(--token-line-warn) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--token-text-primary) / <alpha-value>)',
          base: 'rgb(var(--token-text-base) / <alpha-value>)',
          muted: 'rgb(var(--token-text-muted) / <alpha-value>)',
          faint: 'rgb(var(--token-text-faint) / <alpha-value>)',
          accent: 'rgb(var(--token-text-accent) / <alpha-value>)',
          danger: 'rgb(var(--token-text-danger) / <alpha-value>)',
          warn: 'rgb(var(--token-text-warn) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--token-accent) / <alpha-value>)',
          hover: 'rgb(var(--token-accent-hover) / <alpha-value>)',
          active: 'rgb(var(--token-accent-active) / <alpha-value>)',
          subtle: 'rgb(var(--token-accent-subtle) / <alpha-value>)',
          faint: 'rgb(var(--token-accent-faint) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--token-danger) / <alpha-value>)',
          hover: 'rgb(var(--token-danger-hover) / <alpha-value>)',
          active: 'rgb(var(--token-danger-active) / <alpha-value>)',
          subtle: 'rgb(var(--token-danger-subtle) / <alpha-value>)',
          faint: 'rgb(var(--token-danger-faint) / <alpha-value>)',
          deep: 'rgb(var(--token-danger-deep) / <alpha-value>)',
          dark: 'rgb(var(--token-danger-dark) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'rgb(var(--token-warn) / <alpha-value>)',
          hover: 'rgb(var(--token-warn-hover) / <alpha-value>)',
          active: 'rgb(var(--token-warn-active) / <alpha-value>)',
          subtle: 'rgb(var(--token-warn-subtle) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--token-success) / <alpha-value>)',
          hover: 'rgb(var(--token-success-hover) / <alpha-value>)',
        },
        team: {
          blue: {
            primary: 'rgb(var(--token-team-blue-primary) / <alpha-value>)',
            secondary: 'rgb(var(--token-team-blue-secondary) / <alpha-value>)',
            armorLight: 'rgb(var(--token-team-blue-armor-light) / <alpha-value>)',
          },
          red: {
            primary: 'rgb(var(--token-team-red-primary) / <alpha-value>)',
            secondary: 'rgb(var(--token-team-red-secondary) / <alpha-value>)',
            armorLight: 'rgb(var(--token-team-red-armor-light) / <alpha-value>)',
          },
        },
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'slide-left': 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        slideLeft: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
