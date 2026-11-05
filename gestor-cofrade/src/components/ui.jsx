// =============================================================
//  COMPONENTES REUTILIZABLES
// =============================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icono, esLetra } from './Iconos'

// --- Cabecera de pagina: titulo grande, sin adornos ---
export function PageHeader({ titulo, subtitulo, children }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
      <div className="min-w-0">
        <h1 className="font-display text-[32px] leading-[1.12] font-bold tracking-[-0.022em] text-slate-800">
          {titulo}
        </h1>
        {subtitulo && <p className="text-slate-500 text-[15px] mt-1.5">{subtitulo}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}

// --- Contenedor de pagina ---
export function Page({ children }) {
  return <div className="px-8 pb-14 pt-1 max-w-[1500px] mx-auto">{children}</div>
}

// --- Indicador de actividad: las aspas que se apagan en corro ---
export function Aspas({ tam = 26, className = 'text-slate-500' }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="11" y="2.5" width="2" height="5.5" rx="1"
          fill="currentColor"
          transform={`rotate(${i * 45} 12 12)`}
          opacity="0.15"
        >
          <animate
            attributeName="opacity"
            values="1;0.15"
            dur="0.9s"
            begin={`${(i * 0.9) / 8}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
    </svg>
  )
}

// --- Spinner de carga ---
export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 animate-aparecer">
      <Aspas />
      <p className="text-slate-500 text-[13px]">{texto}</p>
    </div>
  )
}

// --- Estado vacio ---
export function Vacio({ icono = '📭', titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-subir">
      <div className="w-14 h-14 rounded-2xl bg-morado/[0.07] text-morado flex items-center justify-center mb-4">
        <Icono e={icono} tam={26} grosor={1.5} />
      </div>
      <h3 className="font-display text-[17px] font-semibold text-slate-800">{titulo}</h3>
      {texto && <p className="text-slate-500 text-sm mt-1.5 max-w-md leading-relaxed">{texto}</p>}
      {children && <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">{children}</div>}
    </div>
  )
}

// Mantiene algo en pantalla el rato justo para animar su salida
const SALIDA_MS = 200
function useSalida(visible) {
  const [montado, setMontado] = useState(visible)
  useEffect(() => {
    if (visible) { setMontado(true); return }
    const t = setTimeout(() => setMontado(false), SALIDA_MS)
    return () => clearTimeout(t)
  }, [visible])
  return { montado: visible || montado, saliendo: !visible && montado }
}

// --- Modal: una hoja que sube y se posa ---
export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  const { montado, saliendo } = useSalida(!!abierto)

  // Mientras sale, se sigue viendo lo ultimo que tenia dentro
  const ultimo = useRef({ titulo, children })
  if (abierto) ultimo.current = { titulo, children }

  useEffect(() => {
    if (!abierto) return
    const onEsc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [abierto, onCerrar])

  if (!montado) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 bg-morado-deep/30 backdrop-blur-[6px]
                  ${saliendo ? 'animate-desaparecer pointer-events-none' : 'animate-aparecer'}`}
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-[20px] shadow-hoja w-full ${ancho} max-h-[88vh] flex flex-col
                    ${saliendo ? 'animate-hoja-sale' : 'animate-hoja-entra'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pl-6 pr-4 py-3.5 border-b border-black/[0.07] shrink-0">
          <h2 className="font-display text-[17px] font-semibold text-slate-800 min-w-0">{ultimo.current.titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-slate-500
                       bg-[rgba(120,120,128,0.12)] hover:bg-[rgba(120,120,128,0.22)] transition-colors"
          >
            <Icono nombre="cerrar" tam={13} grosor={2.4} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{ultimo.current.children}</div>
      </div>
    </div>,
    document.body
  )
}

// --- Dato de cabecera ---
export function StatCard({ icono, valor, etiqueta, color = 'morado' }) {
  const colores = {
    morado: 'bg-morado/[0.08] text-morado',
    oro: 'bg-oro/20 text-oro-dark',
    verde: 'bg-emerald-100 text-emerald-700',
    azul: 'bg-sky-100 text-sky-700',
    rojo: 'bg-red-100 text-red-700',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-semibold text-lg ${colores[color]}`}>
        {esLetra(icono) ? icono : <Icono e={icono} tam={21} />}
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold text-slate-800 leading-none tabular-nums">{valor}</p>
        <p className="text-slate-500 text-xs mt-1.5 truncate">{etiqueta}</p>
      </div>
    </div>
  )
}

// --- Aviso / alerta ---
export function Alerta({ tipo = 'info', children }) {
  const estilos = {
    info: 'bg-sky-50 text-sky-900',
    exito: 'bg-emerald-50 text-emerald-900',
    aviso: 'bg-amber-50 text-amber-900',
    error: 'bg-red-50 text-red-900',
  }
  const tintes = {
    info: 'text-sky-700', exito: 'text-emerald-700', aviso: 'text-amber-700', error: 'text-red-700',
  }
  const iconos = { info: 'info', exito: 'visto', aviso: 'atencion', error: 'prohibido' }
  return (
    <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed flex items-start gap-2.5 ${estilos[tipo]}`}>
      <span className={`mt-[2px] ${tintes[tipo]}`}><Icono nombre={iconos[tipo]} tam={16} /></span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// --- Toast (notificacion flotante, como un aviso de sistema) ---
export function Toast({ mensaje, tipo = 'exito', onCerrar }) {
  const { montado, saliendo } = useSalida(!!mensaje)
  const ultimo = useRef({ mensaje, tipo })
  if (mensaje) ultimo.current = { mensaje, tipo }

  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(onCerrar, 3000)
    return () => clearTimeout(t)
  }, [mensaje, onCerrar])

  if (!montado) return null

  const iconos = {
    exito: { nombre: 'visto', color: 'text-emerald-400' },
    error: { nombre: 'atencion', color: 'text-red-400' },
    info: { nombre: 'info', color: 'text-oro-light' },
  }
  const ic = iconos[ultimo.current.tipo] || iconos.info

  return createPortal(
    <div
      role="status"
      className={`fixed bottom-7 left-1/2 z-[60] ${saliendo ? 'animate-aviso-sale' : 'animate-aviso-entra'}`}
    >
      <div className="flex items-center gap-2.5 bg-morado-deep/90 backdrop-blur-xl text-white pl-4 pr-5 py-2.5
                      rounded-full shadow-hoja text-sm font-medium max-w-[70vw]">
        <Icono nombre={ic.nombre} tam={16} grosor={2.2} className={ic.color} />
        <span className="truncate">{ultimo.current.mensaje}</span>
      </div>
    </div>,
    document.body
  )
}

// --- Control segmentado con la marca que se desliza ---
//   opciones: [{ id, label, icono? }]
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
          className="segmentado-pieza flex-1"
        >
          {o.icono && <Icono nombre={o.icono} tam={15} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}
