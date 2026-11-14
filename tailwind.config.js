/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edfcf4', 100: '#d4f7e3', 200: '#acedca', 300: '#76ddaa',
          400: '#40c586', 500: '#1caa6b', 600: '#108855',
          700: '#0d6d46', 800: '#0e5639', 900: '#0d4731', 950: '#04281b',
        },
        water: {
          50: '#eff8ff', 100: '#dbeefe', 200: '#bfe2fe', 300: '#93cffd',
          400: '#60b3fa', 500: '#3b94f6', 600: '#2576eb', 700: '#1d5fd8',
          800: '#1e4daf', 900: '#1e448a', 950: '#172b54',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
