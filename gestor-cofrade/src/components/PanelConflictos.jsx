// =============================================================
//  PANEL Y LEYENDA DE CONFLICTOS
// =============================================================

import { useState } from 'react'
import { LISTA_CONFLICTOS, CONFLICTOS } from '../lib/constantes'

// --- Leyenda de colores ---
export function LeyendaConflictos({ compacta = false }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${compacta ? 'text-[11px]' : 'text-xs'}`}>
      <span className="text-slate-400 font-semibold uppercase tracking-wide">Leyenda:</span>
      {LISTA_CONFLICTOS.map((c) => (
        <span key={c.id} className="flex items-center gap-1.5 text-slate-600" title={c.descripcion}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.punto}
                            ${c.id === 'DUPLICADO' ? 'animate-pulse-fast' : ''}`} />
          {c.corto}
          {c.bloquea_publicacion && <span className="text-red-500 font-bold">*</span>}
        </span>
      ))}
      <span className="text-slate-400">
        <span className="text-red-500 font-bold">*</span> impide publicar
      </span>
    </div>
  )
}

// --- Leyenda de piezas (trono / cruz) ---
export function LeyendaPiezas() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <span className="flex items-center gap-1.5 text-slate-600">
        <span className="w-2.5 h-2.5 rounded-full bg-morado shrink-0" /> Trono
      </span>
      <span className="flex items-center gap-1.5 text-slate-600">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" /> Cruz Guía
      </span>
    </div>
  )
}

// --- Panel con el detalle de los conflictos ---
export default function PanelConflictos({ resultado, compacto = false }) {
  const [abierto, setAbierto] = useState(null)

  if (!resultado) return null

  const { porTipo, total, bloqueantes, puedePublicar } = resultado

  if (total === 0) {
    return (
      <div className="card p-4 border-emerald-200 bg-emerald-50/50">
        <p className="text-sm text-emerald-800 font-semibold flex items-center gap-2">
          <span>✓</span> No hay ningún conflicto. El cuadrante está limpio.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className={`px-5 py-3 border-b ${
        puedePublicar
          ? 'bg-amber-50 border-amber-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className={`text-sm font-bold ${puedePublicar ? 'text-amber-800' : 'text-red-800'}`}>
            {puedePublicar
              ? `${total} aviso(s) — puedes publicar`
              : `${bloqueantes} conflicto(s) impiden publicar`}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {LISTA_CONFLICTOS.map((c) => {
              const n = porTipo[c.id]?.length || 0
              if (!n) return null
              return (
                <button
                  key={c.id}
                  onClick={() => setAbierto(abierto === c.id ? null : c.id)}
                  className={`chip ${c.chip} cursor-pointer hover:opacity-80 transition`}
                >
                  {c.corto}: {n}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {LISTA_CONFLICTOS.map((c) => {
          const lista = porTipo[c.id] || []
          if (!lista.length) return null
          const desplegado = abierto === null || abierto === c.id

          return (
            <div key={c.id}>
              <button
                onClick={() => setAbierto(abierto === c.id ? null : c.id)}
                className="w-full flex items-center gap-2.5 px-5 py-2.5 hover:bg-slate-50 transition text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.punto}`} />
                <span className="font-semibold text-sm text-slate-800 flex-1">
                  {c.nombre}
                </span>
                <span className="chip bg-slate-100 text-slate-600">{lista.length}</span>
                {c.bloquea_publicacion && (
                  <span className="chip bg-red-100 text-red-700">Bloquea</span>
                )}
                <span className="text-slate-400 text-xs">{desplegado ? '▾' : '▸'}</span>
              </button>

              {desplegado && (
                <ul className="px-5 pb-3 space-y-1">
                  {lista.slice(0, compacto ? 5 : 50).map((i, k) => (
                    <li key={k} className="text-xs text-slate-600 flex gap-2 pl-5">
                      <span className="text-slate-300">•</span>
                      <span>
                        <b className="text-slate-800">{i.nombre}</b> — {i.detalle}
                      </span>
                    </li>
                  ))}
                  {compacto && lista.length > 5 && (
                    <li className="text-xs text-slate-400 pl-7">
                      … y {lista.length - 5} más
                    </li>
                  )}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
