// =============================================================
//  BUSCADOR DE COSTALERO
//  Escribes tu nombre y entras en tu ficha. Nada mas.
// =============================================================

import { useMemo, useState } from 'react'
import { normalizar } from '../lib/texto'

export default function Buscador({ personas, onElegir }) {
  const [texto, setTexto] = useState('')

  const q = normalizar(texto)
  const resultados = useMemo(() => {
    if (q.length < 2) return []
    return personas.filter((p) => normalizar(p.nombre).includes(q)).slice(0, 30)
  }, [personas, q])

  return (
    <div className="animate-aparecer">
      <p className="etiqueta mb-2 text-center">Busca tu nombre</p>

      <input
        className="campo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe tu nombre…"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
      />

      {q.length >= 2 && (
        <div className="mt-3 space-y-1.5">
          {resultados.length === 0 ? (
            <p className="py-6 text-center text-sm text-oro-light/40">
              Nadie con ese nombre en este cuadrante.
            </p>
          ) : (
            resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => onElegir(p)}
                className="flex w-full items-center justify-between gap-3 rounded-lg
                           border border-morado-light/30 bg-morado-black/50 px-4 py-3
                           text-left transition-colors hover:border-oro/50 hover:bg-oro/10"
              >
                <span className="truncate text-sm font-semibold text-crema">{p.nombre}</span>
                <span className="shrink-0 text-oro-light/50">→</span>
              </button>
            ))
          )}
        </div>
      )}

      {q.length > 0 && q.length < 2 && (
        <p className="mt-3 text-center text-xs text-oro-light/35">
          Escribe al menos dos letras.
        </p>
      )}
    </div>
  )
}
