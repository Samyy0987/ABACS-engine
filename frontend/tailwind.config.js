/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          canvas: '#0c0d14',    // Main outer canvas (deep navy-black)
          base: '#0c0d14',
          sidebar: '#11121d',   // Sidebar and navigation background
          surface: '#11121d',
          card: '#161726',      // Dashboard and policy card container
          cardHover: '#1d1e31',
          inner: '#121320',     // Inner inputs, nested chips, code panels
          panel: '#11121d',
          input: '#151627',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',      // Primary purple accent
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          glow: 'rgba(124, 58, 237, 0.28)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.07)',
          subtlePurple: 'rgba(139, 92, 246, 0.15)',
          strong: 'rgba(139, 92, 246, 0.35)',
          dark: '#1e2034',
        },
        accent: {
          green: '#10b981',    // Success / Permit state
          coral: '#f43f5e',    // Deny / Alert state
          blue: '#3b82f6',     // Asset / Edit icon
          red: '#ef4444',      // Delete action icon
          amber: '#f59e0b',    // Caution / Warning
          cyan: '#06b6d4',     // Network / Environment
          purple: '#8b5cf6',   // Reference accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'purple-glow': '0 0 25px -4px rgba(124, 58, 237, 0.35)',
        'purple-glow-sm': '0 0 14px -2px rgba(124, 58, 237, 0.25)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'card-elevated': '0 8px 30px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.2)',
      }
    },
  },
  plugins: [],
}
