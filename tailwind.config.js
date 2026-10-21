/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Wired to the two families index.html already loads. Without this,
        // `font-mono` silently fell back to the system stack and JetBrains Mono
        // was downloaded on every page load but never rendered.
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        // The teal accent needs no token: Tailwind's native teal-* scale already
        // covers it and is used throughout (47 usages).
        navy: {
          900: '#061a38',
          800: '#0B2F64', // DAMRI corporate deep blue
          700: '#123e7e',
          600: '#1d519d'
        }
      }
    },
  },
  plugins: [],
}
