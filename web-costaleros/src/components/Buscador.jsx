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
      <p className="titulo mb-1 text-center text-[14px]">Busca tu nombre</p>
      <p className="prosa mb-3.5 text-center text-[16px] italic text-oro-light/65">
        Para ver tu puesto y tus tramos
      </p>

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
        <div className="mt-3 divide-y divide-oro/15 border-y border-oro/15">
          {resultados.length === 0 ? (
            <p className="animate-aparecer py-6 text-center font-texto text-[16px] italic text-oro-light/60">
              Nadie con ese nombre en este cuadrante.
            </p>
          ) : (
            resultados.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onElegir(p)}
                className="flex min-h-[52px] w-full animate-subir items-center justify-between gap-3 px-2
                           text-left transition-colors duration-500 active:bg-oro/10"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms`, animationDuration: '0.55s' }}
              >
                <span className="truncate text-[15px] font-semibold text-crema">{p.nombre}</span>
                <span className="shrink-0 text-xl leading-none text-oro/70" aria-hidden="true">›</span>
              </button>
            ))
          )}
        </div>
      )}

      {q.length > 0 && q.length < 2 && (
        <p className="mt-3 text-center font-texto text-[15px] italic text-oro-light/50">
          Escribe al menos dos letras.
        </p>
      )}
    </div>
  )
}
