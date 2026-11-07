// =============================================================
//  LEYENDA DE COLORES DEL CUADRANTE
//  Solo enseña los colores que salen de verdad en esta publicacion.
// =============================================================

import { marcasPresentes } from '@nucleo/portal'

// Colores de cada marca sobre el fondo morado del portal
export const ESTILO_MARCA = {
  repite_trono: 'border-yellow-400/70 bg-yellow-400/20 text-yellow-50',
  repite_cruz: 'border-sky-400/70 bg-sky-500/25 text-sky-50',
  trono_y_cruz: 'border-emerald-400/70 bg-emerald-500/25 text-emerald-50',
  repite: 'border-yellow-400/70 bg-yellow-400/20 text-yellow-50',
}

export default function Leyenda({ marcas, conYo = false }) {
  const presentes = marcasPresentes(marcas)

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-oro/15
                    px-2 py-2.5 text-[11.5px] font-semibold">
      <Muestra clase="border-oro/25 bg-morado-black/60" texto="Un solo turno" />
      {presentes.map((m) => (
        <Muestra key={m.id} clase={ESTILO_MARCA[m.id]} texto={m.nombre} titulo={m.descripcion} />
      ))}
      {conYo && <Muestra clase="border-oro bg-oro" texto="Tú" />}
    </div>
  )
}

function Muestra({ clase, texto, titulo }) {
  return (
    <span className="flex items-center gap-1.5 text-crema/85" title={titulo}>
      <span className={`h-3.5 w-5 shrink-0 rounded-[2px] border ${clase}`} />
      {texto}
    </span>
  )
}
