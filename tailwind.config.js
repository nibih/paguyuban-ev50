/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#061a38',
          800: '#0B2F64', // Transjakarta Corporate Deep Blue
          700: '#123e7e',
          600: '#1d519d'
        },
        electric: {
          teal: '#00A896',
          cyan: '#0284C7',
          light: '#38BDF8'
        }
      }
    },
  },
  plugins: [],
}
