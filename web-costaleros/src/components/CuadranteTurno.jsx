// =============================================================
//  UN TURNO COMPLETO
//
//  Se dibuja como se ve de verdad: cada vara con su gente de
//  delante, la pieza en medio, y su gente de detras. En movil
//  las varas se apilan; en pantalla ancha van en columnas.
// =============================================================

import { PIEZAS } from '@nucleo/constantes'
import { limpiarNombre } from '../lib/datos'

export default function CuadranteTurno({ turno, pieza = 'trono', resaltarId = null }) {
  if (!turno) return null

  const info = PIEZAS[pieza]

  // Respeta el orden natural de las varas (Izquierda, Centro, Derecha)
  const varas = [
    ...info.varas.filter((v) => turno.varas?.[v]),
    ...Object.keys(turno.varas || {}).filter((v) => !info.varas.includes(v)),
  ]

  return (
    <div className="overflow-hidden rounded-lg border border-oro/25">
      <h3 className="bg-morado px-4 py-2.5 text-center font-titulo text-sm font-bold
                     uppercase tracking-[0.15em] text-crema">
        {info.icono} {pieza === 'cruz' ? 'Cruz Guía' : 'Trono'} · Turno {turno.id}
      </h3>

      {/* La cruz lleva 2 varas y el trono 3: si se fija a 3 columnas,
          la cruz deja un hueco vacio a la derecha. */}
      <div
        className={`grid gap-px bg-oro/15 ${
          varas.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
        }`}
      >
        {varas.map((vara) => (
          <Vara
            key={vara}
            nombre={vara}
            secciones={turno.varas[vara]}
            pieza={pieza}
            resaltarId={resaltarId}
          />
        ))}
      </div>
    </div>
  )
}

function Vara({ nombre, secciones, pieza, resaltarId }) {
  const delante = secciones?.Delante || []
  const detras = secciones?.Detras || []

  return (
    <div className="bg-morado-deep/80 p-3">
      <h4 className="mb-2.5 border-b-2 border-oro/50 pb-1.5 text-center font-titulo
                     text-[11px] font-bold uppercase tracking-[0.15em] text-oro-light">
        Vara {nombre}
      </h4>

      {delante.length > 0 && (
        <>
          <Franja>▲ Delante ▲</Franja>
          <Lista gente={delante} resaltarId={resaltarId} />
        </>
      )}

      <div className="my-2 rounded bg-morado px-2 py-1 text-center text-[10px]
                      font-bold uppercase tracking-[0.2em] text-oro-light">
        ▼ {pieza === 'cruz' ? 'Cruz' : 'Trono'} ▼
      </div>

      {detras.length > 0 && (
        <>
          <Lista gente={detras} resaltarId={resaltarId} />
          <Franja>▼ Detrás ▼</Franja>
        </>
      )}
    </div>
  )
}

function Franja({ children }) {
  return (
    <div className="my-1.5 rounded bg-morado-dark/80 px-2 py-1 text-center text-[10px]
                    font-bold uppercase tracking-[0.15em] text-oro-light/60">
      {children}
    </div>
  )
}

function Lista({ gente, resaltarId }) {
  return (
    <ul className="space-y-1">
      {gente.map((p, i) => {
        if (!p) {
          return (
            <li
              key={i}
              className="rounded border border-dashed border-morado-light/40 px-2 py-1.5
                         text-center text-[11px] italic text-oro-light/25"
            >
              hueco libre
            </li>
          )
        }

        const yo = resaltarId && p.costalero_id === resaltarId

        return (
          <li
            key={i}
            className={`flex items-center justify-between gap-2 rounded border px-2 py-1.5
                        text-[11px] transition-colors ${
                          yo
                            ? 'border-oro bg-oro text-morado-black font-extrabold shadow-lg shadow-oro/20'
                            : 'border-morado-light/30 bg-morado-black/50 text-crema/90'
                        }`}
          >
            <span className="truncate font-semibold">{limpiarNombre(p.nombre)}</span>
            {p.altura > 0 && (
              <span className={`shrink-0 text-[9px] font-bold ${yo ? 'opacity-70' : 'opacity-40'}`}>
                {p.altura}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
