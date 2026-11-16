/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Quiet neutral greys on white. Overrides Tailwind's slate so every
        // surface in the app picks it up.
        slate: {
          50: '#fafafa', 100: '#f4f4f5', 200: '#e9e9eb', 300: '#d6d6da',
          400: '#a3a3aa', 500: '#74747c', 600: '#55555c', 700: '#3f3f45',
          800: '#28282c', 900: '#18181b', 950: '#0f0f11',
        },
        // Muted sage — used sparingly for active states and small accents.
        brand: {
          50: '#f4f8f6', 100: '#e6efea', 200: '#cbdcd3', 300: '#a6c3b4',
          400: '#7aa48f', 500: '#578873', 600: '#44705e', 700: '#385c4d',
          800: '#2e4a3f', 900: '#263d34', 950: '#13211c',
        },
        // Estuary — reserved for anything water.
        water: {
          50: '#eff5fa', 100: '#d9e8f3', 200: '#b5d1e7', 300: '#86b3d6',
          400: '#5791c0', 500: '#3a76a8', 600: '#2f6f9f', 700: '#285a82',
          800: '#244b6b', 900: '#213f59', 950: '#15283a',
        },
      },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '0.625rem',
      },
    },
  },
  plugins: [],
}
