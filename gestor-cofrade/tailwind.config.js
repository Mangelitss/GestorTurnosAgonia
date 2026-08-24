/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Mayordomia Ntro. Padre Jesus Nazareno
        morado: {
          DEFAULT: '#4F1243',
          light: '#7a1b67',
          dark: '#2a0a23',
          deep: '#1a0514',
          black: '#0c0209',
        },
        oro: {
          DEFAULT: '#D1B514',
          light: '#e8d08c',
          dark: '#97820B',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        subir: 'subir 0.25s ease-out',
      },
      keyframes: {
        subir: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
