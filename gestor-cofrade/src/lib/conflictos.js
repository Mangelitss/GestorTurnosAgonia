// =============================================================
//  DETECTOR DE CONFLICTOS DE UNA PROCESION
//
//  🔴 DUPLICADO            dos posiciones a la vez en el mismo
//                          turno o en el mismo tramo    -> BLOQUEA
//  🟠 TRAMOS_CONSECUTIVOS  carga en dos tramos seguidos
//  🟡 REPITE_TRONO         mas de un turno de trono
//  🔵 REPITE_CRUZ          mas de un turno de cruz
//  🟢 TRONO_Y_CRUZ         carga en trono y en cruz
//
//  Entre la ida y el regreso hay descanso, asi que ese salto
//  NUNCA cuenta como tramos consecutivos.
// =============================================================

import { CONFLICTOS, LISTA_CONFLICTOS, indiceDeEtiqueta } from './constantes'
import { ocupantes, claveRef } from './cuadrante'
import { detectarMalColocados } from './hombros'

// -------------------------------------------------------------
//  Utilidades
// -------------------------------------------------------------

// Turnos en los que aparece cada costalero: id -> Set(indices de turno)
function turnosPorCostalero(cuadrante) {
  const mapa = {}
  if (!cuadrante) return mapa
  ocupantes(cuadrante).forEach(({ ref, p }) => {
    if (!p.costalero_id) return
    if (!mapa[p.costalero_id]) mapa[p.costalero_id] = new Set()
    mapa[p.costalero_id].add(ref.t)
  })
  return mapa
}

// Todas las posiciones que ocupa cada costalero: id -> [refs]
function posicionesPorCostalero(cuadrante) {
  const mapa = {}
  if (!cuadrante) return mapa
  ocupantes(cuadrante).forEach(({ ref, p }) => {
    if (!p.costalero_id) return
    if (!mapa[p.costalero_id]) mapa[p.costalero_id] = []
    mapa[p.costalero_id].push(ref)
  })
  return mapa
}

// Ordena los tramos: primero la ida y luego el regreso, respetando su orden
export function tramosOrdenados(tramos = []) {
  const peso = (f) => (f === 'regreso' ? 1 : 0)
  return [...tramos].sort((a, b) =>
    peso(a.fase) - peso(b.fase) || (a.orden ?? 0) - (b.orden ?? 0)
  )
}

// Indice del turno a partir de su etiqueta
//   Trono: "A" -> 0   |   Cruz: "1" -> 0
const indiceTurno = indiceDeEtiqueta

// -------------------------------------------------------------
//  ¿En que tramos carga cada costalero?
//  Devuelve  id -> [ { tramo, pieza, posicion } ]
// -------------------------------------------------------------
export function cargaPorCostalero(procesion) {
  const { tramos = [], cuadrante_trono, cuadrante_cruz } = procesion || {}
  const orden = tramosOrdenados(tramos)

  const posTrono = posicionesPorCostalero(cuadrante_trono)
  const posCruz = posicionesPorCostalero(cuadrante_cruz)

  const salida = {}

  orden.forEach((tramo, indiceGlobal) => {
    const pares = [
      ['trono', tramo.turno_trono, cuadrante_trono, posTrono],
      ['cruz', tramo.turno_cruz, cuadrante_cruz, posCruz],
    ]

    pares.forEach(([pieza, letra, cuadrante, posiciones]) => {
      const t = indiceTurno(letra)
      if (t === null || t === undefined || t < 0 || !cuadrante?.[t]) return

      Object.entries(posiciones).forEach(([cid, refs]) => {
        refs.filter((r) => r.t === t).forEach((ref) => {
          if (!salida[cid]) salida[cid] = []
          salida[cid].push({
            tramo,
            indiceGlobal,
            pieza,
            turno: letra,
            ref,
          })
        })
      })
    })
  })

  return salida
}

