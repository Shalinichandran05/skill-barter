/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand Palette ──────────────────────────────────
        maroon: {
          50:  '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d7',
          300: '#f4a8b5',
          400: '#ec7488',
          500: '#e04263',
          600: '#cc2247',
          700: '#ac1538',
          800: '#8f1432',
          900: '#7a132f',
          950: '#6b0f1a',  // primary brand colour
        },
        surface: {
          DEFAULT: '#0f0f0f',
          50:  '#1a1a1a',
          100: '#141414',
          200: '#111111',
          300: '#0f0f0f',
          400: '#0a0a0a',
        },
      },
      fontFamily: {
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'radial-maroon': 'radial-gradient(ellipse at 20% 20%, rgba(107,15,26,0.25) 0%, transparent 60%)',
        'mesh-dark':     'radial-gradient(at 80% 0%, rgba(107,15,26,0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(107,15,26,0.08) 0px, transparent 50%)',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease forwards',
        'slide-up':     'slideUp 0.4s ease forwards',
        'pulse-maroon': 'pulseMaroon 2s ease-in-out infinite',
        'shimmer':      'shimmer 1.5s infinite linear',
      },
      keyframes: {
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseMaroon:  { '0%,100%': { boxShadow: '0 0 0 0 rgba(107,15,26,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(107,15,26,0)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'glow-maroon': '0 0 20px rgba(107,15,26,0.5)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover':  '0 8px 40px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
