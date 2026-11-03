// =============================================================
//  LO QUE LE TOCA AL COSTALERO EN UN ENSAYO
//  En un ensayo no hay tramos: solo en que turno va y en que puesto.
// =============================================================

import { useMemo } from 'react'
import { ocupantes } from '@nucleo/cuadrante'
import { describirPosicion } from '@nucleo/conflictos'
import CuadranteTurno from './CuadranteTurno'
import { Rotulo } from './ui'

export default function FichaEnsayo({ ensayo, persona, marcas = {}, onCambiar }) {
  const puestos = useMemo(() => {
    const cuadrante = ensayo.cuadrante || []
    return ocupantes(cuadrante)
      .filter(({ p }) => p.costalero_id === persona.id)
      .map(({ ref }) => ({ turno: cuadrante[ref.t], ref }))
  }, [ensayo, persona.id])

  return (
    <div className="animate-subir space-y-6">
      <div className="rounded-xl border border-oro/40 bg-morado-dark/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="etiqueta mb-1">Tu puesto en el ensayo</p>
            <h2 className="font-titulo text-2xl font-bold text-oro-light">{persona.nombre}</h2>
          </div>
          <button onClick={onCambiar} className="btn-linea text-xs">No soy yo</button>
        </div>

        <div className="mt-4 space-y-2">
          {puestos.map(({ turno, ref }, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-oro/20
                         bg-morado-black/40 px-3 py-2 text-sm"
            >
              <span className="rounded-full bg-oro/20 px-2.5 py-0.5 text-[11px] font-bold
                               text-oro-light ring-1 ring-oro/40">
                Turno {turno.id}
              </span>
              <span className="text-crema/80">{describirPosicion(ref)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Rotulo>Con quién vas</Rotulo>
        <div className="space-y-4">
          {[...new Set(puestos.map((p) => p.turno))].map((turno) => (
            <CuadranteTurno key={turno.id} turno={turno} resaltarId={persona.id} marcas={marcas} />
          ))}
        </div>
      </div>
    </div>
  )
}
