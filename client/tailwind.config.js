/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Obsidian Flux Design System ─────────────────────────────────
        'surface':            '#131313',
        'surface-dim':        '#0e0e0e',
        'surface-low':        '#1c1b1b',
        'surface-card':       '#1a1a1a',
        'surface-high':       '#2a2a2a',
        'surface-highest':    '#353534',
        'surface-bright':     '#3a3939',
        'on-surface':         '#e5e2e1',
        'on-surface-variant': '#ebbbb4',
        // ── Primary / Brand ──────────────────────────────────────────────
        'yt-red':    '#FF0000',
        'yt-dark':   '#cc0000',
        'primary':   '#ffb4a8',
        'primary-container': '#ff5540',
        // ── Semantic ─────────────────────────────────────────────────────
        'success':  '#4edea3',
        'warning':  '#ffb95f',
        'error':    '#ffb4ab',
        'info':     '#4A90E2',
        // ── Outline ──────────────────────────────────────────────────────
        'outline':  '#b18780',
        'outline-variant': '#603e39',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '20px' }],
        'caption': ['12px', { lineHeight: '16px' }],
        'label': ['10px', { lineHeight: '12px', letterSpacing: '0.05em', fontWeight: '500' }],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '72px',
      },
      animation: {
        'pulse-red': 'pulseRed 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-up': 'fadeUp 0.5s ease forwards',
      },
      keyframes: {
        pulseRed: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,0,0,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,0,0,0)' },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      backdropBlur: { DEFAULT: '12px' },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card':  '0 2px 12px rgba(0,0,0,0.3)',
        'modal': '0 20px 60px rgba(0,0,0,0.6)',
        'red':   '0 4px 20px rgba(255,0,0,0.25)',
        'green': '0 4px 20px rgba(78,222,163,0.2)',
      },
    },
  },
  plugins: [],
}