// -------------------------------------------------------------
//  DETECTOR PRINCIPAL
// -------------------------------------------------------------
export function detectarConflictos(procesion, censoPorId = {}) {
  const { tramos = [], cuadrante_trono, cuadrante_cruz } = procesion || {}

  // clave de posicion -> id de conflicto (se queda el mas prioritario)
  const marcasTrono = new Map()
  const marcasCruz = new Map()
  const incidencias = []   // para el panel de avisos

  const marcar = (pieza, ref, tipo) => {
    const mapa = pieza === 'cruz' ? marcasCruz : marcasTrono
    const clave = claveRef(ref)
    const actual = mapa.get(clave)
    if (!actual || CONFLICTOS[tipo].prioridad < CONFLICTOS[actual].prioridad) {
      mapa.set(clave, tipo)
    }
  }

  const nombreDe = (cid, cuadrante) => {
    const o = ocupantes(cuadrante || []).find((x) => x.p.costalero_id === cid)
    return o?.p?.nombre || censoPorId[cid]?.nombre || '—'
  }

  // ===========================================================
  //  🔴 DUPLICADO — dos posiciones dentro del MISMO turno
  // ===========================================================
  const revisarDuplicadosEnTurno = (cuadrante, pieza) => {
    if (!cuadrante) return
    const porTurno = {}
    ocupantes(cuadrante).forEach(({ ref, p }) => {
      if (!p.costalero_id) return
      const k = `${ref.t}|${p.costalero_id}`
      if (!porTurno[k]) porTurno[k] = []
      porTurno[k].push(ref)
    })

    Object.entries(porTurno).forEach(([k, refs]) => {
      if (refs.length < 2) return
      const [tStr, cid] = k.split('|')
      refs.forEach((r) => marcar(pieza, r, 'DUPLICADO'))
      incidencias.push({
        tipo: 'DUPLICADO',
        costalero_id: cid,
        nombre: nombreDe(cid, cuadrante),
        pieza,
        detalle: `Ocupa ${refs.length} posiciones en el Turno ${cuadrante[Number(tStr)].id} de ${pieza === 'cruz' ? 'la cruz' : 'l trono'}.`,
      })
    })
  }

  revisarDuplicadosEnTurno(cuadrante_trono, 'trono')
  revisarDuplicadosEnTurno(cuadrante_cruz, 'cruz')

  // ===========================================================
  //  🔴 HOMBRO EQUIVOCADO (tambien bloquea la publicacion)
  // ===========================================================
  const revisarHombros = (cuadrante, pieza) => {
    if (!cuadrante) return
    detectarMalColocados(cuadrante, censoPorId).forEach((m) => {
      marcar(pieza, m.ref, 'DUPLICADO')
      incidencias.push({
        tipo: 'DUPLICADO',
        costalero_id: m.persona.costalero_id,
        nombre: m.persona.nombre,
        pieza,
        detalle:
          `Necesita el hombro ${m.necesita.toLowerCase()} pero está en la vara ` +
          `${m.ref.vara} del Turno ${cuadrante[m.ref.t].id}, que va con hombro ` +
          `${m.laVaraExige.toLowerCase()}.` +
          (m.persona.bloqueado ? ' Está bloqueado, muévelo tú.' : ''),
      })
    })
  }

  revisarHombros(cuadrante_trono, 'trono')
  revisarHombros(cuadrante_cruz, 'cruz')

  // ===========================================================
  //  Cargas por tramo (necesario para los conflictos restantes)
  // ===========================================================
  const cargas = cargaPorCostalero(procesion)

  // ===========================================================
  //  🔴 DUPLICADO — trono y cruz en el MISMO tramo
  // ===========================================================
  Object.entries(cargas).forEach(([cid, lista]) => {
    const porTramo = {}
    lista.forEach((c) => {
      const k = c.tramo.id ?? c.indiceGlobal
      if (!porTramo[k]) porTramo[k] = []
      porTramo[k].push(c)
    })

    Object.values(porTramo).forEach((enEse) => {
      const piezas = new Set(enEse.map((c) => c.pieza))
      if (piezas.size > 1) {
        enEse.forEach((c) => marcar(c.pieza, c.ref, 'DUPLICADO'))
        incidencias.push({
          tipo: 'DUPLICADO',
          costalero_id: cid,
          nombre: nombreDe(cid, cuadrante_trono) || nombreDe(cid, cuadrante_cruz),
          detalle: `Va en el trono y en la cruz a la vez en el tramo «${enEse[0].tramo.nombre || enEse[0].tramo.desde || '—'}».`,
        })
      }
    })
  })

  // ===========================================================
  //  🟠 TRAMOS CONSECUTIVOS
  //  Solo dentro de la misma fase: entre ida y regreso hay descanso.
  // ===========================================================
  const orden = tramosOrdenados(tramos)

  Object.entries(cargas).forEach(([cid, lista]) => {
    // Indices globales en los que carga, sin repetir
    const indices = [...new Set(lista.map((c) => c.indiceGlobal))].sort((a, b) => a - b)

    for (let i = 1; i < indices.length; i++) {
      const anterior = orden[indices[i - 1]]
      const actual = orden[indices[i]]
      if (!anterior || !actual) continue

      const seguidos = indices[i] === indices[i - 1] + 1
      const mismaFase = (anterior.fase || 'ida') === (actual.fase || 'ida')

      if (seguidos && mismaFase) {
        lista.filter((c) => c.indiceGlobal === indices[i] || c.indiceGlobal === indices[i - 1])
          .forEach((c) => marcar(c.pieza, c.ref, 'TRAMOS_CONSECUTIVOS'))

        incidencias.push({
          tipo: 'TRAMOS_CONSECUTIVOS',
          costalero_id: cid,
          nombre: nombreDe(cid, cuadrante_trono) || nombreDe(cid, cuadrante_cruz),
          detalle: `Carga en dos tramos seguidos: «${anterior.nombre || anterior.desde || '—'}» y «${actual.nombre || actual.desde || '—'}».`,
        })
      }
    }
  })

  // ===========================================================
  //  🟡 REPITE TRONO   y   🔵 REPITE CRUZ
  // ===========================================================
  const turnosTrono = turnosPorCostalero(cuadrante_trono)
  const turnosCruz = turnosPorCostalero(cuadrante_cruz)

  const revisarRepeticion = (mapa, cuadrante, pieza, tipo) => {
    Object.entries(mapa).forEach(([cid, set]) => {
      if (set.size < 2) return
      ocupantes(cuadrante).filter((x) => x.p.costalero_id === cid)
        .forEach((x) => marcar(pieza, x.ref, tipo))

      const letras = [...set].sort().map((t) => cuadrante[t].id).join(', ')
      incidencias.push({
        tipo,
        costalero_id: cid,
        nombre: nombreDe(cid, cuadrante),
        pieza,
        detalle: `Está en ${set.size} turnos de ${pieza === 'cruz' ? 'la cruz' : 'l trono'} (${letras}).`,
      })
    })
  }

  revisarRepeticion(turnosTrono, cuadrante_trono, 'trono', 'REPITE_TRONO')
  revisarRepeticion(turnosCruz, cuadrante_cruz, 'cruz', 'REPITE_CRUZ')

  // ===========================================================
  //  🟢 TRONO Y CRUZ (en tramos distintos)
  // ===========================================================
  Object.keys(turnosTrono).forEach((cid) => {
    if (!turnosCruz[cid]) return

    ocupantes(cuadrante_trono).filter((x) => x.p.costalero_id === cid)
      .forEach((x) => marcar('trono', x.ref, 'TRONO_Y_CRUZ'))
    ocupantes(cuadrante_cruz).filter((x) => x.p.costalero_id === cid)
      .forEach((x) => marcar('cruz', x.ref, 'TRONO_Y_CRUZ'))

    incidencias.push({
      tipo: 'TRONO_Y_CRUZ',
      costalero_id: cid,
      nombre: nombreDe(cid, cuadrante_trono),
      detalle: 'Carga tanto en el trono como en la cruz guía.',
    })
  })

  // ===========================================================
  //  RESUMEN
  // ===========================================================
  const porTipo = {}
  LISTA_CONFLICTOS.forEach((c) => { porTipo[c.id] = [] })
  incidencias.forEach((i) => { porTipo[i.tipo]?.push(i) })

  const bloqueantes = LISTA_CONFLICTOS
    .filter((c) => c.bloquea_publicacion)
    .reduce((n, c) => n + (porTipo[c.id]?.length || 0), 0)

  return {
    marcasTrono,          // Map clave -> tipo
    marcasCruz,           // Map clave -> tipo
    incidencias,
    porTipo,
    total: incidencias.length,
    bloqueantes,
    puedePublicar: bloqueantes === 0,
  }
}

