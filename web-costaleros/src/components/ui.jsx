// =============================================================
//  PIEZAS SUELTAS DE INTERFAZ
// =============================================================

import { useEffect, useRef, useState } from 'react'

// La cruz de la cabecera: latina, con los brazos terminados en punta
export function Cruz({ className = '', tam = 44 }) {
  return (
    <svg
      width={tam * 0.72}
      height={tam}
      viewBox="0 0 36 50"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 0l3.4 4.2-1.7 1.6v8.4h8.5l1.6-1.7L34 16l-4.2 3.5-1.6-1.7h-8.5v26.4l1.7 1.6L18 50l-3.4-4.2 1.7-1.6V17.8H7.8l-1.6 1.7L2 16l4.2-3.5 1.6 1.7h8.5V5.8l-1.7-1.6L18 0Z" />
    </svg>
  )
}

// Filete de oro con un rombo en el centro. Se traza al aparecer.
export function Filete({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 origin-right animate-trazar bg-gradient-to-l from-oro/70 to-transparent" />
      <span className="h-1.5 w-1.5 rotate-45 animate-aparecer bg-oro" />
      <span className="h-px flex-1 origin-left animate-trazar bg-gradient-to-r from-oro/70 to-transparent" />
    </div>
  )
}

// Aparece despacio cuando entra en pantalla, una sola vez
export function Revelar({ as: Etiqueta = 'div', retraso = 0, className = '', children, ...resto }) {
  const ref = useRef(null)
  const [visto, setVisto] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisto(true); return undefined }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisto(true); obs.disconnect() }
    }, { rootMargin: '0px 0px -6% 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Etiqueta
      ref={ref}
      className={`revelar ${visto ? 'revelar-visto' : ''} ${className}`}
      style={{ '--retraso': `${retraso}ms` }}
      {...resto}
    >
      {children}
    </Etiqueta>
  )
}

export function Cargando({ texto = 'Conectando con la Mayordomía…' }) {
  return (
    <div className="flex animate-aparecer flex-col items-center gap-4 py-20">
      <div className="relative flex h-16 w-16 items-center justify-center text-oro">
        <span
          className="absolute inset-0 animate-vela rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(209,181,20,0.32), rgba(209,181,20,0) 70%)' }}
        />
        <Cruz tam={36} className="relative" />
      </div>
      <p className="font-texto text-[17px] italic text-oro-light/70">{texto}</p>
    </div>
  )
}

export function Aviso({ tipo = 'info', children }) {
  const estilos = {
    info: 'border-oro/40 bg-oro/5 text-crema',
    error: 'border-red-500/50 bg-red-950/50 text-red-100',
    quieto: 'border-oro/20 bg-morado-dark/50 text-oro-light/80',
  }
  return (
    <div className={`animate-subir rounded-sm border px-4 py-3 font-texto text-[16px] leading-snug ${estilos[tipo]}`}>
      {children}
    </div>
  )
}

export function Vacio({ titulo, texto }) {
  return (
    <div className="animate-subir py-14 text-center">
      <Cruz tam={34} className="mx-auto mb-4 text-oro/60" />
      <p className="titulo mb-2 text-[15px]">{titulo}</p>
      {texto && <p className="prosa mx-auto max-w-md text-oro-light/65">{texto}</p>}
    </div>
  )
}

// Encabezado de un bloque, entre filetes
export function Rotulo({ children }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-px flex-1 origin-right animate-trazar bg-gradient-to-l from-oro/55 to-transparent" />
      <h2 className="titulo text-center text-[13px]">{children}</h2>
      <span className="h-px flex-1 origin-left animate-trazar bg-gradient-to-r from-oro/55 to-transparent" />
    </div>
  )
}
