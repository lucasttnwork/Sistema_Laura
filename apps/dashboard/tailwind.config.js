import defaultTheme from 'tailwindcss/defaultTheme'

const spacing = Object.fromEntries(
  Array.from({ length: 97 }, (_, index) => [index.toString(), `${index / 4}rem`])
)
spacing.px = '1px'
spacing['0.5'] = '0.125rem'
spacing['1.5'] = '0.375rem'
spacing['2.5'] = '0.625rem'
spacing['3.5'] = '0.875rem'

const colors = {
  background: '#0b0f14',
  surface: '#111821',
  foreground: '#f8fafc',
  primary: '#7c4dff',
  'primary-foreground': '#08061b',
  muted: '#1e2835',
  'muted-foreground': '#94a3b8',
  positive: '#22c55e',
  warning: '#f97316',
  danger: '#ef4444',
  border: '#1f2937',
  outline: '#334155',
}

const fontSize = {
  xs: ['0.75rem', { lineHeight: '1.25rem' }],
  sm: ['0.875rem', { lineHeight: '1.375rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.875rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
}

const boxShadow = {
  soft: '0 1px 2px 0 rgba(15, 23, 42, 0.25)',
  medium: '0 4px 6px -1px rgba(15, 23, 42, 0.35)',
  strong: '0 10px 15px -3px rgba(15, 23, 42, 0.45)',
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      spacing,
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Lexend', ...defaultTheme.fontFamily.sans],
      },
      fontSize,
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        full: '9999px',
      },
      boxShadow,
      zIndex: {
        overlay: '40',
        modal: '50',
      },
    },
  },
  plugins: [],
}
