// =============================================================
//  VISOR/EDITOR DEL TRONO
//
//  Disposicion tal y como se ve el trono desde arriba:
//
//                    D E L A N T E
//        Izquierda   Centro    Derecha
//          [ ]         [ ]       [ ]     <- punta (los mas altos)
//          [ ]         [ ]       [ ]
//           ...        ...       ...
//        ======  T R O N O  ======
//          [ ]         [ ]       [ ]
//           ...        ...       ...
//          [ ]         [ ]       [ ]     <- punta trasera (los mas altos)
//                    D E T R A S
// =============================================================

import { useState } from 'react'
import { PIEZAS, CONFLICTOS } from '../lib/constantes'
import { claveRef, mediaAltura, varasDeTurno } from '../lib/cuadrante'
import { preferencia, siglaHombro } from '../lib/hombros'
import { estadisticasTurno, pesoDe, colorPeso } from '../lib/estadisticas'
import EstadisticasTurno, { ResumenVara } from './EstadisticasTurno'

const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }

// Tres colores en ciclo: nunca hay dos turnos seguidos del mismo color
const COLORES_TURNO = [
  { barra: '#D1B514', texto: '#2a0a23' },   // oro
  { barra: '#4F1243', texto: '#ffffff' },   // morado
  { barra: '#9f1239', texto: '#ffffff' },   // rojo granate
]

