/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {DEFAULT: '#7A2232', dark: '#5E1826', soft: '#F6E9EA'},
        canvas: '#F4EFE9',
        ink: {DEFAULT: '#2A2220', soft: '#6F6560', faint: '#9C918B'},
        line: '#E6DED6',
        gold: '#B98A3E',
        ok: '#2E7D4F',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {page: '1200px'},
    },
  },
  plugins: [],
};
