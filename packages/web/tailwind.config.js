/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from logo
        brand: {
          navy: '#1e3a5f',
          red: '#dc2626',
          gold: '#f59e0b',
          blue: '#2563eb',
        },
        // Civic theme colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a5f', // Updated to brand navy
        },
        republican: {
          DEFAULT: '#dc2626',
          light: '#fecaca',
        },
        democrat: {
          DEFAULT: '#2563eb',
          light: '#bfdbfe',
        },
        independent: {
          DEFAULT: '#6b7280',
          light: '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
};
