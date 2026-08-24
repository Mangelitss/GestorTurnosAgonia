// =============================================================
//  PESTAÑA DE PUBLICAR
//  Revisión de conflictos, textos, normativa y publicación.
// =============================================================

import { useMemo, useState } from 'react'
import { reordenarTramos } from '../lib/procesiones'
import { cargaPorCostalero, describirPosicion, ordenProcesional } from '../lib/conflictos'
import { ocupantes } from '../lib/cuadrante'
import { PIEZAS, CONFLICTOS } from '../lib/constantes'
import { normalizar } from '../lib/censo'
import { pdfProcesion } from '../lib/pdf'
import PanelConflictos, { LeyendaConflictos, LeyendaPiezas } from './PanelConflictos'
import { Alerta, Modal } from './ui'

export default function PestanaPublicar({
  procesion,
  conflictos,
  soloLectura,
  onCambiar,
  avisar,
}) {
  const [verCostaleros, setVerCostaleros] = useState(false)
  const tramos = useMemo(() => reordenarTramos(procesion.tramos || []), [procesion.tramos])

  const listo = conflictos?.puedePublicar

  // --- Comprobaciones previas ---
  const revisiones = useMemo(() => {
    const r = []

    r.push({
      ok: !!procesion.cuadrante_trono,
      texto: 'Los turnos del trono están generados',
    })

    if (procesion.lleva_cruz) {
      r.push({
        ok: !!procesion.cuadrante_cruz,
        texto: 'Los turnos de la cruz están generados',
      })
    }

    const sinTurno = tramos.filter((t) => !t.turno_trono)
    r.push({
      ok: tramos.length > 0 && sinTurno.length === 0,
      texto: tramos.length === 0
        ? 'No hay ningún tramo definido'
        : sinTurno.length > 0
          ? `${sinTurno.length} tramo(s) sin turno de trono`
          : 'Todos los tramos tienen turno asignado',
    })

    r.push({
      ok: conflictos?.puedePublicar,
      texto: conflictos?.puedePublicar
        ? 'No hay conflictos rojos sin resolver'
        : `${conflictos?.bloqueantes || 0} conflicto(s) rojo(s) sin resolver`,
      critico: true,
    })

    return r
  }, [procesion, tramos, conflictos])

  const todoOk = revisiones.every((r) => r.ok)

  return (
    <div className="space-y-6">

      {/* ---- Estado de la revisión ---- */}
      <div className={`card p-5 ${listo && todoOk ? 'border-emerald-300 bg-emerald-50/40' : ''}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-serif text-lg font-bold text-morado mb-1">
              {listo && todoOk ? '✓ El cuadrante está listo' : 'Revisión del cuadrante'}
            </h3>
            <p className="text-sm text-slate-600">
              {listo && todoOk
                ? 'Todo correcto. Puedes llevarlo al módulo de publicación.'
                : 'Repasa las comprobaciones y los conflictos de más abajo.'}
            </p>
          </div>

          <button onClick={() => pdfProcesion(procesion)} className="btn-ghost text-sm">
            📄 Descargar PDF
          </button>
        </div>
      </div>

      <Alerta tipo="info">
        La publicación en la web se hará desde un <b>módulo aparte</b> del programa.
        Aquí solo se revisa el cuadrante y se preparan los textos.
        El botón de PDF se queda de momento hasta que montemos ese módulo.
      </Alerta>

      {/* ---- Revisiones ---- */}
      <div className="card p-5">
        <h3 className="font-serif text-base font-bold text-morado mb-4">
          Comprobaciones
        </h3>
        <ul className="space-y-2.5">
          {revisiones.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className={`shrink-0 ${r.ok ? 'text-emerald-600' : r.critico ? 'text-red-600' : 'text-amber-600'}`}>
                {r.ok ? '✓' : r.critico ? '⛔' : '⚠️'}
              </span>
              <span className={r.ok ? 'text-slate-600' : 'text-slate-800 font-medium'}>
                {r.texto}
              </span>
            </li>
          ))}
        </ul>

        {!todoOk && listo && (
          <div className="mt-4">
            <Alerta tipo="aviso">
              Hay cosas sin terminar, pero ninguna es bloqueante.
            </Alerta>
          </div>
        )}
      </div>

      {/* ---- Conflictos ---- */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-serif text-base font-bold text-morado">Conflictos</h3>
          <LeyendaConflictos compacta />
        </div>
        <PanelConflictos resultado={conflictos} />
      </div>

      {/* ---- Vista por costalero ---- */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-serif text-base font-bold text-morado mb-1">
              Indicaciones por costalero
            </h3>
            <p className="text-sm text-slate-500">
              En qué tramos carga cada uno y con qué pieza. Es lo que verán en la web.
            </p>
          </div>
          <button onClick={() => setVerCostaleros(true)} className="btn-ghost text-sm">
            👥 Ver indicaciones
          </button>
        </div>
        <div className="mt-3">
          <LeyendaPiezas />
        </div>
      </div>

      {/* ---- Textos de los tramos ---- */}
      <div className="card overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <h3 className="font-serif text-base font-bold text-morado">
            Indicaciones de cada tramo
          </h3>
        </div>

        {tramos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            No hay tramos definidos.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tramos.map((t, i) => (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="w-6 h-6 rounded-full bg-morado/10 text-morado
                                   flex items-center justify-center text-[11px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-sm text-slate-800">
                    {t.nombre}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.desde || '—'} → {t.hasta || '—'}
                  </span>
                  <span className={`chip ${PIEZAS.trono.chip}`}>Trono {t.turno_trono || '—'}</span>
                  {t.turno_cruz && (
                    <span className={`chip ${PIEZAS.cruz.chip}`}>Cruz {t.turno_cruz}</span>
                  )}
                </div>
                <textarea
                  className="input min-h-[70px] resize-y text-sm"
                  value={t.texto || ''}
                  disabled={soloLectura}
                  onChange={(e) => {
                    onCambiar({
                      tramos: tramos.map((x) =>
                        x.id === t.id ? { ...x, texto: e.target.value } : x
                      ),
                    })
                  }}
                  placeholder="Indicaciones para este tramo…"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Normativa ---- */}
      <div className="card p-5">
        <h3 className="font-serif text-base font-bold text-morado mb-1">
          Normativa de la cuadrilla
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          Saldrá al final del PDF y en la web de costaleros.
        </p>
        <textarea
          className="input min-h-[140px] resize-y"
          value={procesion.normativa || ''}
          disabled={soloLectura}
          onChange={(e) => onCambiar({ normativa: e.target.value })}
          placeholder="Normas de la cuadrilla, indicaciones generales, hora de convocatoria…"
        />
      </div>

      <ModalCostaleros
        abierto={verCostaleros}
        procesion={procesion}
        conflictos={conflictos}
        soloLectura={soloLectura}
        onCerrar={() => setVerCostaleros(false)}
        onCambiar={onCambiar}
      />
    </div>
  )
}

// =============================================================
//  MODAL: INDICACIONES POR COSTALERO
// =============================================================

function ModalCostaleros({ abierto, procesion, conflictos, soloLectura, onCerrar, onCambiar }) {
  const [busqueda, setBusqueda] = useState('')

  const fichas = useMemo(() => {
    if (!abierto) return []

    const cargas = cargaPorCostalero(procesion)
    const nombres = {}

    ;[procesion.cuadrante_trono, procesion.cuadrante_cruz].forEach((c) => {
      if (!c) return
      ocupantes(c).forEach(({ p }) => {
        if (p.costalero_id) nombres[p.costalero_id] = p.nombre
      })
    })

    return Object.entries(cargas)
      .map(([id, lista]) => ({
        id,
        nombre: nombres[id] || '—',
        orden: ordenProcesional(procesion, id),
        conflictos: (conflictos?.incidencias || []).filter((i) => i.costalero_id === id),
      }))
      .sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre)))
  }, [abierto, procesion, conflictos])

  const q = normalizar(busqueda)
  const visibles = q ? fichas.filter((f) => normalizar(f.nombre).includes(q)) : fichas

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Indicaciones por costalero (${fichas.length})`}
      ancho="max-w-3xl"
    >
      <input
        className="input mb-4"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar costalero…"
      />

      <div className="mb-4">
        <LeyendaPiezas />
      </div>

      <div className="space-y-3">
        {visibles.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {fichas.length === 0
              ? 'Todavía no hay nadie asignado a ningún tramo.'
              : 'Sin resultados.'}
          </p>
        ) : (
          visibles.map((f) => (
            <div key={f.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                <p className="font-semibold text-sm text-slate-800">{f.nombre}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {f.conflictos.map((c, k) => (
                    <span key={k} className={`chip ${CONFLICTOS[c.tipo]?.chip}`}>
                      {CONFLICTOS[c.tipo]?.corto}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="space-y-1 mb-3">
                {f.orden.map((o, k) => (
                  <li key={k} className="flex items-start gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                      !o.carga ? 'bg-slate-300' : PIEZAS[o.partes[0].pieza].punto
                    }`} />
                    <span className={o.carga ? 'text-slate-700' : 'text-slate-400'}>
                      <b className={o.carga ? 'text-slate-800' : 'text-slate-500'}>
                        {o.tramo.nombre}
                      </b>
                      {': '}
                      {o.carga
                        ? o.partes.map((p) => `Turno ${p.turno} (${PIEZAS[p.pieza].nombre})`).join(' + ')
                        : `Descansa (${o.rol})`}
                      {o.recorrido && (
                        <span className="text-slate-400"> · {o.recorrido}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <input
                className="input text-xs py-1.5"
                value={procesion.notas_costalero?.[f.id] || ''}
                disabled={soloLectura}
                onChange={(e) => {
                  onCambiar({
                    notas_costalero: {
                      ...(procesion.notas_costalero || {}),
                      [f.id]: e.target.value,
                    },
                  })
                }}
                placeholder="Nota personal para este costalero…"
              />
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
