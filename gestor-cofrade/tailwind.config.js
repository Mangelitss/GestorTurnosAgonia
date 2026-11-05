/** @type {import('tailwindcss').Config} */

const SISTEMA = [
  '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter',
  'Segoe UI Variable Text', 'Segoe UI', 'system-ui', 'sans-serif',
]
const TITULARES = [
  '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter',
  'Segoe UI Variable Display', 'Segoe UI', 'system-ui', 'sans-serif',
]

// Curva de movimiento del panel, al estilo de las apps de Apple:
// arranca rapido y se posa despacio, sin rebotes llamativos.
const POSARSE = 'cubic-bezier(0.32, 0.72, 0, 1)'

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
        // Grises neutros de sistema. Sustituyen a los slate azulados
        // de Tailwind en toda la aplicacion.
        slate: {
          50: '#f5f5f7',
          100: '#eeeef0',
          200: '#e3e3e6',
          300: '#d1d1d6',
          400: '#8e8e93',
          500: '#6e6e73',
          600: '#515154',
          700: '#3a3a3c',
          800: '#1d1d1f',
          900: '#111113',
        },
      },
      fontFamily: {
        display: TITULARES,
        sans: SISTEMA,
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        tarjeta: '0 0 0 0.5px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
        elevada: '0 0 0 0.5px rgba(0,0,0,0.07), 0 8px 24px rgba(42,10,35,0.10)',
        hoja: '0 0 0 0.5px rgba(0,0,0,0.10), 0 24px 70px rgba(26,5,20,0.32)',
      },
      transitionTimingFunction: { posarse: POSARSE },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        subir: `subir 0.42s ${POSARSE} both`,
        aparecer: 'aparecer 0.24s ease-out both',
        desaparecer: 'desaparecer 0.2s ease-in both',
        'hoja-entra': `hojaEntra 0.42s ${POSARSE} both`,
        'hoja-sale': 'hojaSale 0.2s ease-in both',
        'aviso-entra': `avisoEntra 0.46s ${POSARSE} both`,
        'aviso-sale': 'avisoSale 0.2s ease-in both',
      },
      keyframes: {
        subir: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        aparecer: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        desaparecer: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        hojaEntra: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        hojaSale: {
          '0%': { opacity: '1', transform: 'none' },
          '100%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
        },
        avisoEntra: {
          '0%': { opacity: '0', transform: 'translate(-50%, 16px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        avisoSale: {
          '0%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, 8px) scale(0.98)' },
        },
      },
    },
  },
  plugins: [],
}
