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
import { Revelar, Rotulo } from './ui'

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
    <div className="animate-aparecer space-y-7">

      {/* ---- Quien es y que le toca ---- */}
      <div className="cartela p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="etiqueta mb-1">Tu orden procesional</p>
            <h2 className="font-titulo text-[21px] font-semibold leading-tight text-oro-pale">
              {persona.nombre}
            </h2>
          </div>
          <button onClick={onCambiar} className="btn-discreto shrink-0">
            No soy yo
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-oro/20 border-y border-oro/20 py-3 text-center">
          <Dato valor={resumen.cargando} texto="cargando" />
          <Dato valor={resumen.descansando} texto="descanso" />
          <Dato valor={resumen.total} texto="tramos" />
        </div>

        {puestos.length > 0 && (
          <div className="mt-1 divide-y divide-oro/15">
            {puestos.map((p, i) => (
              <div key={i} className="py-2.5">
                <p className={`font-titulo text-[13px] font-semibold ${
                  p.pieza === 'cruz' ? 'text-sky-200' : 'text-oro-light'
                }`}>
                  {PIEZAS[p.pieza].nombre} · Turno {p.turno}
                </p>
                <p className="prosa">{describirPosicion(p.ref)}</p>
              </div>
            ))}
          </div>
        )}

        {nota && (
          <div className="mt-3 border-l-2 border-oro pl-3.5">
            <p className="etiqueta mb-1">Nota del cuadrillero</p>
            <p className="prosa whitespace-pre-wrap text-crema">{nota}</p>
          </div>
        )}
      </div>

      {/* ---- Tramo a tramo ---- */}
      <div>
        <Rotulo>Tramo a tramo</Rotulo>
        <ol className="relative">
          <span
            className="absolute bottom-3 left-[13px] top-3 w-px origin-top animate-descender bg-oro/35"
            aria-hidden="true"
          />
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
              Ver {puestos.length > 1 ? 'mis turnos' : 'mi turno'}
            </button>
          ) : (
            <div className="space-y-5">
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
              <button onClick={() => setVerCuadrante(false)} className="btn-linea w-full">
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
    <div className="px-1">
      <p className="font-titulo text-[24px] font-semibold leading-none text-oro-pale">{valor}</p>
      <p className="etiqueta mt-1.5 !text-[9.5px]">{texto}</p>
    </div>
  )
}

// Un tramo del recorrido visto desde este costalero
function Paso({ paso, numero }) {
  const carga = paso.carga
  const pieza = carga ? paso.partes[0].pieza : null

  return (
    <Revelar as="li" className="relative pb-5 pl-10 last:pb-0">
      <span
        className={`absolute left-0 top-0 flex h-[27px] w-[27px] items-center justify-center rounded-full
                    border font-titulo text-[11.5px] font-semibold ${
                      carga
                        ? pieza === 'cruz'
                          ? 'border-sky-300 bg-sky-500 text-white'
                          : 'border-oro-pale bg-oro text-morado-black'
                        : 'border-oro/30 bg-morado-black text-oro-light/60'
                    }`}
      >
        {numero}
      </span>

      <p className={`pt-0.5 text-[15px] font-bold leading-snug ${carga ? 'text-crema' : 'text-crema/65'}`}>
        {paso.tramo.nombre}
      </p>

      {paso.recorrido && (
        <p className="mt-0.5 font-texto text-[16px] italic leading-snug text-oro-light/65">{paso.recorrido}</p>
      )}

      <p className={`mt-1 text-[14px] font-semibold leading-snug ${
        carga
          ? pieza === 'cruz' ? 'text-sky-300' : 'text-oro-pale'
          : 'text-oro-light/60'
      }`}>
        {carga
          ? paso.partes.map((p) => `Cargas — Turno ${p.turno} (${PIEZAS[p.pieza].nombre})`).join(' + ')
          : `Descansas — ${paso.rol}`}
      </p>

      {paso.tramo.texto && (
        <p className="prosa mt-2 whitespace-pre-wrap text-[16px] text-crema/75">
          {paso.tramo.texto}
        </p>
      )}
    </Revelar>
  )
}
