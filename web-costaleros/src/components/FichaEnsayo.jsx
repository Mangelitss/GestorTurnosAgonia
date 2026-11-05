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
    <div className="animate-aparecer space-y-7">
      <div className="cartela p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="etiqueta mb-1">Tu puesto en el ensayo</p>
            <h2 className="font-titulo text-[21px] font-semibold leading-tight text-oro-pale">{persona.nombre}</h2>
          </div>
          <button onClick={onCambiar} className="btn-discreto shrink-0">No soy yo</button>
        </div>

        <div className="mt-4 divide-y divide-oro/15 border-t border-oro/15">
          {puestos.map(({ turno, ref }, i) => (
            <div key={i} className="py-2.5">
              <p className="font-titulo text-[13px] font-semibold text-oro-light">Turno {turno.id}</p>
              <p className="prosa">{describirPosicion(ref)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Rotulo>Con quién vas</Rotulo>
        <div className="space-y-5">
          {[...new Set(puestos.map((p) => p.turno))].map((turno) => (
            <CuadranteTurno key={turno.id} turno={turno} resaltarId={persona.id} marcas={marcas} />
          ))}
        </div>
      </div>
    </div>
  )
}
