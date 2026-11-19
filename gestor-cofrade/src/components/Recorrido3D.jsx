// =============================================================
//  RECORRIDO EN 3D (pantalla completa)
//  Animación cinematográfica del paso por la ruta, parando en
//  cada relevo de turno. Pensada también para grabar vídeo:
//    Espacio  reproducir / pausa      H  Modo Vídeo
//    R        reiniciar               1 2 4  velocidad
//    F        pantalla completa       Esc  salir
// =============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { crearRecorrido3D } from '../lib/recorrido3d'
import { crearRuta, rangosTramos, colorTurno } from '../lib/mapa'
import { FASES } from '../lib/constantes'

const PAUSA_RELEVO = 4
const PAUSA_EXTREMOS = 5

// Paradas de la animación: el comienzo de cada tramo (relevo) y la recogida
export function paradasDeTramos(coords, tramos) {
  const ruta = crearRuta(coords)
  if (!ruta) return []
  const rangos = rangosTramos(tramos, ruta.longitud)
  const paradas = tramos.map((t, k) => {
    const previo = tramos[k - 1]
    const trasDescanso = k > 0 && t.fase === 'regreso' && (previo?.fase || 'ida') !== 'regreso'
    return {
      d: rangos[k].inicio,
      pausa: k === 0 ? PAUSA_EXTREMOS : PAUSA_RELEVO,
      tipo: k === 0 ? 'Salida' : trasDescanso ? `${FASES.regreso.nombre} · tras el descanso` : 'Relevo',
      titulo: t.nombre || `Tramo ${k + 1}`,
      desde: t.desde, hasta: t.hasta,
      turno_trono: t.turno_trono, turno_cruz: t.turno_cruz,
      texto: t.texto,
    }
  })
  paradas.push({ d: ruta.longitud, pausa: PAUSA_EXTREMOS, tipo: 'Recogida', titulo: 'Fin del recorrido' })
  return paradas
}

const ICONO = {
  play: <path d="M7 4.5v15l13-7.5z" />,
  pausa: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  repetir: <path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />,
  pantalla: <path d="M4 9V4h5v2H6v3H4zm10-5h6v5h-2V6h-4V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-6v-2h4z" />,
}
const Icono = ({ n }) => <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">{ICONO[n]}</svg>