// -------------------------------------------------------------
//  FICHA DE UN COSTALERO
//  Todo lo que necesita saber: en que tramos carga y con que pieza.
// -------------------------------------------------------------
export function fichaCostalero(procesion, costaleroId, resultado) {
  const cargas = cargaPorCostalero(procesion)[costaleroId] || []
  const suyos = (resultado?.incidencias || []).filter((i) => i.costalero_id === costaleroId)

  return {
    cargas: cargas.sort((a, b) => a.indiceGlobal - b.indiceGlobal),
    conflictos: suyos,
    totalTramos: new Set(cargas.map((c) => c.indiceGlobal)).size,
    llevaTrono: cargas.some((c) => c.pieza === 'trono'),
    llevaCruz: cargas.some((c) => c.pieza === 'cruz'),
  }
}

// Descripcion legible de una posicion
export function describirPosicion(ref) {
  if (!ref) return '—'
  const seccion = ref.seccion === 'Detras' ? 'detrás' : 'delante'
  return `vara ${ref.vara}, ${seccion}, puesto ${ref.i + 1}`
}

// =============================================================
//  ORDEN PROCESIONAL DE UN COSTALERO
//
//  Recorre TODOS los tramos de la procesion y dice, en cada uno,
//  si carga el trono, la cruz, o esta descansando.
//
//  Por defecto quien no carga va con CIRIO, pero el cuadrillero
//  puede escribir otro cometido (muletero, etc.) para ese tramo
//  concreto. Se guarda en:
//     procesion.roles_descanso[costaleroId][tramoId] = 'Muletero'
// =============================================================

