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
          50: '#FFF4EB',
          100: '#FFE0CC',
          200: '#FF7900',
          300: '#E96800',
          400: '#D45D00',
          500: '#FF7900',
          600: '#C45100',
          700: '#9F4100',
          800: '#7A3200',
          900: '#542300',
        },
        ink: '#171C19',
        paper: '#F5F6F2',
        line: '#E3E6DF',
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
