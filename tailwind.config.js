/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#020617', // slate-950
        surface: '#0f172a',    // slate-900
        border: '#1e293b',     // slate-800
        primary: '#6366f1',    // indigo-500
        primaryHover: '#4f46e5', // indigo-600
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
