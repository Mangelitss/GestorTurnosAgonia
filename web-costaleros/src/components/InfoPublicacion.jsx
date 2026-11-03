// =============================================================
//  INFORMACION DE LA PROCESION O DEL ENSAYO
//
//  Arriba solo lo que hay que ver nada mas entrar: los avisos y
//  las horas, en un bloque compacto para que el buscador quede a
//  la vista sin hacer scroll en el movil. "A tener en cuenta" va
//  en el apartado Recorrido (o debajo, en los ensayos).
// =============================================================

import { Rotulo } from './ui'

export default function InfoPublicacion({ pub }) {
  const info = pub.info || {}
  const esEnsayo = pub.clase === 'ensayo'

  const horas = [
    { etiqueta: esEnsayo ? 'Hora' : 'Citación', valor: info.citacion_hora },
    { etiqueta: 'Salida', valor: info.salida_hora },
    { etiqueta: 'Recogida', valor: info.recogida_hora },
  ].filter((h) => h.valor)

  const avisos = info.avisos || []
  const lugar = info.citacion_lugar

  if (!horas.length && !lugar && !avisos.length) return null

  return (
    <div className="space-y-2.5">
      {avisos.length > 0 && (
        <ul className="space-y-2">
          {avisos.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 rounded-lg border border-amber-400/40
                         bg-amber-500/10 px-3.5 py-2.5 text-sm leading-snug text-amber-50"
            >
              <span className="shrink-0" aria-hidden="true">📢</span>
              <span className="whitespace-pre-wrap">{a}</span>
            </li>
          ))}
        </ul>
      )}

      {(horas.length > 0 || lugar) && (
        <div className="overflow-hidden rounded-lg border border-oro/25 bg-morado-black/40">
          {horas.length > 0 && (
            <div
              className="grid divide-x divide-oro/15"
              style={{ gridTemplateColumns: `repeat(${horas.length}, minmax(0, 1fr))` }}
            >
              {horas.map((h) => (
                <div key={h.etiqueta} className="px-2 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-oro-light/50">
                    {h.etiqueta}
                  </p>
                  <p className="mt-0.5 font-titulo text-xl font-bold leading-none text-oro sm:text-2xl">
                    {h.valor}
                  </p>
                </div>
              ))}
            </div>
          )}
          {lugar && (
            <p className={`px-3 py-2 text-center text-xs font-semibold text-crema/80
                           ${horas.length ? 'border-t border-oro/15' : ''}`}>
              <span aria-hidden="true">📍 </span>{lugar}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function TenerEnCuenta({ texto }) {
  if (!texto) return null
  return (
    <div>
      <Rotulo>A tener en cuenta</Rotulo>
      <p className="whitespace-pre-wrap rounded-lg border-l-4 border-oro bg-morado-dark/60
                    px-4 py-3 text-sm leading-relaxed text-crema/90">
        {texto}
      </p>
    </div>
  )
}
