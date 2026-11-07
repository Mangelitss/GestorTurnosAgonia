/** @type {import('tailwindcss').Config} */

const POSARSE = 'cubic-bezier(0.22, 0.75, 0.2, 1)'

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
      boxShadow: {
        suave: '0 1px 2px rgba(42,10,35,0.04), 0 2px 8px rgba(42,10,35,0.05)',
        elevada: '0 4px 10px rgba(42,10,35,0.06), 0 12px 28px rgba(42,10,35,0.12)',
      },
      transitionTimingFunction: { posarse: POSARSE },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // "backwards": al terminar no queda ningun transform puesto
        subir: `subir 0.45s ${POSARSE} backwards`,
        aparecer: 'aparecer 0.3s ease-out backwards',
        desaparecer: 'desaparecer 0.22s ease-in both',
        'hoja-entra': `hojaEntra 0.42s ${POSARSE} backwards`,
        'hoja-sale': 'hojaSale 0.22s ease-in both',
        'aviso-entra': `avisoEntra 0.45s ${POSARSE} both`,
        'aviso-sale': 'avisoSale 0.22s ease-in both',
      },
      keyframes: {
        subir: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        aparecer: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        desaparecer: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        hojaEntra: {
          '0%': { opacity: '0', transform: 'translateY(22px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        hojaSale: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
        },
        avisoEntra: {
          '0%': { opacity: '0', transform: 'translate(-50%, 20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
        },
        avisoSale: {
          '0%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, 10px) scale(0.97)' },
        },
      },
    },
  },
  plugins: [],
}
