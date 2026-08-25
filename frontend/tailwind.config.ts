import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        muted: '#6b7280',
        canvas: '#f5f7fb',
        primary: {
          50: '#eef5ff',
          100: '#d9e8ff',
          500: '#3976e8',
          600: '#2864d8',
          700: '#2051b3',
          800: '#1b438f',
          900: '#17356f',
        },
        success: '#16835b',
        warning: '#b66810',
        danger: '#d13b4c',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 18px 60px -34px rgba(23, 32, 51, 0.3)',
        float: '0 24px 60px -28px rgba(37, 70, 130, 0.38)',
      },
      fontFamily: {
        sans: ['Segoe UI Variable', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-up': 'fade-up 450ms ease-out both' },
    },
  },
  plugins: [],
} satisfies Config;
