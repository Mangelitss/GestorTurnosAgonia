import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// =============================================================
//  El portal publico es una aplicacion aparte, pero NO duplica
//  la logica del panel: los modulos de calculo (constantes,
//  cuadrante, conflictos, hombros) se leen directamente de
//  gestor-cofrade/src/lib a traves del alias @nucleo.
//
//  Asi solo hay una version de cada algoritmo. Si cambia el
//  reparto de turnos en el panel, el portal lo refleja solo.
// =============================================================

const nucleo = fileURLToPath(new URL('../gestor-cofrade/src/lib', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@nucleo': nucleo } },
  server: {
    port: 5174,
    open: true,
    // Permite servir en desarrollo los ficheros de la carpeta hermana
    fs: { allow: ['..'] },
  },
  build: { outDir: 'dist' },
})
