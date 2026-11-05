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
    <div className="cartela animate-subir overflow-hidden p-[5px]">
      <h3 className="border-b border-oro/30 px-3 py-2.5 text-center font-titulo text-[13px] font-semibold
                     uppercase tracking-[0.14em] text-oro-pale">
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
    <div className="min-w-0 bg-morado-black/70 p-1.5 sm:p-3">
      <h4 className="mb-1.5 text-center font-titulo text-[10.5px] font-semibold uppercase
                     tracking-[0.08em] text-oro-light sm:text-[11px]">
        <span className="sm:hidden">{CORTO[nombre] || nombre}</span>
        <span className="hidden sm:inline">Vara {nombre}</span>
      </h4>

      {delante.length > 0 && (
        <>
          <Franja>Delante</Franja>
          <Lista gente={delante} resaltarId={resaltarId} marcas={marcas} />
        </>
      )}

      <div className="my-2 border-y border-oro/40 bg-morado/70 py-1 text-center font-titulo text-[9.5px]
                      font-semibold uppercase tracking-[0.16em] text-oro-light">
        {pieza === 'cruz' ? 'Cruz' : 'Trono'}
      </div>

      {detras.length > 0 && (
        <>
          <Lista gente={detras} resaltarId={resaltarId} marcas={marcas} />
          <Franja>Detrás</Franja>
        </>
      )}
    </div>
  )
}

function Franja({ children }) {
  return (
    <div className="my-1 text-center font-texto text-[13px] italic leading-none text-oro-light/60">
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
              className="flex min-h-[36px] items-center justify-center rounded-[2px] border border-dashed
                         border-oro/20 px-1 text-center font-texto text-[12.5px] italic text-oro-light/35"
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
            className={`flex min-h-[36px] items-center rounded-[2px] border px-1.5 py-1 text-[11px]
                        leading-tight sm:px-2 sm:text-xs ${
                          yo
                            ? 'animate-resplandor border-oro-pale bg-oro font-extrabold text-morado-black'
                            : marca || 'border-oro/15 bg-morado-black/60 text-crema/90'
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
