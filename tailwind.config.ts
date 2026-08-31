import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf5',
          100: '#d8f5e3',
          200: '#b6e8c8',
          300: '#8fd9a9',
          400: '#62c985',
          500: '#44b66d',
          600: '#2d8b57',
          700: '#266d46',
          800: '#1f5539',
          900: '#1d4731',
        },
      },
      boxShadow: {
        soft: '0 12px 28px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
