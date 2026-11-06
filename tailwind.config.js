/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './native/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#fbffe8',
          100: '#efffae',
          200: '#d9ff5a',
          300: '#c5ed3c',
          400: '#acd324',
          500: '#d9ff5a',
          600: '#718d14',
          700: '#526b0d',
          800: '#3f520e',
          900: '#303e12',
        },
        ink: '#151712',
        paper: '#f4f5ef',
        line: '#dedfd7',
        brandBlue: '#5c78ff',
        brandPink: '#ff8fa4',
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        card: '21px',
      },
      boxShadow: {
        card: '0 12px 30px rgba(21, 23, 18, 0.08)',
      },
    },
  },
  plugins: [],
}
