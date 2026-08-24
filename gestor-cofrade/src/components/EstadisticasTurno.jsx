// =============================================================
//  PANEL DE ESTADISTICAS DE UN TURNO
// =============================================================

import { useState } from 'react'
import { SECCIONES } from '../lib/constantes'
import { varasDeTurno } from '../lib/cuadrante'
import { escalaCalor, RANGO_AVISO_CM, FLEXION_VARA_CM } from '../lib/estadisticas'

// --- Resumen compacto bajo cada vara ---
export function ResumenVara({ stats, vara, seccion }) {
  const g = stats?.grupos?.[vara]?.[seccion]
  if (!g) return null

  const alerta = g.rango > RANGO_AVISO_CM

  return (
    <div className={`text-[10px] text-center px-1 py-1 rounded mt-1 ${
      alerta ? 'bg-amber-50 text-amber-800' : 'text-slate-400'
    }`}>
      {g.ocupadas > 0 ? (
        <>
          <span className="tabular-nums">{g.media.toFixed(0)} cm</span>
          {g.ocupadas > 1 && (
            <>
              {' · '}
              <span className={`tabular-nums ${alerta ? 'font-bold' : ''}`}>
                ±{g.rango}
              </span>
            </>
          )}
          {' · '}
          <span className="tabular-nums">{g.peso.toFixed(0)} kg</span>
          {g.sinTocar > 0 && (
            <span className="block text-red-600 font-semibold">
              {g.sinTocar} sin tocar
            </span>
          )}
        </>
      ) : (
        <span>—</span>
      )}
    </div>
  )
}

