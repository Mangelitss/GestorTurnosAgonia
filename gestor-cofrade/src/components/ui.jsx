// =============================================================
//  COMPONENTES REUTILIZABLES
// =============================================================

import { useEffect } from 'react'

// --- Cabecera de pagina ---
export function PageHeader({ titulo, subtitulo, icono, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-morado flex items-center gap-2.5">
          {icono && <span>{icono}</span>}
          {titulo}
        </h1>
        {subtitulo && <p className="text-slate-500 text-sm mt-1">{subtitulo}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

// --- Contenedor de pagina ---
export function Page({ children }) {
  return <div className="p-8 max-w-[1600px] mx-auto">{children}</div>
}

// --- Spinner de carga ---
export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-9 h-9 border-[3px] border-slate-200 border-t-morado rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">{texto}</p>
    </div>
  )
}

// --- Estado vacio ---
export function Vacio({ icono = '📭', titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4 opacity-40">{icono}</div>
      <h3 className="font-serif text-lg font-bold text-slate-700">{titulo}</h3>
      {texto && <p className="text-slate-500 text-sm mt-1.5 max-w-md">{texto}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

// --- Modal ---
export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return
    const onEsc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${ancho} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-serif text-lg font-bold text-morado">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none w-8 h-8
                       flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

// --- Tarjeta de estadistica ---
export function StatCard({ icono, valor, etiqueta, color = 'morado', letra = false }) {
  const colores = {
    morado: 'bg-morado/10 text-morado',
    oro: 'bg-oro/20 text-oro-dark',
    verde: 'bg-emerald-100 text-emerald-700',
    azul: 'bg-sky-100 text-sky-700',
    rojo: 'bg-red-100 text-red-700',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colores[color]}
                    ${letra ? 'font-serif text-2xl font-bold' : 'text-xl'}`}
      >
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 leading-none">{valor}</p>
        <p className="text-slate-500 text-xs mt-1.5 truncate">{etiqueta}</p>
      </div>
    </div>
  )
}

// --- Aviso / alerta ---
export function Alerta({ tipo = 'info', children }) {
  const estilos = {
    info: 'bg-sky-50 border-sky-200 text-sky-800',
    exito: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    aviso: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }
  const iconos = { info: 'ℹ️', exito: '✓', aviso: '⚠️', error: '⛔' }
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm flex items-start gap-2.5 ${estilos[tipo]}`}>
      <span className="leading-none shrink-0">{iconos[tipo]}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// --- Toast (notificacion flotante) ---
export function Toast({ mensaje, tipo = 'exito', onCerrar }) {
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(onCerrar, 3000)
    return () => clearTimeout(t)
  }, [mensaje, onCerrar])

  if (!mensaje) return null

  const estilos = {
    exito: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-morado',
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-subir">
      <div className={`${estilos[tipo]} text-white px-5 py-3 rounded-lg shadow-xl text-sm font-semibold`}>
        {mensaje}
      </div>
    </div>
  )
}
