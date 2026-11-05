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
    <div className="space-y-3">
      {avisos.length > 0 && (
        <ul className="space-y-2">
          {avisos.map((a, i) => (
            <li
              key={i}
              className="animate-subir rounded-sm border-l-2 border-oro bg-oro/[0.11] px-3.5 py-2.5"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <p className="etiqueta mb-0.5 text-oro-pale/90">Aviso</p>
              <p className="prosa whitespace-pre-wrap text-crema">{a}</p>
            </li>
          ))}
        </ul>
      )}

      {(horas.length > 0 || lugar) && (
        <div className="cartela animate-subir overflow-hidden" style={{ animationDelay: '120ms' }}>
          {horas.length > 0 && (
            <div
              className="grid divide-x divide-oro/20"
              style={{ gridTemplateColumns: `repeat(${horas.length}, minmax(0, 1fr))` }}
            >
              {horas.map((h) => (
                <div key={h.etiqueta} className="px-1 pb-3 pt-3.5 text-center">
                  <p className="etiqueta">{h.etiqueta}</p>
                  <p className="mt-1 font-titulo text-[22px] font-semibold leading-none text-oro-pale">
                    {h.valor}
                  </p>
                </div>
              ))}
            </div>
          )}
          {lugar && (
            <p className={`px-3 pb-3 text-center font-texto text-[16px] italic leading-snug text-crema/85
                           ${horas.length ? 'pt-2 border-t border-oro/20 mx-2' : 'pt-3'}`}>
              {lugar}
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
      <p className="prosa whitespace-pre-wrap border-l-2 border-oro/60 pl-4">
        {texto}
      </p>
    </div>
  )
}
