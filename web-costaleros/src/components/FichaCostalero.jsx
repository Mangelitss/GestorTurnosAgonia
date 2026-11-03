// =============================================================
//  LO QUE LE INTERESA AL COSTALERO
//
//  Tramo a tramo: cuando carga, con que turno y que pieza, y
//  cuando descansa con que cometido. Debajo, su sitio exacto en
//  la vara y el cuadrante entero de su turno.
// =============================================================

import { useMemo, useState } from 'react'
import {
  ordenProcesional, resumenOrden, cargaPorCostalero, describirPosicion,
} from '@nucleo/conflictos'
import { PIEZAS } from '@nucleo/constantes'
import CuadranteTurno from './CuadranteTurno'
import { Rotulo } from './ui'

export default function FichaCostalero({ procesion, persona, marcas = {}, onCambiar }) {
  const [verCuadrante, setVerCuadrante] = useState(false)

  const { orden, resumen, puestos, nota } = useMemo(() => {
    const orden = ordenProcesional(procesion, persona.id)
    const cargas = cargaPorCostalero(procesion)[persona.id] || []

    // Un mismo turno aparece en varios tramos: el puesto es el mismo,
    // asi que se agrupa para no repetirlo tres veces.
    const vistos = new Set()
    const puestos = []
    cargas.forEach((c) => {
      const clave = `${c.pieza}-${c.turno}`
      if (vistos.has(clave)) return
      vistos.add(clave)
      puestos.push({ pieza: c.pieza, turno: c.turno, ref: c.ref })
    })

    return {
      orden,
      resumen: resumenOrden(orden),
      puestos,
      nota: procesion.notas_costalero?.[persona.id] || '',
    }
  }, [procesion, persona.id])

  return (
    <div className="animate-subir space-y-6">

      {/* ---- Quien es y que le toca ---- */}
      <div className="rounded-xl border border-oro/40 bg-morado-dark/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="etiqueta mb-1">Tu orden procesional</p>
            <h2 className="font-titulo text-2xl font-bold text-oro-light">
              {persona.nombre}
            </h2>
          </div>
          <button onClick={onCambiar} className="btn-linea text-xs">
            No soy yo
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Dato valor={resumen.cargando} texto={resumen.cargando === 1 ? 'tramo cargando' : 'tramos cargando'} />
          <Dato valor={resumen.descansando} texto="descansando" />
          <Dato valor={resumen.total} texto="tramos en total" />
        </div>

        {puestos.length > 0 && (
          <div className="mt-4 space-y-2">
            {puestos.map((p, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border
                           border-oro/20 bg-morado-black/40 px-3 py-2 text-sm"
              >
                <span className={`chip rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  p.pieza === 'cruz'
                    ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40'
                    : 'bg-oro/20 text-oro-light ring-1 ring-oro/40'
                }`}>
                  {PIEZAS[p.pieza].nombre} · Turno {p.turno}
                </span>
                <span className="text-crema/80">{describirPosicion(p.ref)}</span>
              </div>
            ))}
          </div>
        )}

        {nota && (
          <div className="mt-4 rounded-lg border-l-4 border-oro bg-oro/10 px-4 py-3">
            <p className="etiqueta mb-1">Nota del cuadrillero</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-crema">{nota}</p>
          </div>
        )}
      </div>

      {/* ---- Tramo a tramo ---- */}
      <div>
        <Rotulo>Tramo a tramo</Rotulo>
        <ol className="space-y-2">
          {orden.map((o, i) => (
            <Paso key={o.tramo.id || i} paso={o} numero={i + 1} />
          ))}
        </ol>
      </div>

      {/* ---- Su turno al completo ---- */}
      {puestos.length > 0 && (
        <div>
          <Rotulo>Con quién vas</Rotulo>

          {!verCuadrante ? (
            <button onClick={() => setVerCuadrante(true)} className="btn-linea w-full">
              Ver el cuadrante {puestos.length > 1 ? 'de mis turnos' : 'de mi turno'}
            </button>
          ) : (
            <div className="space-y-4">
              {puestos.map((p, i) => {
                const cuadrante = p.pieza === 'cruz'
                  ? procesion.cuadrante_cruz
                  : procesion.cuadrante_trono
                const turno = (cuadrante || []).find((t) => t.id === p.turno)
                return (
                  <CuadranteTurno
                    key={i}
                    turno={turno}
                    pieza={p.pieza}
                    resaltarId={persona.id}
                    marcas={marcas}
                  />
                )
              })}
              <button onClick={() => setVerCuadrante(false)} className="btn-linea w-full text-xs">
                Ocultar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Dato({ valor, texto }) {
  return (
    <div className="rounded-lg border border-morado-light/30 bg-morado-black/40 px-2 py-3">
      <p className="font-titulo text-2xl font-bold text-oro">{valor}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-oro-light/50">
        {texto}
      </p>
    </div>
  )
}

// Un tramo del recorrido visto desde este costalero
function Paso({ paso, numero }) {
  const carga = paso.carga
  const pieza = carga ? paso.partes[0].pieza : null

  return (
    <li
      className={`rounded-lg border px-4 py-3 ${
        carga
          ? 'border-oro/40 bg-morado-dark/70'
          : 'border-morado-light/25 bg-morado-deep/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                      text-[11px] font-bold ${
                        carga
                          ? pieza === 'cruz'
                            ? 'bg-sky-500 text-white'
                            : 'bg-oro text-morado-black'
                          : 'bg-morado-light/30 text-oro-light/50'
                      }`}
        >
          {numero}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${carga ? 'text-crema' : 'text-oro-light/50'}`}>
            {paso.tramo.nombre}
          </p>

          {paso.recorrido && (
            <p className="mt-0.5 text-xs text-oro-light/40">{paso.recorrido}</p>
          )}

          <p className={`mt-1.5 text-sm font-semibold ${
            carga
              ? pieza === 'cruz' ? 'text-sky-300' : 'text-oro'
              : 'text-oro-light/45'
          }`}>
            {carga
              ? paso.partes.map((p) => `Cargas — Turno ${p.turno} (${PIEZAS[p.pieza].nombre})`).join(' + ')
              : `Descansas — ${paso.rol}`}
          </p>

          {paso.tramo.texto && (
            <p className="mt-2 whitespace-pre-wrap border-l-2 border-oro/30 pl-3
                          text-xs leading-relaxed text-crema/60">
              {paso.tramo.texto}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}
