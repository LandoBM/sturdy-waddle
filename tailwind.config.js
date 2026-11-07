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
          50: '#FFF1EB',
          100: '#FFD9C9',
          200: '#FF5A1F',
          300: '#FF8A3D',
          400: '#E94B17',
          500: '#FF5A1F',
          600: '#C93F12',
          700: '#9F300E',
          800: '#76240B',
          900: '#4D1808',
        },
        ink: '#17191D',
        paper: '#F5F6F2',
        line: '#E4E4E7',
        dark: '#090A0C',
        darkSurface: '#17191D',
        darkElevated: '#24262B',
        darkBorder: '#303238',
        darkText: '#F5F5F5',
        darkMuted: '#A1A1AA',
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
