/** @type {import('tailwindcss').Config} */

// Theme-aware colour helper. Colours are stored as raw RGB channels so that
// Tailwind opacity modifiers (e.g. `bg-dark-raised/60`) work correctly.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary design tokens (swap automatically under `html.light`)
        dark: {
          bg: token('--dark-bg'),
          surface: token('--dark-surface'),
          raised: token('--dark-raised'),
          border: token('--dark-border'),
          text: token('--dark-text'),
          muted: token('--dark-muted')
        },
        // Backwards-compatible aliases used by older pages
        brand: {
          dark: token('--dark-bg'),
          surface: token('--dark-surface'),
          raised: token('--dark-raised'),
          border: token('--dark-border'),
          text: token('--dark-text'),
          muted: token('--dark-muted'),
          cyan: '#22D3EE',
          'cyan-dark': '#0891B2',
          indigo: '#6366F1'
        },
        // Neutral scale is remapped onto the theme tokens so legacy
        // `slate-*` utilities remain legible in both themes.
        slate: {
          50: token('--dark-text'),
          100: token('--dark-text'),
          200: token('--dark-text'),
          300: token('--dark-text'),
          400: token('--dark-muted'),
          500: token('--dark-muted'),
          600: token('--dark-muted'),
          700: token('--dark-border'),
          800: token('--dark-raised'),
          900: token('--dark-surface'),
          950: token('--dark-bg')
        },
        accent: {
          cyan: '#22D3EE',
          'cyan-dark': '#0891B2',
          indigo: '#6366F1',
          success: '#22C55E',
          'success-dark': '#16A34A'
        },
        severity: {
          critical: '#F43F5E',
          high: '#F59E0B',
          medium: '#3B82F6',
          low: '#64748B',
          info: '#94A3B8'
        },
        status: {
          open: '#FB7185',
          inProgress: '#FBBF24',
          resolved: '#34D399',
          falsePositive: '#9CA3AF',
          acceptedRisk: '#C084FC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      borderRadius: {
        card: '14px',
        control: '9px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.28), 0 12px 32px -18px rgba(0,0,0,0.65)',
        raised: '0 18px 48px -20px rgba(0,0,0,0.75)',
        glow: '0 0 0 1px rgba(34,211,238,0.28), 0 8px 30px -12px rgba(34,211,238,0.45)',
        'glow-sm': '0 0 20px -6px rgba(34,211,238,0.5)'
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)',
        'hero-glow':
          'radial-gradient(1200px circle at 8% -10%, rgba(34,211,238,0.14), transparent 45%), radial-gradient(900px circle at 100% 0%, rgba(99,102,241,0.14), transparent 45%)'
      },
      backgroundSize: {
        grid: '32px 32px'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' }
        }
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'fade-up': 'fade-up 220ms ease-out both',
        'scale-in': 'scale-in 160ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
};
