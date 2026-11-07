// =============================================================
//  COMPONENTES REUTILIZABLES
// =============================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// --- Cabecera de pagina ---
export function PageHeader({ titulo, subtitulo, icono, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 animate-subir">
      <div>
        <h1 className="font-serif text-[1.7rem] leading-tight font-bold text-morado flex items-center gap-2.5">
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
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-aparecer">
      <div className="w-9 h-9 border-[3px] border-slate-200 border-t-morado rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">{texto}</p>
    </div>
  )
}

// --- Estado vacio ---
export function Vacio({ icono = '📭', titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-subir">
      <div className="text-5xl mb-4 opacity-40">{icono}</div>
      <h3 className="font-serif text-lg font-bold text-slate-700">{titulo}</h3>
      {texto && <p className="text-slate-500 text-sm mt-1.5 max-w-md">{texto}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

// Mantiene algo en pantalla el rato justo para animar su salida
const SALIDA_MS = 220
function useSalida(visible) {
  const [montado, setMontado] = useState(visible)
  useEffect(() => {
    if (visible) { setMontado(true); return undefined }
    const t = setTimeout(() => setMontado(false), SALIDA_MS)
    return () => clearTimeout(t)
  }, [visible])
  return { montado: visible || montado, saliendo: !visible && montado }
}

// --- Modal ---
export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  const { montado, saliendo } = useSalida(!!abierto)

  // Mientras sale, se sigue viendo lo ultimo que tenia dentro
  const ultimo = useRef({ titulo, children })
  if (abierto) ultimo.current = { titulo, children }

  useEffect(() => {
    if (!abierto) return undefined
    const onEsc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [abierto, onCerrar])

  if (!montado) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm
                  ${saliendo ? 'animate-desaparecer pointer-events-none' : 'animate-aparecer'}`}
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-2xl shadow-2xl w-full ${ancho} max-h-[90vh] flex flex-col
                    ${saliendo ? 'animate-hoja-sale' : 'animate-hoja-entra'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-serif text-lg font-bold text-morado">{ultimo.current.titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none w-8 h-8
                       flex items-center justify-center rounded-lg hover:bg-slate-100 transition
                       hover:rotate-90 duration-300"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-6">{ultimo.current.children}</div>
      </div>
    </div>,
    document.body
  )
}

// Numero que sube hasta su valor al aparecer
function useCuenta(valor, ms = 800) {
  const [n, setN] = useState(typeof valor === 'number' ? 0 : valor)
  useEffect(() => {
    if (typeof valor !== 'number') { setN(valor); return undefined }
    const inicio = performance.now()
    let id
    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / ms)
      setN(Math.round(valor * (1 - (1 - p) ** 3)))
      if (p < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [valor, ms])
  return n
}

// --- Tarjeta de estadistica ---
export function StatCard({ icono, valor, etiqueta, color = 'morado', letra = false }) {
  const mostrado = useCuenta(valor)
  const colores = {
    morado: 'bg-morado/10 text-morado',
    oro: 'bg-oro/20 text-oro-dark',
    verde: 'bg-emerald-100 text-emerald-700',
    azul: 'bg-sky-100 text-sky-700',
    rojo: 'bg-red-100 text-red-700',
  }
  return (
    <div className="card card-viva p-5 flex items-center gap-4 group">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colores[color]}
                    transition-transform duration-300 ease-posarse group-hover:scale-110
                    ${letra ? 'font-serif text-2xl font-bold' : 'text-xl'}`}
      >
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 leading-none tabular-nums">{mostrado}</p>
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
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start gap-2.5 animate-subir ${estilos[tipo]}`}>
      <span className="leading-none shrink-0">{iconos[tipo]}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// --- Toast (notificacion flotante) ---
export function Toast({ mensaje, tipo = 'exito', onCerrar }) {
  const { montado, saliendo } = useSalida(!!mensaje)
  const ultimo = useRef({ mensaje, tipo })
  if (mensaje) ultimo.current = { mensaje, tipo }

  useEffect(() => {
    if (!mensaje) return undefined
    const t = setTimeout(onCerrar, 3000)
    return () => clearTimeout(t)
  }, [mensaje, onCerrar])

  if (!montado) return null

  const estilos = {
    exito: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-morado',
  }

  return createPortal(
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-[60] ${saliendo ? 'animate-aviso-sale' : 'animate-aviso-entra'}`}
    >
      <div className={`${estilos[ultimo.current.tipo] || estilos.info} text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold`}>
        {ultimo.current.mensaje}
      </div>
    </div>,
    document.body
  )
}

// --- Pestañas con la marca blanca que se desliza ---
//   opciones: [{ id, label }]
export function Segmentado({ opciones, valor, onCambiar, className = '' }) {
  const caja = useRef(null)
  const [marca, setMarca] = useState(null)

  useLayoutEffect(() => {
    const medir = () => {
      const el = caja.current?.querySelector('[aria-pressed="true"]')
      setMarca(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    medir()
    if (typeof ResizeObserver === 'undefined' || !caja.current) return undefined
    const obs = new ResizeObserver(medir)
    obs.observe(caja.current)
    return () => obs.disconnect()
  }, [valor, opciones.length])

  return (
    <div ref={caja} className={`segmentado ${className}`}>
      {marca && (
        <span
          className="segmentado-marca"
          style={{ width: marca.w, transform: `translateX(${marca.x}px)` }}
          aria-hidden="true"
        />
      )}
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => onCambiar(o.id)}
          className="segmentado-pieza"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
