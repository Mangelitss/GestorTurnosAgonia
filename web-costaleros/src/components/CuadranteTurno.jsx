// =============================================================
//  UN TURNO COMPLETO
//
//  Se dibuja como se ve de verdad desde arriba: las varas una al
//  lado de otra, la gente de delante, la pieza en medio y la gente
//  de detras. Tambien en el movil: asi un turno cabe en una
//  pantalla y cada uno se situa de un vistazo. Los nombres largos
//  se parten en dos lineas en vez de recortarse.
// =============================================================

import { PIEZAS } from '@nucleo/constantes'
import { limpiarNombre } from '../lib/datos'
import { ESTILO_MARCA } from './Leyenda'

export default function CuadranteTurno({ turno, pieza = 'trono', resaltarId = null, marcas = {} }) {
  if (!turno) return null

  const info = PIEZAS[pieza]

  // Respeta el orden natural de las varas (Izquierda, Centro, Derecha)
  const varas = [
    ...info.varas.filter((v) => turno.varas?.[v]),
    ...Object.keys(turno.varas || {}).filter((v) => !info.varas.includes(v)),
  ]

  return (
    <div className="overflow-hidden rounded-lg border border-oro/25">
      <h3 className="bg-morado px-3 py-2.5 text-center font-titulo text-sm font-bold
                     uppercase tracking-[0.15em] text-crema">
        {pieza === 'cruz' ? 'Cruz Guía' : 'Trono'} · Turno {turno.id}
      </h3>

      <div
        className="grid gap-px bg-oro/15"
        style={{ gridTemplateColumns: `repeat(${varas.length}, minmax(0, 1fr))` }}
      >
        {varas.map((vara) => (
          <Vara
            key={vara}
            nombre={vara}
            secciones={turno.varas[vara]}
            pieza={pieza}
            resaltarId={resaltarId}
            marcas={marcas}
          />
        ))}
      </div>
    </div>
  )
}

// "Izquierda" -> "Izq." en pantallas estrechas
const CORTO = { Izquierda: 'Izq.', Centro: 'Centro', Derecha: 'Der.' }

function Vara({ nombre, secciones, pieza, resaltarId, marcas }) {
  const delante = secciones?.Delante || []
  const detras = secciones?.Detras || []

  return (
    <div className="min-w-0 bg-morado-deep/90 p-1.5 sm:p-3">
      <h4 className="mb-1.5 border-b-2 border-oro/50 pb-1 text-center font-titulo
                     text-[10px] font-bold uppercase tracking-[0.1em] text-oro-light sm:text-[11px]">
        <span className="sm:hidden">{CORTO[nombre] || nombre}</span>
        <span className="hidden sm:inline">Vara {nombre}</span>
      </h4>

      {delante.length > 0 && (
        <>
          <Franja>▲ Delante</Franja>
          <Lista gente={delante} resaltarId={resaltarId} marcas={marcas} />
        </>
      )}

      <div className="my-1.5 rounded bg-morado px-1 py-1 text-center text-[9px]
                      font-bold uppercase tracking-[0.15em] text-oro-light sm:text-[10px]">
        {pieza === 'cruz' ? 'Cruz' : 'Trono'}
      </div>

      {detras.length > 0 && (
        <>
          <Lista gente={detras} resaltarId={resaltarId} marcas={marcas} />
          <Franja>▼ Detrás</Franja>
        </>
      )}
    </div>
  )
}

function Franja({ children }) {
  return (
    <div className="my-1 rounded bg-morado-dark/80 px-1 py-0.5 text-center text-[9px]
                    font-bold uppercase tracking-[0.1em] text-oro-light/60 sm:text-[10px]">
      {children}
    </div>
  )
}

function Lista({ gente, resaltarId, marcas }) {
  return (
    <ul className="space-y-1">
      {gente.map((p, i) => {
        if (!p) {
          return (
            <li
              key={i}
              className="flex min-h-[34px] items-center justify-center rounded border border-dashed
                         border-morado-light/40 px-1 text-center text-[10px] italic text-oro-light/25"
            >
              libre
            </li>
          )
        }

        const yo = resaltarId && p.costalero_id === resaltarId
        const marca = ESTILO_MARCA[marcas[p.costalero_id]]

        return (
          <li
            key={i}
            className={`flex min-h-[34px] items-center rounded border px-1.5 py-1 text-[11px]
                        leading-tight sm:px-2 sm:text-xs ${
                          yo
                            ? 'border-oro bg-oro text-morado-black font-extrabold shadow-lg shadow-oro/20'
                            : marca || 'border-morado-light/30 bg-morado-black/50 text-crema/90'
                        }`}
          >
            <span className="min-w-0 break-words font-semibold [hyphens:auto]" lang="es">
              {limpiarNombre(p.nombre)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
