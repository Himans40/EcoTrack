/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral scale with a faint green-grey cast, like weathered survey
        // paper. Overrides Tailwind's slate so every surface picks it up.
        slate: {
          50: '#f3f5f4', 100: '#e8ece9', 200: '#d9dfdb', 300: '#bcc6c0',
          400: '#8f9c95', 500: '#66736c', 600: '#4b5752', 700: '#37423d',
          800: '#222b27', 900: '#161d1a', 950: '#0d1311',
        },
        // Spruce — the instrument's primary accent.
        brand: {
          50: '#eef6f2', 100: '#d5e9e0', 200: '#acd3c2', 300: '#7bb69e',
          400: '#4f957c', 500: '#2f7a62', 600: '#1f5e4e', 700: '#1a4c40',
          800: '#173d34', 900: '#13322b', 950: '#0a1c18',
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
