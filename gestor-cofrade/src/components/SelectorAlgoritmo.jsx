// =============================================================
//  SELECTOR DE ALGORITMO DE COLOCACION
// =============================================================

import { LISTA_ALGORITMOS } from '../lib/constantes'

export default function SelectorAlgoritmo({ valor, onCambiar }) {
  return (
    <div>
      <label className="label">Forma de repartir a los costaleros</label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {LISTA_ALGORITMOS.map((a) => {
          const activo = valor === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onCambiar(a.id)}
              className={`text-left p-4 rounded-lg border-2 transition ${
                activo
                  ? 'border-oro bg-oro/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center
                              font-serif text-lg font-bold shrink-0 ${
                    activo ? 'bg-oro text-morado-dark' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {a.id}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800">{a.nombre}</p>
                  <p className="text-[11px] text-slate-500">{a.resumen}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{a.descripcion}</p>

              {activo && (
                <ul className="mt-2.5 space-y-1">
                  {a.detalle.map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-500 flex gap-1.5">
                      <span className="text-oro-dark">▸</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )
        })}
      </div>

      <EsquemaAlgoritmo id={valor} />
    </div>
  )
}

// Pequeño esquema visual de cómo queda la mitad delantera
function EsquemaAlgoritmo({ id }) {
  //  V: Centro se lleva 1, 4, 7…    U: se llenan las tres a la vez
  const filas = id === 'U'
    ? [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15], [16, 17, 18]]
    : [[2, 1, 3], [6, 4, 5], [8, 7, 9], [12, 10, 11], [14, 13, 15], [18, 16, 17]]

  return (
    <div className="mt-3 bg-slate-50 rounded-lg p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 text-center">
        Mitad delantera · el número es el puesto en el ranking de altura
      </p>
      <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
        {['Izq', 'Centro', 'Der'].map((v) => (
          <p key={v} className="text-[9px] font-bold text-slate-400 text-center uppercase">
            {v}
          </p>
        ))}
        {filas.map((fila, i) =>
          fila.map((n, j) => (
            <span
              key={`${i}-${j}`}
              className={`text-[10px] text-center py-1 rounded tabular-nums ${
                j === 1 && id === 'V'
                  ? 'bg-oro/25 text-oro-dark font-bold'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {n}
            </span>
          ))
        )}
      </div>
      <p className="text-[10px] text-slate-400 text-center mt-2">
        ↓ hacia el trono
      </p>
    </div>
  )
}
