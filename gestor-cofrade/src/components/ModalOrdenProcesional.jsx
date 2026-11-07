// =============================================================
//  ORDEN PROCESIONAL DE UN COSTALERO
//  Tramo a tramo: qué coge o con qué descansa.
// =============================================================

import { useMemo } from 'react'
import {
  ordenProcesional, resumenOrden, describirPosicion,
  ROL_DESCANSO_POR_DEFECTO,
} from '../lib/conflictos'
import { PIEZAS, FASES } from '../lib/constantes'
import { Modal, Alerta } from './ui'

export default function ModalOrdenProcesional({
  persona,          // { costalero_id, nombre, altura }
  procesion,
  conflictos,
  soloLectura,
  onCerrar,
  onCambiar,
}) {
  const orden = useMemo(
    () => (persona ? ordenProcesional(procesion, persona.costalero_id) : []),
    [persona, procesion]
  )

  const resumen = useMemo(() => resumenOrden(orden), [orden])

  const susConflictos = useMemo(
    () => (conflictos?.incidencias || []).filter((i) => i.costalero_id === persona?.costalero_id),
    [conflictos, persona]
  )

  if (!persona) return null

  // --- Cambiar el cometido de un tramo de descanso ---
  const cambiarRol = (tramoId, valor) => {
    const actuales = procesion.roles_descanso || {}
    const suyos = { ...(actuales[persona.costalero_id] || {}) }

    const limpio = valor.trim()
    if (!limpio || limpio.toLowerCase() === ROL_DESCANSO_POR_DEFECTO.toLowerCase()) {
      delete suyos[tramoId]
    } else {
      suyos[tramoId] = limpio
    }

    onCambiar({
      roles_descanso: { ...actuales, [persona.costalero_id]: suyos },
    })
  }

  // Nota personal
  const nota = procesion.notas_costalero?.[persona.costalero_id] || ''
  const cambiarNota = (v) => {
    onCambiar({
      notas_costalero: { ...(procesion.notas_costalero || {}), [persona.costalero_id]: v },
    })
  }

  return (
    <Modal
      abierto={!!persona}
      onCerrar={onCerrar}
      titulo="Orden procesional"
      ancho="max-w-2xl"
    >
      {/* ---- Cabecera ---- */}
      <div className="mb-5">
        <h3 className="font-serif text-xl font-bold text-morado">{persona.nombre}</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          {persona.altura} cm de hombro · {procesion.nombre}
        </p>
      </div>

      {/* ---- Resumen ---- */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <Dato valor={resumen.total} etiqueta="Tramos" />
        <Dato valor={resumen.trono} etiqueta="Trono" color="morado" />
        <Dato valor={resumen.cruz} etiqueta="Cruz" color="azul" />
        <Dato valor={resumen.descansando} etiqueta="Descansa" color="gris" />
      </div>

      {/* ---- Conflictos ---- */}
      {susConflictos.length > 0 && (
        <div className="mb-5 space-y-2">
          {susConflictos.map((c, k) => (
            <Alerta key={k} tipo={c.tipo === 'DUPLICADO' ? 'error' : 'aviso'}>
              {c.detalle}
            </Alerta>
          ))}
        </div>
      )}

      {/* ---- Recorrido tramo a tramo ---- */}
      {orden.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Esta procesión todavía no tiene tramos definidos.
        </p>
      ) : (
        <div className="space-y-2">
          {orden.map((o, i) => {
            const nuevaFase =
              i === 0 || (orden[i - 1].tramo.fase || 'ida') !== (o.tramo.fase || 'ida')

            return (
              <div key={o.tramo.id}>
                {nuevaFase && (
                  <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
                    <span className="text-[10px] font-bold text-oro-dark uppercase tracking-widest">
                      {FASES[o.tramo.fase || 'ida'].icono}{' '}
                      {FASES[o.tramo.fase || 'ida'].nombre}
                    </span>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>
                )}

                <FilaTramo
                  dato={o}
                  soloLectura={soloLectura}
                  onCambiarRol={(v) => cambiarRol(o.tramo.id, v)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* ---- Nota personal ---- */}
      <div className="mt-5 pt-5 border-t border-slate-200">
        <label className="label">Nota personal para este costalero</label>
        <input
          className="input"
          value={nota}
          disabled={soloLectura}
          onChange={(e) => cambiarNota(e.target.value)}
          placeholder="Ej: llega tarde, se incorpora en el segundo tramo…"
        />
      </div>

      <div className="flex justify-end mt-5">
        <button onClick={onCerrar} className="btn-ghost">Cerrar</button>
      </div>
    </Modal>
  )
}

// =============================================================
//  PIEZAS
// =============================================================

function Dato({ valor, etiqueta, color = 'neutro' }) {
  const estilos = {
    neutro: 'bg-slate-50 text-slate-700',
    morado: 'bg-morado/10 text-morado',
    azul: 'bg-sky-100 text-sky-800',
    gris: 'bg-slate-100 text-slate-500',
  }
  return (
    <div className={`rounded-lg p-3 text-center ${estilos[color]}`}>
      <p className="text-xl font-bold leading-none">{valor}</p>
      <p className="text-[10px] mt-1 uppercase tracking-wide opacity-70">{etiqueta}</p>
    </div>
  )
}

function FilaTramo({ dato, soloLectura, onCambiarRol }) {
  const { tramo, recorrido, carga, partes, duplicado, rol, personalizado } = dato

  // --- Descansa ---
  if (!carga) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {tramo.nombre}
            {recorrido && (
              <span className="font-normal text-slate-400 text-xs ml-2">{recorrido}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-400">Descansa</span>
          {soloLectura ? (
            <span className={`chip ${personalizado ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
              {rol}
            </span>
          ) : (
            <input
              className={`input py-1 px-2 text-xs w-28 text-center
                          ${personalizado ? 'border-amber-300 bg-amber-50' : ''}`}
              value={rol}
              onChange={(e) => onCambiarRol(e.target.value)}
              title="Cometido durante este tramo. Por defecto Cirio."
            />
          )}
        </div>
      </div>
    )
  }

  // --- Carga ---
  return (
    <div className={`px-4 py-2.5 rounded-lg border ${
      duplicado
        ? 'border-red-300 bg-red-50'
        : partes[0].pieza === 'cruz'
          ? 'border-sky-200 bg-sky-50/60'
          : 'border-morado/25 bg-morado/5'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          duplicado ? 'bg-red-600 animate-pulse-fast' : PIEZAS[partes[0].pieza].punto
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {tramo.nombre}
            {recorrido && (
              <span className="font-normal text-slate-400 text-xs ml-2">{recorrido}</span>
            )}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          {partes.map((p, k) => (
            <span key={k} className={`chip ${PIEZAS[p.pieza].chip}`}>
              Turno {p.turno} · {PIEZAS[p.pieza].nombre}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-1 ml-5.5 pl-0.5">
        {partes.map((p) => describirPosicion(p.ref)).join(' · ')}
      </p>

      {duplicado && (
        <p className="text-[11px] text-red-700 font-semibold mt-1 ml-5.5 pl-0.5">
          ⚠️ No puede llevar el trono y la cruz en el mismo tramo.
        </p>
      )}
    </div>
  )
}