export default function Trono({
  cuadrante,
  conflictivas,           // Map de clave -> id de conflicto (o Set de claves)
  hombros,                // mapa turno -> vara -> seccion -> hombro
  censoPorId = {},
  soloLectura = false,
  mapaCalor = false,      // tiñe a cada uno según el peso que carga
  pieza = 'trono',        // 'trono' | 'cruz'
  etiquetaTurno,          // (turno, indice) => texto extra bajo el titulo
  onIntercambiar,
  onQuitar,
  onBloquear,
  onPedirCostalero,
  onAnadirHueco,
  onQuitarHueco,
  onLimpiarTurno,         // (t) => void
  onInfoCostalero,        // (persona) => void  — solo en procesiones
}) {
  const [arrastrando, setArrastrando] = useState(null)
  const [encima, setEncima] = useState(null)

  const info = PIEZAS[pieza] || PIEZAS.trono
  const tituloBarra = pieza === 'cruz' ? 'C R U Z' : 'T R O N O'

  const iniciarArrastre = (ref, persona) => {
    if (soloLectura || persona?.bloqueado) return
    setArrastrando(ref)
  }

  const soltar = (ref) => {
    if (soloLectura || !arrastrando) return
    if (claveRef(arrastrando) !== claveRef(ref)) onIntercambiar(arrastrando, ref)
    setArrastrando(null)
    setEncima(null)
  }

  // conflictivas puede ser un Set (solo duplicados) o un Map (clave -> tipo)
  const tipoConflicto = (clave) => {
    if (!conflictivas) return null
    if (typeof conflictivas.get === 'function') return conflictivas.get(clave) || null
    return conflictivas.has(clave) ? 'DUPLICADO' : null
  }

  const propsPos = (ref, persona, stats) => ({
    persona,
    conflicto: tipoConflicto(claveRef(ref)),
    pref: preferencia(persona, censoPorId),
    kg: pesoDe(stats, ref.vara, ref.seccion, ref.i),
    mapaCalor,
    stats,
    esDestino: encima === claveRef(ref),
    soloLectura,
    onDragStart: () => iniciarArrastre(ref, persona),
    onDragOver: (e) => { e.preventDefault(); setEncima(claveRef(ref)) },
    onDragLeave: () => setEncima(null),
    onDrop: (e) => { e.preventDefault(); soltar(ref) },
    onClickVacio: () => !soloLectura && onPedirCostalero(ref),
    onQuitar: () => onQuitar(ref),
    onBloquear: () => onBloquear(ref),
    onInfo: onInfoCostalero ? () => onInfoCostalero(persona) : null,
  })

  return (
    <div>
      {cuadrante.map((turno, t) => {
        const varas = varasDeTurno(turno)
        const cols = COLS[varas.length] || 'grid-cols-3'
        const extra = etiquetaTurno?.(turno, t)
        const stats = estadisticasTurno(turno, pieza)
        const color = COLORES_TURNO[t % COLORES_TURNO.length]

        return (
          <div key={turno.id}>

            {/* ---- Separador entre turnos ---- */}
            {t > 0 && <SeparadorTurno />}

            <div
              className="card overflow-hidden border-l-[6px] scroll-mt-4"
              style={{ borderLeftColor: color.barra }}
            >

              {/* ---- Cabecera del turno (se queda pegada al hacer scroll) ---- */}
              <div
                className={`px-5 py-3 flex items-center justify-between gap-3 flex-wrap
                            sticky top-0 z-20 shadow-md
                            ${pieza === 'cruz' ? 'bg-sky-800' : 'bg-morado'}`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center
                               font-serif text-lg font-bold shrink-0"
                    style={{ backgroundColor: color.barra, color: color.texto }}
                  >
                    {turno.id}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-oro tracking-widest">
                    {info.nombre.toUpperCase()} · TURNO {turno.id}
                  </h3>
                  {extra}
                </div>
                <div className="flex items-center gap-3">
                  <ResumenTurno turno={turno} />
                  {!soloLectura && onLimpiarTurno && (
                    <button
                      onClick={() => onLimpiarTurno(t)}
                      className="text-xs px-2.5 py-1 rounded border border-white/20 text-white/70
                                 hover:bg-red-600 hover:border-red-500 hover:text-white transition"
                      title="Vaciar el turno (respeta las posiciones bloqueadas)"
                    >
                      🧹 Limpiar
                    </button>
                  )}
                </div>
              </div>

            <div className="p-5 bg-gradient-to-b from-slate-50 to-white">

              {/* ---- Etiqueta DELANTE ---- */}
              <Etiqueta texto="D E L A N T E" />

              {/* ---- Nombres de las varas y su hombro ---- */}
              <div className={`grid ${cols} gap-3 mb-2`}>
                {varas.map((vara) => (
                  <div key={vara} className="text-center">
                    <p className="text-[10px] font-bold text-morado/60 uppercase tracking-widest">
                      {vara}
                    </p>
                    {hombros?.[t]?.[vara]?.Delante && (
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        hombro {siglaHombro(hombros[t][vara].Delante)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* ---- Mitad delantera ---- */}
              <div className={`grid ${cols} gap-3`}>
                {varas.map((vara) => {
                  const lista = turno.varas[vara]?.Delante || []
                  return (
                    <div key={vara} className="space-y-1">
                      {lista.map((persona, i) => (
                        <Posicion
                          key={`${vara}-D-${i}`}
                          numero={i + 1}
                          {...propsPos({ t, vara, seccion: 'Delante', i }, persona, stats)}
                        />
                      ))}
                      {!soloLectura && (
                        <BotonesHueco
                          onAnadir={() => onAnadirHueco(t, vara, 'Delante')}
                          onQuitar={() => onQuitarHueco(t, vara, 'Delante')}
                        />
                      )}
                      <ResumenVara stats={stats} vara={vara} seccion="Delante" />
                    </div>
                  )
                })}
              </div>

              {/* ---- BARRA CENTRAL ---- */}
              <BarraTrono texto={tituloBarra} pieza={pieza} />

              {/* ---- Mitad trasera ---- */}
              <div className={`grid ${cols} gap-3`}>
                {varas.map((vara) => {
                  const lista = turno.varas[vara]?.Detras || []
                  return (
                    <div key={vara} className="space-y-1">
                      {lista.map((persona, i) => (
                        <Posicion
                          key={`${vara}-T-${i}`}
                          numero={i + 1}
                          {...propsPos({ t, vara, seccion: 'Detras', i }, persona, stats)}
                        />
                      ))}
                      {!soloLectura && (
                        <BotonesHueco
                          onAnadir={() => onAnadirHueco(t, vara, 'Detras')}
                          onQuitar={() => onQuitarHueco(t, vara, 'Detras')}
                        />
                      )}
                      <ResumenVara stats={stats} vara={vara} seccion="Detras" />
                    </div>
                  )
                })}
              </div>

              {/* ---- Hombro de la mitad trasera ---- */}
              <div className={`grid ${cols} gap-3 mt-1.5`}>
                {varas.map((vara) => (
                  <p key={vara} className="text-[9px] text-slate-400 text-center">
                    {hombros?.[t]?.[vara]?.Detras
                      ? `hombro ${siglaHombro(hombros[t][vara].Detras)}`
                      : ''}
                  </p>
                ))}
              </div>

              {/* ---- Totales por vara ---- */}
              <div className={`grid ${cols} gap-3 mt-2`}>
                {varas.map((vara) => {
                  const v = stats.porVara[vara]
                  return (
                    <p key={vara} className="text-[10px] text-morado/70 text-center font-semibold">
                      Total: {v.media > 0 ? `${v.media.toFixed(0)} cm` : '—'} · {v.peso.toFixed(0)} kg
                    </p>
                  )
                })}
              </div>

              {/* ---- Etiqueta DETRAS ---- */}
              <Etiqueta texto="D E T R Á S" abajo />
              </div>

              {/* ---- Panel de estadísticas ---- */}
              <EstadisticasTurno stats={stats} turno={turno} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Separador visual entre turnos, para no pasarse al hacer scroll
function SeparadorTurno() {
  return (
    <div className="flex items-center gap-3 my-8" aria-hidden="true">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-slate-300" />
      <span className="text-oro/50 text-lg leading-none">✜</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-300 to-slate-300" />
    </div>
  )
}

// =============================================================
//  PIEZAS DECORATIVAS
// =============================================================

function Etiqueta({ texto, abajo = false }) {
  return (
    <div className={`flex items-center gap-3 ${abajo ? 'mt-4' : 'mb-3'}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-oro/40" />
      <span className="text-[11px] font-bold text-oro-dark tracking-[0.25em] uppercase">
        {texto}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-oro/40" />
    </div>
  )
}

function BarraTrono({ texto = 'T R O N O', pieza = 'trono' }) {
  const fondo = pieza === 'cruz'
    ? 'from-sky-900 via-sky-800 to-sky-900'
    : 'from-morado-deep via-morado to-morado-deep'
  return (
    <div className="my-4 relative">
      <div
        className={`bg-gradient-to-r ${fondo}
                   rounded-lg py-4 px-6 shadow-inner border-y-2 border-oro/50
                   flex items-center justify-center gap-4`}
      >
        <span className="text-oro/50 text-lg">✝</span>
        <span className="font-serif text-oro font-bold tracking-[0.4em] text-sm">
          {texto}
        </span>
        <span className="text-oro/50 text-lg">✝</span>
      </div>
    </div>
  )
}

function BotonesHueco({ onAnadir, onQuitar }) {
  return (
    <div className="flex gap-1 pt-0.5">
      <button
        onClick={onAnadir}
        className="flex-1 text-[10px] py-1 rounded border border-dashed border-slate-300
                   text-slate-400 hover:border-oro hover:text-oro-dark transition"
        title="Añadir una posición más"
      >
        + posición
      </button>
      <button
        onClick={onQuitar}
        className="px-2 text-[10px] py-1 rounded border border-dashed border-slate-300
                   text-slate-400 hover:border-red-400 hover:text-red-500 transition"
        title="Quitar la última posición (debe estar vacía)"
      >
        −
      </button>
    </div>
  )
}

// =============================================================
//  UNA POSICION DEL TRONO
// =============================================================

function Posicion({
  numero, persona, conflicto, pref, kg, mapaCalor, stats, esDestino, soloLectura,
  onDragStart, onDragOver, onDragLeave, onDrop, onClickVacio, onQuitar, onBloquear, onInfo,
}) {
  const enConflicto = !!conflicto
  // --- Hueco libre ---
  if (!persona) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClickVacio}
        className={`flex items-center gap-2 px-2 py-1.5 rounded border border-dashed text-xs transition
                    ${esDestino ? 'border-oro bg-oro/10' : 'border-slate-200 bg-white/50'}
                    ${soloLectura ? '' : 'cursor-pointer hover:border-oro hover:bg-oro/5'}`}
      >
        <span className="text-[10px] text-slate-300 w-4 shrink-0">{numero}</span>
        <span className="text-slate-300 italic truncate">
          {soloLectura ? 'Libre' : '+ Añadir'}
        </span>
      </div>
    )
  }

  // --- Ocupada ---
  let estilo = 'bg-white border-slate-200 shadow-sm'
  if (conflicto) {
    estilo = CONFLICTOS[conflicto]?.clases || CONFLICTOS.DUPLICADO.clases
  } else if (persona.repetidor) {
    estilo = 'bg-yellow-50 border-yellow-300'
  } else if (persona.bloqueado) {
    estilo = 'bg-morado/10 border-morado/40'
  }

  // --- Mapa de calor ---
  // Cuando está activo manda SIEMPRE, por encima de los colores de
  // conflicto y de repetidor, para que solo se lea el peso.
  // Al apagarlo, cada uno recupera su color.
  let estiloCalor = null
  if (mapaCalor) {
    const c = colorPeso(kg, stats)
    estiloCalor = { backgroundColor: c.fondo, color: c.texto, borderColor: 'transparent' }
  }

  // Los fondos oscuros necesitan texto claro en los detalles
  const fondoOscuro = estiloCalor
    ? kg > 0
    : ['DUPLICADO', 'TRAMOS_CONSECUTIVOS', 'REPITE_CRUZ', 'TRONO_Y_CRUZ'].includes(conflicto)

  return (
    <div
      draggable={!soloLectura && !persona.bloqueado}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition group
                  ${estiloCalor ? '' : estilo} ${esDestino ? 'ring-2 ring-oro' : ''}
                  ${!soloLectura && !persona.bloqueado ? 'cursor-move' : ''}`}
      style={estiloCalor || undefined}
      title={
        conflicto ? `${persona.nombre} — ${CONFLICTOS[conflicto]?.nombre || 'conflicto'}`
        : persona.bloqueado ? `${persona.nombre} (bloqueado)`
        : persona.repetidor ? `${persona.nombre} (repetidor)`
        : persona.nombre
      }
    >
      <span className={`text-[10px] w-4 shrink-0 ${fondoOscuro ? 'text-white/50' : 'text-slate-300'}`}>
        {numero}
      </span>

      <span className="flex-1 min-w-0 truncate font-medium">
        {persona.bloqueado && '🔒 '}
        {persona.nombre}
        {persona.repetidor && <span className="opacity-60"> (R)</span>}
        {pref && (
          <span
            className={`ml-1 text-[9px] font-bold ${
              fondoOscuro ? 'text-white/70' : 'text-sky-600'
            }`}
            title={`Prefiere el hombro ${pref.toLowerCase()}`}
          >
            ({siglaHombro(pref)})
          </span>
        )}
      </span>

      <span className={`text-[10px] tabular-nums shrink-0 ${fondoOscuro ? 'text-white/80' : 'text-slate-400'}`}>
        {mapaCalor
          ? (kg > 0 ? `${kg.toFixed(0)}kg` : 'no toca')
          : (persona.altura || '—')}
      </span>

      <span className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onInfo && (
          <button
            onClick={onInfo}
            className={`px-0.5 rounded hover:bg-black/10 ${fondoOscuro ? 'text-white' : 'text-slate-400 hover:text-sky-600'}`}
            title="Ver su orden procesional"
          >
            ℹ️
          </button>
        )}
        {!soloLectura && (
          <>
            <button
              onClick={onBloquear}
              className={`px-0.5 rounded hover:bg-black/10 ${fondoOscuro ? 'text-white' : 'text-slate-400 hover:text-morado'}`}
              title={persona.bloqueado ? 'Desbloquear' : 'Bloquear en esta posición'}
            >
              {persona.bloqueado ? '🔓' : '🔒'}
            </button>
            {!persona.bloqueado && (
              <button
                onClick={onQuitar}
                className={`px-0.5 rounded hover:bg-black/10 ${fondoOscuro ? 'text-white' : 'text-slate-400 hover:text-red-500'}`}
                title="Quitar de esta posición"
              >
                ✕
              </button>
            )}
          </>
        )}
      </span>
    </div>
  )
}

// =============================================================
//  RESUMEN DE UN TURNO
// =============================================================

function ResumenTurno({ turno }) {
  let ocupadas = 0
  let total = 0
  const alturas = []

  varasDeTurno(turno).forEach((v) => {
    ['Delante', 'Detras'].forEach((s) => {
      const lista = turno.varas[v]?.[s] || []
      total += lista.length
      lista.forEach((p) => {
        if (p) { ocupadas++; alturas.push(p.altura || 0) }
      })
    })
  })

  const media = alturas.length
    ? alturas.reduce((a, b) => a + b, 0) / alturas.length
    : 0

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-oro-light/80">{ocupadas}/{total} plazas</span>
      {media > 0 && <span className="text-oro-light/60">media {media.toFixed(0)} cm</span>}
      {total - ocupadas > 0 && (
        <span className="chip bg-amber-400/20 text-amber-200 border border-amber-400/30">
          {total - ocupadas} libre{total - ocupadas === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}