export default function Recorrido3D({ abierto, onCerrar, coords, tramos, titulo, subtitulo, llevaCruz }) {
  const escenarioRef = useRef(null)
  const mapaRef = useRef(null)
  const motorRef = useRef(null)
  const pistaRef = useRef(null)

  const [listo, setListo] = useState(false)
  const [progreso, setProgreso] = useState({ d: 0, L: 1 })
  const [parada, setParada] = useState(null)
  const [estado, setEstado] = useState({ reproduciendo: false, estado: 'andando' })
  const [iniciado, setIniciado] = useState(false)
  const [velocidad, setVelocidad] = useState(1)
  const [aspecto, setAspecto] = useState('full')
  const [modoVideo, setModoVideo] = useState(false)
  const [aviso, setAviso] = useState('')
  const [ventana, setVentana] = useState({ w: window.innerWidth, h: window.innerHeight })

  const paradas = useMemo(() => (abierto ? paradasDeTramos(coords, tramos) : []), [abierto, coords, tramos])

  // ---------- Crear / destruir el motor ----------
  useEffect(() => {
    if (!abierto || !mapaRef.current || coords.length < 2) return undefined
    setListo(false); setParada(null); setIniciado(false); setModoVideo(false)
    setEstado({ reproduciendo: false, estado: 'andando' })
    const motor = crearRecorrido3D({
      contenedor: mapaRef.current,
      coords,
      paradas,
      eventos: {
        onListo: () => setListo(true),
        onProgreso: (d, L) => setProgreso({ d, L }),
        onParada: setParada,
        onEstado: setEstado,
      },
    })
    motorRef.current = motor
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      motor.destruir()
      motorRef.current = null
      document.body.style.overflow = anterior
    }
  }, [abierto, coords, paradas])

  // ---------- Tamaño del escenario según el encuadre ----------
  useEffect(() => {
    const alCambiar = () => setVentana({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', alCambiar)
    document.addEventListener('fullscreenchange', alCambiar)
    return () => {
      window.removeEventListener('resize', alCambiar)
      document.removeEventListener('fullscreenchange', alCambiar)
    }
  }, [])
  let w = ventana.w, h = ventana.h
  if (aspecto === '16:9') { w = Math.min(ventana.w, (ventana.h * 16) / 9); h = (w * 9) / 16 }
  if (aspecto === '9:16') { h = Math.min(ventana.h, (ventana.w * 16) / 9); w = (h * 9) / 16 }
  const vertical = w / h < 0.9
  useEffect(() => { motorRef.current?.redimensionar() }, [w, h])

  // ---------- Acciones ----------
  const motor = () => motorRef.current
  const reproducir = () => { motor()?.reproducir(); setIniciado(true) }
  const alternar = () => { if (!iniciado) reproducir(); else motor()?.alternar() }
  const reiniciar = () => { motor()?.reiniciar(); setIniciado(true) }
  const cambiarVelocidad = (v) => { setVelocidad(v); motor()?.setVelocidad(v) }
  const pantallaCompleta = () => (document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen().catch(() => {}))
  const alternarVideo = () => setModoVideo((v) => {
    if (!v) { setAviso('Modo Vídeo · pulsa H para salir'); setTimeout(() => setAviso(''), 1400) }
    return !v
  })

  // Teclado (con refs para no re-suscribir en cada render)
  const accionesRef = useRef({})
  accionesRef.current = { alternar, reiniciar, cambiarVelocidad, pantallaCompleta, alternarVideo, modoVideo, onCerrar }
  useEffect(() => {
    if (!abierto) return undefined
    const onTecla = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      const a = accionesRef.current
      const k = e.key.toLowerCase()
      if (k === ' ') { e.preventDefault(); a.alternar() }
      else if (k === 'h') a.alternarVideo()
      else if (k === 'r') a.reiniciar()
      else if (k === 'f') a.pantallaCompleta()
      else if (k === '1' || k === '2' || k === '4') a.cambiarVelocidad(Number(k))
      else if (k === 'escape') { if (a.modoVideo) a.alternarVideo(); else a.onCerrar() }
    }
    window.addEventListener('keydown', onTecla)
    return () => window.removeEventListener('keydown', onTecla)
  }, [abierto])

  // Barra de progreso arrastrable
  const arrastre = useRef({ activo: false, reanudar: false })
  const buscar = (e) => {
    const r = pistaRef.current.getBoundingClientRect()
    motor()?.irA(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * progreso.L)
  }
  const onPointerDown = (e) => {
    arrastre.current = { activo: true, reanudar: !!motor()?.estaReproduciendo() }
    motor()?.pausar()
    pistaRef.current.setPointerCapture(e.pointerId)
    buscar(e)
  }
  const onPointerMove = (e) => arrastre.current.activo && buscar(e)
  const onPointerUp = () => {
    if (!arrastre.current.activo) return
    arrastre.current.activo = false
    if (arrastre.current.reanudar) reproducir()
  }

  // La tarjeta conserva el último contenido mientras se desvanece
  const ultimaParada = useRef(null)
  const p = parada !== null ? paradas[parada] : null
  if (p) ultimaParada.current = { ...p, indice: parada }
  const tarjeta = ultimaParada.current

  if (!abierto) return null

  const pct = progreso.L ? (progreso.d / progreso.L) * 100 : 0
  const km = (m) => (m / 1000).toFixed(2).replace('.', ',')

  return createPortal(
    <div className={`fixed inset-0 z-[70] grid place-items-center bg-[#050307] ${modoVideo ? 'cursor-none' : ''}`}>
      <div
        ref={escenarioRef}
        className={`relative overflow-hidden bg-[#0d0a12] ${vertical ? 'r3d-vertical' : ''} ${aspecto !== 'full' && !modoVideo ? 'ring-1 ring-oro/40' : ''}`}
        style={{ width: Math.round(w), height: Math.round(h), '--card-bottom': modoVideo ? (vertical ? '70px' : '42px') : (vertical ? '150px' : '112px') }}
      >
        {/* h-full y no "absolute inset-0": MapLibre fuerza position:relative en su contenedor */}
        <div ref={mapaRef} className="h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(8,4,12,.65) 0%, transparent 22%, transparent 70%, rgba(8,4,12,.55) 100%), radial-gradient(ellipse at 50% 55%, transparent 50%, rgba(0,0,0,.55) 100%)' }}
        />

        {/* Cabecera */}
        <header className={`pointer-events-none absolute top-6 ${vertical ? 'inset-x-0 text-center' : 'left-7'}`} style={{ textShadow: '0 2px 12px rgba(0,0,0,.8)' }}>
          {subtitulo && <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#e2b84f]">{subtitulo}</p>}
          <h1 className="mt-2 font-serif text-[26px] font-bold tracking-wide text-[#f4ead2]">{titulo}</h1>
          <div className={`mt-2.5 h-px w-28 bg-gradient-to-r from-[#e2b84f] to-transparent ${vertical ? 'mx-auto' : ''}`} />
        </header>

        {/* Tarjeta de la parada */}
        <article className={`r3d-card ${p ? 'visible' : ''}`} aria-live="polite">
          <span className="esq a" /><span className="esq b" /><span className="esq c" /><span className="esq d" />
          {tarjeta && (
            <>
              <div className="px-[22px] pb-5 pt-[18px]">
                <p className="kicker">{tarjeta.tipo} · {tarjeta.indice + 1} de {paradas.length}</p>
                <h2>{tarjeta.titulo}</h2>
                {(tarjeta.desde || tarjeta.hasta) && (
                  <p className="camino">{tarjeta.desde || '—'} → {tarjeta.hasta || '—'}</p>
                )}
                {(tarjeta.turno_trono || (llevaCruz && tarjeta.turno_cruz)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tarjeta.turno_trono && (
                      <span className="turno text-white" style={{ background: colorTurno(tarjeta.turno_trono) }}>
                        Trono · Turno {tarjeta.turno_trono}
                      </span>
                    )}
                    {llevaCruz && tarjeta.turno_cruz && (
                      <span className="turno bg-sky-600 text-white">Cruz · Turno {tarjeta.turno_cruz}</span>
                    )}
                  </div>
                )}
                {tarjeta.texto && (
                  <>
                    <div className="ornamento">✠</div>
                    <p className="desc">{tarjeta.texto}</p>
                  </>
                )}
              </div>
              <div key={tarjeta.indice} className={`temporizador ${estado.reproduciendo ? '' : 'pausado'}`} style={{ '--pausa': `${tarjeta.pausa}s` }}>
                <span />
              </div>
            </>
          )}
        </article>

        {/* Botón de inicio */}
        {!iniciado && !modoVideo && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              onClick={reproducir}
              disabled={!listo}
              className="flex items-center gap-3 rounded-full border border-[#e2b84f] bg-[#180a22]/80 py-3.5 pl-4 pr-6
                         font-serif text-[15px] font-bold tracking-wider text-[#f4ead2] shadow-[0_0_40px_rgba(226,184,79,.25)]
                         backdrop-blur disabled:opacity-60"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e2b84f] text-morado-dark"><Icono n="play" /></span>
              {listo ? 'Iniciar recorrido' : 'Cargando mapa…'}
            </button>
          </div>
        )}
      </div>

      {/* Aviso */}
      <div className={`pointer-events-none fixed left-1/2 top-5 -translate-x-1/2 rounded-xl border border-oro/30 bg-[#0e0814]/90 px-4 py-2.5 text-sm text-[#f4ead2] transition-opacity duration-300 ${aviso ? 'opacity-100' : 'opacity-0'}`}>
        {aviso}
      </div>

      {/* Controles */}
      {!modoVideo && (
        <>
          <button
            onClick={onCerrar}
            className="fixed right-4 top-4 z-10 h-9 rounded-xl border border-white/15 bg-[#140a1c]/70 px-3 text-sm text-[#cbbfa3] backdrop-blur hover:text-white"
          >
            ✕ Cerrar <kbd className="ml-1 rounded border border-white/25 px-1 text-[10px]">Esc</kbd>
          </button>

          <div className="fixed bottom-4 left-1/2 z-10 flex w-[min(900px,calc(100vw-32px))] -translate-x-1/2 flex-wrap items-center gap-2.5
                          rounded-2xl border border-oro/25 bg-[#140a1c]/75 p-2.5 text-[#f4ead2] shadow-2xl backdrop-blur-md">
            <button
              onClick={alternar} disabled={!listo} title="Reproducir / Pausa (Espacio)"
              className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#f6dc8f] via-[#e2b84f] to-[#8a6420] text-morado-dark disabled:opacity-50"
            >
              <Icono n={estado.reproduciendo ? 'pausa' : estado.estado === 'fin' ? 'repetir' : 'play'} />
            </button>
            <button onClick={reiniciar} disabled={!listo} title="Reiniciar (R)" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 hover:bg-oro/15">
              <Icono n="repetir" />
            </button>

            <div className="flex min-w-[180px] flex-[1_1_220px] items-center gap-3">
              <div
                ref={pistaRef}
                className="relative h-7 flex-1 cursor-pointer touch-none"
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              >
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-white/15" />
                <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded bg-gradient-to-r from-[#7b3fa8] to-[#e2b84f]" style={{ width: `${pct}%` }} />
                {paradas.map((pa, i) => (
                  <div
                    key={i} title={pa.titulo}
                    className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#e2b84f] ${pa.d <= progreso.d + 0.3 ? 'bg-[#e2b84f]' : 'bg-[#2a0f3d]'}`}
                    style={{ left: `${(pa.d / progreso.L) * 100}%` }}
                  />
                ))}
                <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff6dd] shadow-[0_0_0_3px_rgba(226,184,79,.45)]" style={{ left: `${pct}%` }} />
              </div>
              <span className="min-w-[92px] text-right text-xs tabular-nums text-[#d9cdb2]">{km(progreso.d)} / {km(progreso.L)} km</span>
            </div>

            <div className="flex gap-0.5 rounded-xl bg-white/5 p-1" title="Velocidad (1, 2, 4)">
              {[1, 2, 4].map((v) => (
                <button
                  key={v} onClick={() => cambiarVelocidad(v)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${velocidad === v ? 'bg-[#e2b84f] text-morado-dark' : 'text-[#cbbfa3]'}`}
                >
                  {v}x
                </button>
              ))}
            </div>
            <select
              value={aspecto} onChange={(e) => setAspecto(e.target.value)} title="Encuadre de grabación"
              className="h-10 rounded-xl border-0 bg-white/5 px-2.5 text-xs text-[#f4ead2] outline-none [&>option]:bg-[#1b0f24]"
            >
              <option value="full">Pantalla completa</option>
              <option value="16:9">16:9 YouTube</option>
              <option value="9:16">9:16 TikTok/Reels</option>
            </select>
            <button onClick={pantallaCompleta} title="Pantalla completa (F)" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 hover:bg-oro/15">
              <Icono n="pantalla" />
            </button>
            <button
              onClick={alternarVideo} title="Oculta la interfaz para grabar (H)"
              className="flex h-10 items-center gap-2 rounded-xl border border-oro/25 bg-[#7b3fa8]/30 px-3.5 text-xs font-semibold hover:bg-[#7b3fa8]/50"
            >
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" /> Modo Vídeo
              <kbd className="rounded border border-white/25 px-1 text-[10px]">H</kbd>
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  )
}
