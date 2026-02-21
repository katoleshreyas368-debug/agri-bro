/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Poppins"', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#2e7d32',
          'green-dark': '#1b5e20',
          'green-light': '#e8f5e9',
          lime: '#7ecb44',
          gold: '#f9a825',
          surface: '#f8faf5',
        },
      },
    },
  },
  plugins: [],
};
