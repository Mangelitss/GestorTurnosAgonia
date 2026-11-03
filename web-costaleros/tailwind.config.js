/** @type {import('tailwindcss').Config} */
export default {
  // Ojo: el nucleo compartido tambien lleva clases (PIEZAS, CONFLICTOS...),
  // por eso entra en el rastreo. Si se quita, los chips salen sin estilo.
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../gestor-cofrade/src/lib/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
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
          pale: '#f0d878',
        },
        crema: '#f4ead8',
      },
      fontFamily: {
        titulo: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Open Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        subir: 'subir 0.3s ease-out',
        aparecer: 'aparecer 0.4s ease-out',
      },
      keyframes: {
        subir: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        aparecer: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