// --- Panel completo desplegable ---
export default function EstadisticasTurno({ stats, turno }) {
  const [abierto, setAbierto] = useState(false)
  if (!stats) return null

  const varas = varasDeTurno(turno)

  return (
    <div className="border-t border-slate-200">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="w-full flex items-center gap-2.5 px-5 py-2.5 hover:bg-slate-50 transition text-left"
      >
        <span className="text-sm font-semibold text-slate-600">📊 Estadísticas</span>

        {stats.avisos.length > 0 && (
          <span className="chip bg-amber-100 text-amber-800">
            {stats.avisos.length} aviso{stats.avisos.length === 1 ? '' : 's'}
          </span>
        )}

        <span className="flex-1" />
        <span className="text-xs text-slate-400">
          {stats.mediaGeneral.toFixed(0)} cm · {stats.pesoTotal} kg
        </span>
        <span className="text-slate-400 text-xs">{abierto ? '▾' : '▸'}</span>
      </button>

      {abierto && (
        <div className="px-5 pb-5 space-y-4 bg-slate-50/50">

          {/* ---- Avisos ---- */}
          {stats.avisos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              {stats.avisos.map((a, i) => (
                <p key={i} className="text-xs text-amber-900 flex gap-1.5">
                  <span>⚠️</span>
                  <span>{a.texto}</span>
                </p>
              ))}
              <p className="text-[10px] text-amber-700/70 pt-1">
                La vara flexiona unos {FLEXION_VARA_CM} cm: por encima de esa
                diferencia, el más bajo deja de tocarla.
              </p>
            </div>
          )}

          {/* ---- Tabla por vara y sección ---- */}
          <div>
            <p className="label mb-2">Por vara</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left py-1.5 font-semibold">Vara</th>
                    <th className="text-center py-1.5 font-semibold">Ocupadas</th>
                    <th className="text-center py-1.5 font-semibold">Media</th>
                    <th className="text-center py-1.5 font-semibold">Rango</th>
                    <th className="text-right py-1.5 font-semibold">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {varas.map((vara) =>
                    SECCIONES.map((sec) => {
                      const g = stats.grupos[vara][sec]
                      const alerta = g.rango > RANGO_AVISO_CM
                      return (
                        <tr key={`${vara}-${sec}`} className={alerta ? 'bg-amber-50' : ''}>
                          <td className="py-1.5 text-slate-700">
                            {vara} <span className="text-slate-400">
                              {sec === 'Detras' ? 'detrás' : 'delante'}
                            </span>
                          </td>
                          <td className="text-center tabular-nums text-slate-600">
                            {g.ocupadas}/{g.plazas}
                          </td>
                          <td className="text-center tabular-nums text-slate-700">
                            {g.ocupadas ? `${g.media.toFixed(1)} cm` : '—'}
                          </td>
                          <td className={`text-center tabular-nums ${
                            alerta ? 'text-amber-800 font-bold' : 'text-slate-600'
                          }`}>
                            {g.ocupadas > 1 ? `${g.rango} cm` : '—'}
                          </td>
                          <td className="text-right tabular-nums text-slate-700">
                            {g.peso.toFixed(0)} kg
                          </td>
                        </tr>
                      )
                    })
                  )}

                  {/* Totales por vara */}
                  {varas.map((vara) => (
                    <tr key={`total-${vara}`} className="bg-slate-100 font-semibold">
                      <td className="py-1.5 text-morado">Total {vara}</td>
                      <td className="text-center tabular-nums text-slate-600">
                        {stats.porVara[vara].ocupadas}/{stats.porVara[vara].plazas}
                      </td>
                      <td className="text-center tabular-nums text-slate-700">
                        {stats.porVara[vara].media.toFixed(1)} cm
                      </td>
                      <td className="text-center tabular-nums text-slate-600">
                        {stats.porVara[vara].rango} cm
                      </td>
                      <td className="text-right tabular-nums text-morado">
                        {stats.porVara[vara].peso.toFixed(0)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- Delante contra detrás ---- */}
          <div>
            <p className="label mb-2">Mitad delantera contra trasera</p>
            <div className="grid grid-cols-2 gap-3">
              {SECCIONES.map((sec) => {
                const m = stats.porMitad[sec]
                return (
                  <div key={sec} className="bg-white rounded-lg border border-slate-200 p-3">
                    <p className="text-[10px] font-bold text-oro-dark uppercase tracking-wide mb-1.5">
                      {sec === 'Detras' ? 'Detrás' : 'Delante'}
                    </p>
                    <p className="text-xl font-bold text-morado tabular-nums leading-none">
                      {m.ocupadas ? `${m.media.toFixed(1)}` : '—'}
                      <span className="text-xs font-normal text-slate-400 ml-1">cm</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {m.ocupadas ? `${m.min}–${m.max} cm · ${m.peso.toFixed(0)} kg` : 'Sin costaleros'}
                    </p>
                  </div>
                )
              })}
            </div>

            {stats.porMitad.Delante.ocupadas > 0 && stats.porMitad.Detras.ocupadas > 0 && (
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Diferencia entre mitades:{' '}
                <b className="text-slate-700">
                  {Math.abs(stats.porMitad.Delante.media - stats.porMitad.Detras.media).toFixed(1)} cm
                </b>
              </p>
            )}
          </div>

          {/* ---- Equilibrio Izq/Der por altura ---- */}
          {stats.equilibrio && <EquilibrioVaras stats={stats} />}
        </div>
      )}
    </div>
  )
}

// =============================================================
//  EQUILIBRIO IZQUIERDA · DERECHA (por altura media)
// =============================================================

function EquilibrioVaras({ stats }) {
  const izq = stats.grupos.Izquierda
  const der = stats.grupos.Derecha
  if (!izq || !der) return null

  const filas = [
    {
      etiqueta: 'Delante',
      i: izq.Delante.media,
      d: der.Delante.media,
      hayI: izq.Delante.ocupadas > 0,
      hayD: der.Delante.ocupadas > 0,
    },
    {
      etiqueta: 'Detrás',
      i: izq.Detras.media,
      d: der.Detras.media,
      hayI: izq.Detras.ocupadas > 0,
      hayD: der.Detras.ocupadas > 0,
    },
  ]

  const totalI = stats.porVara.Izquierda.media
  const totalD = stats.porVara.Derecha.media
  const difTotal = Math.abs(totalI - totalD)

  const colorDif = (dif) =>
    dif >= 3 ? 'text-amber-700' : dif >= 1.5 ? 'text-slate-600' : 'text-emerald-600'

  return (
    <div>
      <p className="label mb-2">Equilibrio izquierda · derecha</p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Cabecera */}
        <div className="grid grid-cols-[1fr_auto_1fr] bg-slate-50 border-b border-slate-200">
          <p className="text-[10px] font-bold text-morado uppercase tracking-wide text-center py-1.5">
            Izquierda
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide text-center py-1.5 px-4">
            Diferencia
          </p>
          <p className="text-[10px] font-bold text-morado uppercase tracking-wide text-center py-1.5">
            Derecha
          </p>
        </div>

        {/* Delante y detrás */}
        {filas.map((f) => {
          const dif = Math.abs(f.i - f.d)
          const hay = f.hayI && f.hayD
          return (
            <div
              key={f.etiqueta}
              className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-100"
            >
              <div className="text-center py-2">
                <p className="text-[9px] text-slate-400 uppercase">{f.etiqueta}</p>
                <p className="text-base font-bold text-slate-700 tabular-nums leading-tight">
                  {f.hayI ? `${f.i.toFixed(1)}` : '—'}
                  {f.hayI && <span className="text-[10px] font-normal text-slate-400 ml-0.5">cm</span>}
                </p>
              </div>

              <div className="text-center px-4">
                <p className={`text-xs font-bold tabular-nums ${hay ? colorDif(dif) : 'text-slate-300'}`}>
                  {hay ? `${dif.toFixed(1)} cm` : '—'}
                </p>
              </div>

              <div className="text-center py-2">
                <p className="text-[9px] text-slate-400 uppercase">{f.etiqueta}</p>
                <p className="text-base font-bold text-slate-700 tabular-nums leading-tight">
                  {f.hayD ? `${f.d.toFixed(1)}` : '—'}
                  {f.hayD && <span className="text-[10px] font-normal text-slate-400 ml-0.5">cm</span>}
                </p>
              </div>
            </div>
          )
        })}

        {/* Media de la vara completa */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-50">
          <div className="text-center py-2">
            <p className="text-[9px] text-slate-400 uppercase">Media de la vara</p>
            <p className="text-lg font-bold text-morado tabular-nums leading-tight">
              {totalI > 0 ? totalI.toFixed(1) : '—'}
              {totalI > 0 && <span className="text-[10px] font-normal text-slate-400 ml-0.5">cm</span>}
            </p>
          </div>

          <div className="text-center px-4">
            <p className={`text-sm font-bold tabular-nums ${colorDif(difTotal)}`}>
              {difTotal.toFixed(1)} cm
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-[9px] text-slate-400 uppercase">Media de la vara</p>
            <p className="text-lg font-bold text-morado tabular-nums leading-tight">
              {totalD > 0 ? totalD.toFixed(1) : '—'}
              {totalD > 0 && <span className="text-[10px] font-normal text-slate-400 ml-0.5">cm</span>}
            </p>
          </div>
        </div>
      </div>

      {difTotal >= 3 && (
        <p className="text-[11px] text-amber-700 mt-1.5 text-center">
          ⚠️ Las dos varas se llevan {difTotal.toFixed(1)} cm: el trono puede escorarse hacia{' '}
          {totalI > totalD ? 'la izquierda' : 'la derecha'}.
        </p>
      )}
    </div>
  )
}

// --- Leyenda del mapa de calor ---
export function LeyendaCalor({ stats }) {
  if (!stats) return null
  const escala = escalaCalor(stats)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="text-slate-400 font-semibold uppercase tracking-wide">
          Peso que carga:
        </span>
        <div className="flex rounded overflow-hidden border border-slate-200">
          {escala.map((e, i) => (
            <span
              key={i}
              className="px-2 py-0.5 tabular-nums"
              style={{ backgroundColor: e.fondo, color: e.texto }}
            >
              {e.etiqueta}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Mientras el mapa esté encendido, los colores de conflicto y de repetidor
        quedan ocultos para que solo se lea el peso. Al apagarlo vuelven.
      </p>
    </div>
  )
}
