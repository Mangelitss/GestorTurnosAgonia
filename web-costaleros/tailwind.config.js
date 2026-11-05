/** @type {import('tailwindcss').Config} */

// Movimiento solemne: lento, sin rebotes, como el paso de un trono.
const SOLEMNE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

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
        texto: ['EB Garamond', 'Georgia', 'serif'],
        sans: ['Open Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: { solemne: SOLEMNE },
      animation: {
        subir: `subir 0.8s ${SOLEMNE} both`,
        aparecer: 'aparecer 0.9s ease-out both',
        trazar: `trazar 1.1s ${SOLEMNE} both`,
        descender: `descender 1.4s ${SOLEMNE} both`,
        vela: 'vela 5s ease-in-out infinite',
        resplandor: 'resplandor 1.6s ease-out 0.25s both',
      },
      keyframes: {
        subir: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        aparecer: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        trazar: {
          '0%': { transform: 'scaleX(0)', opacity: '0' },
          '100%': { transform: 'scaleX(1)', opacity: '1' },
        },
        descender: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        vela: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '38%': { opacity: '0.85', transform: 'scale(1.06)' },
          '62%': { opacity: '0.65', transform: 'scale(0.98)' },
        },
        resplandor: {
          '0%': { boxShadow: '0 0 0 0 rgba(232, 208, 140, 0.75)' },
          '100%': { boxShadow: '0 0 0 12px rgba(232, 208, 140, 0)' },
        },
      },
    },
  },
  plugins: [],
}
