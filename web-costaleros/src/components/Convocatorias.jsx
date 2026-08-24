// =============================================================
//  PROXIMAS CONVOCATORIAS
//  Ensayos y demas citas del calendario, de hoy en adelante.
// =============================================================

import { fechaLarga, hoyIso } from '../lib/texto'
import { Vacio } from './ui'

export default function Convocatorias({ citas }) {
  if (!citas.length) {
    return (
      <Vacio
        icono="—"
        titulo="No hay convocatorias"
        texto="Cuando el cuadrillero apunte el próximo ensayo, aparecerá aquí."
      />
    )
  }

  const hoy = hoyIso()

  return (
    <ul className="animate-subir space-y-2.5">
      {citas.map((c) => {
        const esHoy = c.fecha_iso === hoy
        return (
          <li
            key={c.id}
            className={`rounded-lg border px-4 py-3.5 ${
              esHoy
                ? 'border-oro bg-oro/10'
                : 'border-oro/20 bg-morado-dark/50'
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-titulo text-sm font-bold uppercase tracking-wide text-oro-light">
                {c.tipo || 'Convocatoria'}
              </span>
              {esHoy && (
                <span className="rounded-full bg-oro px-2 py-0.5 text-[10px] font-extrabold
                                 uppercase tracking-wide text-morado-black">
                  Hoy
                </span>
              )}
            </div>

            <p className="mt-1 text-sm font-semibold text-crema">
              {fechaLarga(c.fecha_iso)}
              {c.hora && <span className="text-oro"> · {c.hora}</span>}
            </p>

            {c.lugar && (
              <p className="mt-0.5 text-xs text-oro-light/60">{c.lugar}</p>
            )}

            {c.indicaciones && (
              <p className="mt-2 whitespace-pre-wrap border-l-2 border-oro/30 pl-3
                            text-xs leading-relaxed text-crema/65">
                {c.indicaciones}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