export const ROL_DESCANSO_POR_DEFECTO = 'Cirio'

export function ordenProcesional(procesion, costaleroId) {
  const orden = tramosOrdenados(procesion?.tramos || [])
  const cargas = cargaPorCostalero(procesion)[costaleroId] || []
  const roles = procesion?.roles_descanso?.[costaleroId] || {}

  return orden.map((tramo, i) => {
    const enEste = cargas.filter((c) => c.indiceGlobal === i)

    // Recorrido legible del tramo
    const recorrido = (tramo.desde || tramo.hasta)
      ? `${tramo.desde || '—'} → ${tramo.hasta || '—'}`
      : ''

    if (enEste.length === 0) {
      const rol = roles[tramo.id]
      return {
        indice: i,
        tramo,
        recorrido,
        carga: false,
        rol: rol || ROL_DESCANSO_POR_DEFECTO,
        personalizado: !!rol,
        texto: `Descansa (${rol || ROL_DESCANSO_POR_DEFECTO})`,
      }
    }

    // Puede aparecer en trono y cruz a la vez: eso es un conflicto rojo,
    // pero lo mostramos igual para que se vea el problema.
    const partes = enEste.map((c) => ({
      pieza: c.pieza,
      turno: c.turno,
      ref: c.ref,
      texto: `Turno ${c.turno} (${c.pieza === 'cruz' ? 'Cruz Guía' : 'Trono'})`,
    }))

    return {
      indice: i,
      tramo,
      recorrido,
      carga: true,
      partes,
      duplicado: partes.length > 1,
      texto: partes.map((p) => p.texto).join(' + '),
    }
  })
}

// Resumen corto: cuantos tramos carga y cuantos descansa
export function resumenOrden(orden) {
  const cargando = orden.filter((o) => o.carga).length
  return {
    total: orden.length,
    cargando,
    descansando: orden.length - cargando,
    trono: orden.filter((o) => o.partes?.some((p) => p.pieza === 'trono')).length,
    cruz: orden.filter((o) => o.partes?.some((p) => p.pieza === 'cruz')).length,
  }
}
