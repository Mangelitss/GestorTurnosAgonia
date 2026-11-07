// =============================================================
//  PANEL LATERAL DE COSTALEROS
//
//  Los apuntados a la procesion, con filtros y orden por altura.
//  Desde aqui se arrastran a un puesto del cuadrante, o se rellenan
//  los huecos de la pieza que se este viendo.
// =============================================================

import { useMemo, useState } from 'react'
import { normalizar } from '../lib/censo'
import { preferencia, siglaHombro } from '../lib/hombros'
import { Alerta, Modal } from './ui'

// El Trono lee este tipo al soltar para saber que viene de la lista
export const TIPO_ARRASTRE = 'text/costalero-id'

export const FILTROS_PROCESION = [
  { id: 'todos', label: 'Todos', cumple: () => true },
  { id: 'sin', label: 'Sin asignar', cumple: (a) => a.length === 0 },
  { id: 'trono', label: 'En trono', cumple: (a) => a.some((x) => x.pieza === 'trono') },
  { id: 'cruz', label: 'En cruz', cumple: (a) => a.some((x) => x.pieza === 'cruz') },
  { id: 'varios', label: 'Más de un turno', cumple: (a) => a.length > 1 },
]

export default function PanelCostaleros({
  apuntados,            // costaleros del censo
  asignaciones,         // id -> [{ pieza, turno }]
  censoPorId,
  nombrePieza,
  puedeArrastrar,
  puedeCompletar,
  soloLectura,
  onCompletar,          // (conRepetidores) => void
  filtros = FILTROS_PROCESION,
  ausentes = null,      // Set de ids que no han venido (ensayos)
  onHaLlegado = null,   // (costalero) => void
  abiertoInicial = true,
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  const [filtro, setFiltro] = useState('todos')
  const [texto, setTexto] = useState('')
  const [altosPrimero, setAltosPrimero] = useState(true)
  const [conRepetidores, setConRepetidores] = useState(false)

  const asigDe = (c) => asignaciones[c.id] || []

  const cuentas = useMemo(() => {
    const m = {}
    filtros.forEach((f) => {
      m[f.id] = apuntados.filter((c) => f.cumple(asignaciones[c.id] || [], c)).length
    })
    return m
  }, [apuntados, asignaciones, filtros])

  const lista = useMemo(() => {
    const q = normalizar(texto)
    const cumple = filtros.find((f) => f.id === filtro).cumple
    return apuntados
      .filter((c) => cumple(asignaciones[c.id] || [], c))
      .filter((c) => !q || normalizar(c.nombre).includes(q))
      .sort((a, b) => {
        const dif = (Number(a.altura) || 0) - (Number(b.altura) || 0)
        if (dif) return altosPrimero ? -dif : dif
        return a.nombre.localeCompare(b.nombre, 'es')
      })
  }, [apuntados, asignaciones, filtros, filtro, texto, altosPrimero])

  return (
    <aside className="sticky top-4 shrink-0 hidden md:flex items-stretch max-h-[calc(100vh-2rem)]">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        title={abierto ? 'Ocultar costaleros' : 'Mostrar costaleros'}
        className="w-8 min-h-[150px] flex items-center justify-center gap-2 rounded-l-xl bg-morado text-oro-light
                   text-xs font-semibold shadow-suave hover:bg-morado-light transition-colors
                   [writing-mode:vertical-rl]"
      >
        <span aria-hidden="true" className={`transition-transform duration-300 ${abierto ? '-rotate-90' : 'rotate-90'}`}>▾</span>
        Costaleros ({apuntados.length})
      </button>

      <div
        className={`overflow-hidden transition-[width,opacity] duration-300 ease-posarse ${
          abierto ? 'w-[300px] opacity-100' : 'w-0 opacity-0'
        }`}
        aria-hidden={!abierto}
      >
        <div className="w-[300px] h-full max-h-[calc(100vh-2rem)] flex flex-col bg-white border border-l-0
                        border-slate-200/80 rounded-r-2xl shadow-suave">
          <div className="p-3 space-y-2.5 border-b border-slate-200">
            <p className="text-xs text-slate-500">
              <b className="text-morado">{apuntados.length}</b> apuntados ·{' '}
              <b className={cuentas.sin ? 'text-amber-700' : 'text-emerald-700'}>{cuentas.sin}</b> sin asignar
              {ausentes?.size > 0 && <> · <b className="text-red-700">{ausentes.size}</b> ausentes</>}
            </p>

            <input
              className="input py-1.5"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre…"
            />

            <div className="flex flex-wrap gap-1">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  aria-pressed={filtro === f.id}
                  className={`chip border transition-colors ${
                    filtro === f.id
                      ? 'bg-morado text-white border-morado'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-morado'
                  }`}
                >
                  {f.label} ({cuentas[f.id]})
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAltosPrimero((v) => !v)}
              className="text-xs font-semibold text-morado hover:underline"
            >
              Altura: {altosPrimero ? 'de más alto a más bajo ↓' : 'de más bajo a más alto ↑'}
            </button>
          </div>

          <ul className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {lista.length === 0 ? (
              <li className="text-sm text-slate-400 text-center py-8">Nadie con este filtro.</li>
            ) : lista.map((c) => (
              <Fila
                key={c.id}
                costalero={c}
                asignado={asigDe(c)}
                censoPorId={censoPorId}
                arrastrable={puedeArrastrar && !ausentes?.has(c.id)}
                ausente={!!ausentes?.has(c.id)}
                onHaLlegado={onHaLlegado}
              />
            ))}
          </ul>

          {!soloLectura && (
            <div className="p-3 border-t border-slate-200 space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conRepetidores}
                  onChange={(e) => setConRepetidores(e.target.checked)}
                />
                Usar también posibles repetidores
              </label>
              <button
                type="button"
                onClick={() => onCompletar(conRepetidores)}
                disabled={!puedeCompletar}
                title={puedeCompletar ? undefined : 'Esta pieza no tiene huecos libres'}
                className="btn-morado w-full text-xs"
              >
                Completar huecos de {nombrePieza}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function Fila({ costalero: c, asignado, censoPorId, arrastrable, ausente, onHaLlegado }) {
  const sigla = siglaHombro(preferencia({ costalero_id: c.id, pref_hombro: c.pref_hombro }, censoPorId))

  return (
    <li
      draggable={arrastrable}
      onDragStart={(e) => {
        e.dataTransfer.setData(TIPO_ARRASTRE, c.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className={`rounded-lg border px-2.5 py-1.5 transition-colors ${
        ausente
          ? 'border-red-200 bg-red-50'
          : asignado.length ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50'
      } ${arrastrable ? 'cursor-grab active:cursor-grabbing hover:border-oro' : ''}`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-slate-800" title={c.nombre}>
          {c.nombre}
        </span>
        {sigla && (
          <span className="text-[9px] font-bold text-sky-600" title="Hombro preferido">({sigla})</span>
        )}
        {c.puede_repetir === true && (
          <span className="text-[9px] font-bold text-amber-700" title="Puede repetir turno">R</span>
        )}
        <span className="text-[11px] text-slate-500 tabular-nums shrink-0">{c.altura} cm</span>
      </div>
      {ausente ? (
        <p className="flex items-center justify-between gap-2 text-[11px] font-semibold text-red-700">
          No ha venido
          {onHaLlegado && (
            <button type="button" onClick={() => onHaLlegado(c)} className="text-morado underline min-h-[24px]">
              Ha llegado
            </button>
          )}
        </p>
      ) : (
        <p className={`text-[11px] truncate ${asignado.length ? 'text-slate-500' : 'text-amber-700 font-semibold'}`}>
          {asignado.length
            ? asignado.map((a) => `${a.pieza === 'cruz' ? 'Cruz' : 'Trono'} ${a.turno}`).join(' · ')
            : 'Sin asignar'}
        </p>
      )}
    </li>
  )
}

// =============================================================
//  VISTA PREVIA DE "COMPLETAR HUECOS"
// =============================================================
export function ModalCompletar({ resultado, cuadrante, nombrePieza, onCerrar, onAplicar }) {
  const hay = !!resultado
  const colocados = resultado?.colocados || []
  const fuera = resultado?.fuera || []

  const puesto = (ref) => {
    if (!ref) return ''
    const seccion = ref.seccion === 'Detras' ? 'detrás' : 'delante'
    return `Turno ${cuadrante?.[ref.t]?.id} · ${ref.vara}, ${seccion}, puesto ${ref.i + 1}`
  }

  return (
    <Modal abierto={hay} onCerrar={onCerrar} titulo={`Completar huecos de ${nombrePieza}`} ancho="max-w-2xl">
      <div className="space-y-4">
        {colocados.length === 0 ? (
          <Alerta tipo="aviso">
            Nadie puede entrar sin romper el orden de alturas o los hombros, o no queda
            nadie disponible.
          </Alerta>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Entrarían <b>{colocados.length}</b> costalero(s).
              {resultado?.movidos > 0 && <> Para mantener el orden de alturas se correrán <b>{resultado.movidos}</b> puesto(s).</>}
            </p>
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {colocados.map(({ persona, ref, repetidor }) => (
                <li key={`${persona.costalero_id}-${ref?.t}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {persona.nombre}
                    {repetidor && <span className="text-amber-700"> (R)</span>}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums shrink-0">{persona.altura} cm</span>
                  <span className="text-xs text-slate-600 shrink-0">{puesto(ref)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {fuera.length > 0 && (
          <Alerta tipo="aviso">
            Se quedan sin colocar <b>{fuera.length}</b>: {fuera.map((p) => p.nombre).join(' · ')}
          </Alerta>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="button" onClick={onAplicar} disabled={!colocados.length} className="btn-morado">
            Aplicar
          </button>
        </div>
      </div>
    </Modal>
  )
}
