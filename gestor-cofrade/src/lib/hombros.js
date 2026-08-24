// =============================================================
//  VERIFICACION Y CORRECCION DE HOMBROS
//
//  REGLA:
//    Vara Izquierda  -> se lleva con el hombro DERECHO
//    Vara Derecha    -> se lleva con el hombro IZQUIERDO
//    Vara Centro     -> todos con el MISMO hombro, pero se
//                       decide por separado para Delante y
//                       para Detras, y en cada turno.
//
//  Quien no tiene preferencia vale para cualquier vara.
//
//  CORRECCION, en este orden:
//    1. Intercambiar con alguien de altura EXACTAMENTE igual
//       en la vara contraria del mismo turno (delante o detras).
//       Se prefiere mover a los que no tienen preferencia.
//    2. Si no hay, intentar con la vara del Centro.
//    3. Si sigue sin poder, queda en ROJO y bloquea la
//       publicacion.
//
//  Las posiciones bloqueadas nunca se tocan.
// =============================================================

import { SECCIONES } from './constantes'
import {
  clonar, leerPos, escribirPos, todasLasPosiciones, varasDeTurno, claveRef,
} from './cuadrante'

export const HOMBRO = { IZQ: 'Izquierdo', DER: 'Derecho' }

// Hombro que exige cada vara (el Centro se decide aparte)
export const HOMBRO_DE_VARA = {
  Izquierda: HOMBRO.DER,
  Derecha: HOMBRO.IZQ,
}

export const VARA_CENTRO = 'Centro'

// Nombre corto para la interfaz
export function siglaHombro(h) {
  if (h === HOMBRO.IZQ) return 'IZ'
  if (h === HOMBRO.DER) return 'DER'
  return ''
}

// La vara donde deberia ir alguien con esta preferencia
export function varaQueLeToca(pref) {
  if (pref === HOMBRO.DER) return 'Izquierda'
  if (pref === HOMBRO.IZQ) return 'Derecha'
  return null
}

// La vara contraria
export function varaContraria(vara) {
  if (vara === 'Izquierda') return 'Derecha'
  if (vara === 'Derecha') return 'Izquierda'
  return null
}

// Preferencia de un ocupante (mira primero el propio dato y luego el censo)
export function preferencia(persona, censoPorId = {}) {
  const p = persona?.pref_hombro || censoPorId[persona?.costalero_id]?.pref_hombro
  if (p === HOMBRO.IZQ || p === HOMBRO.DER) return p
  return null
}

// =============================================================
//  HOMBRO DE LA VARA DEL CENTRO
//  Se calcula por turno Y por seccion: el que deje a menos
//  gente mal colocada. En caso de empate, manda el derecho.
// =============================================================

export function hombroDelCentro(cuadrante, t, seccion, censoPorId = {}) {
  const lista = cuadrante[t]?.varas[VARA_CENTRO]?.[seccion] || []

  let quierenIzq = 0
  let quierenDer = 0

  lista.forEach((p) => {
    if (!p) return
    const pref = preferencia(p, censoPorId)
    if (pref === HOMBRO.IZQ) quierenIzq++
    else if (pref === HOMBRO.DER) quierenDer++
  })

  if (quierenIzq > quierenDer) return HOMBRO.IZQ
  if (quierenDer > quierenIzq) return HOMBRO.DER
  return HOMBRO.DER   // empate o todos indiferentes
}

// Mapa completo de hombros: turno -> vara -> seccion -> hombro
export function mapaHombros(cuadrante, censoPorId = {}) {
  const mapa = {}
  if (!cuadrante) return mapa

  cuadrante.forEach((turno, t) => {
    mapa[t] = {}
    varasDeTurno(turno).forEach((vara) => {
      mapa[t][vara] = {}
      SECCIONES.forEach((sec) => {
        mapa[t][vara][sec] = vara === VARA_CENTRO
          ? hombroDelCentro(cuadrante, t, sec, censoPorId)
          : HOMBRO_DE_VARA[vara] || null
      })
    })
  })

  return mapa
}

// Hombro exigido en una posicion concreta
export function hombroExigido(cuadrante, ref, censoPorId = {}) {
  if (ref.vara === VARA_CENTRO) {
    return hombroDelCentro(cuadrante, ref.t, ref.seccion, censoPorId)
  }
  return HOMBRO_DE_VARA[ref.vara] || null
}

// ¿Esta bien colocado?
export function estaBienColocado(cuadrante, ref, censoPorId = {}) {
  const p = leerPos(cuadrante, ref)
  if (!p) return true

  const pref = preferencia(p, censoPorId)
  if (!pref) return true                        // le da igual

  const exige = hombroExigido(cuadrante, ref, censoPorId)
  if (!exige) return true

  return pref === exige
}

// =============================================================
//  DETECCION
// =============================================================

export function detectarMalColocados(cuadrante, censoPorId = {}) {
  if (!cuadrante) return []

  return todasLasPosiciones(cuadrante)
    .filter((ref) => leerPos(cuadrante, ref))
    .filter((ref) => !estaBienColocado(cuadrante, ref, censoPorId))
    .map((ref) => {
      const p = leerPos(cuadrante, ref)
      return {
        ref,
        persona: p,
        necesita: preferencia(p, censoPorId),
        laVaraExige: hombroExigido(cuadrante, ref, censoPorId),
      }
    })
}

// =============================================================
//  CORRECCION AUTOMATICA
// =============================================================

export function corregirHombros(cuadrante, censoPorId = {}) {
  if (!cuadrante?.length) {
    return { cuadrante, corregidos: 0, sinResolver: [], intercambios: [] }
  }

  let c = clonar(cuadrante)
  const intercambios = []
  let corregidos = 0

  // Vamos resolviendo de uno en uno; cada intercambio puede arreglar dos a la vez
  let vueltas = 0
  const maxVueltas = todasLasPosiciones(c).length * 2

  while (vueltas < maxVueltas) {
    vueltas++

    const malos = detectarMalColocados(c, censoPorId)
      .filter((m) => !m.persona.bloqueado)      // los bloqueados no se tocan

    if (!malos.length) break

    const caso = malos[0]
    const destino = buscarIntercambio(c, caso, censoPorId)

    if (!destino) {
      // No hay solucion para este: lo apartamos probando con el siguiente
      const otro = malos.slice(1).find((m) => buscarIntercambio(c, m, censoPorId))
      if (!otro) break

      const ref2 = buscarIntercambio(c, otro, censoPorId)
      c = aplicarIntercambio(c, otro.ref, ref2)
      intercambios.push({ a: otro.ref, b: ref2 })
      corregidos++
      continue
    }

    c = aplicarIntercambio(c, caso.ref, destino)
    intercambios.push({ a: caso.ref, b: destino })
    corregidos++
  }

  // Lo que no se ha podido arreglar
  const sinResolver = detectarMalColocados(c, censoPorId).map((m) => ({
    ...m,
    motivo: motivoSinResolver(c, m, censoPorId),
  }))

  return { cuadrante: c, corregidos, sinResolver, intercambios }
}

// -------------------------------------------------------------
//  Busca con quien intercambiar dentro del mismo turno
// -------------------------------------------------------------
function buscarIntercambio(cuadrante, caso, censoPorId) {
  const { ref, persona, necesita } = caso
  const altura = persona.altura

  // Candidatos: mismo turno, misma altura exacta, no bloqueados
  const candidatos = todasLasPosiciones(cuadrante)
    .filter((r) => r.t === ref.t)
    .filter((r) => claveRef(r) !== claveRef(ref))
    .map((r) => ({ r, p: leerPos(cuadrante, r) }))
    .filter((x) => x.p && !x.p.bloqueado)
    .filter((x) => x.p.altura === altura)

  // Solo sirve si al cambiarlos AMBOS quedan bien
  const valido = ({ r, p }) => {
    const exigeDestino = hombroExigido(cuadrante, r, censoPorId)
    if (exigeDestino !== necesita) return false          // yo no encajaria ahi

    const prefOtro = preferencia(p, censoPorId)
    if (!prefOtro) return true                            // al otro le da igual

    const exigeOrigen = hombroExigido(cuadrante, ref, censoPorId)
    return prefOtro === exigeOrigen                       // el otro encaja en mi sitio
  }

  const buenos = candidatos.filter(valido)
  if (!buenos.length) return null

  // 1º la vara contraria, 2º el centro. Dentro de cada grupo,
  // primero los que no tienen preferencia.
  const contraria = varaContraria(ref.vara)
  const puntuar = ({ r, p }) => {
    let n = 0
    if (r.vara === contraria) n -= 10
    else if (r.vara === VARA_CENTRO) n -= 5
    if (!preferencia(p, censoPorId)) n -= 2               // indiferentes primero
    if (r.seccion === ref.seccion) n -= 1                 // misma mitad mejor
    return n
  }

  buenos.sort((a, b) => puntuar(a) - puntuar(b))
  return buenos[0].r
}

function aplicarIntercambio(cuadrante, refA, refB) {
  const c = clonar(cuadrante)
  const a = leerPos(c, refA)
  const b = leerPos(c, refB)
  escribirPos(c, refA, b)
  escribirPos(c, refB, a)
  return c
}

// -------------------------------------------------------------
//  Por que no se ha podido resolver
// -------------------------------------------------------------
function motivoSinResolver(cuadrante, caso, censoPorId) {
  const { ref, persona, necesita } = caso

  if (persona.bloqueado) {
    return 'Está bloqueado en esa posición, así que no se puede mover.'
  }

  const mismaAltura = todasLasPosiciones(cuadrante)
    .filter((r) => r.t === ref.t && claveRef(r) !== claveRef(ref))
    .map((r) => ({ r, p: leerPos(cuadrante, r) }))
    .filter((x) => x.p && x.p.altura === persona.altura)

  if (!mismaAltura.length) {
    return `No hay nadie más de ${persona.altura} cm en su turno con quien intercambiarse.`
  }

  const enSitioBueno = mismaAltura.filter(
    (x) => hombroExigido(cuadrante, x.r, censoPorId) === necesita
  )

  if (!enSitioBueno.length) {
    return `Ninguno de los de ${persona.altura} cm de su turno está en una vara de hombro ${necesita.toLowerCase()}.`
  }

  if (enSitioBueno.every((x) => x.p.bloqueado)) {
    return `Los de ${persona.altura} cm que están en vara de hombro ${necesita.toLowerCase()} están bloqueados.`
  }

  return `Al intercambiarlo, el otro costalero quedaría con el hombro equivocado.`
}

// =============================================================
//  RESUMEN PARA LA INTERFAZ
// =============================================================

// Set de claves de posicion que estan mal (para pintarlas en rojo)
export function clavesMalColocadas(cuadrante, censoPorId = {}) {
  const set = new Set()
  detectarMalColocados(cuadrante, censoPorId).forEach((m) => {
    set.add(claveRef(m.ref))
  })
  return set
}

// Cuenta de preferencias en un cuadrante
export function resumenHombros(cuadrante, censoPorId = {}) {
  if (!cuadrante) return { izq: 0, der: 0, indiferentes: 0, mal: 0 }

  let izq = 0
  let der = 0
  let indiferentes = 0

  todasLasPosiciones(cuadrante).forEach((ref) => {
    const p = leerPos(cuadrante, ref)
    if (!p) return
    const pref = preferencia(p, censoPorId)
    if (pref === HOMBRO.IZQ) izq++
    else if (pref === HOMBRO.DER) der++
    else indiferentes++
  })

  return {
    izq,
    der,
    indiferentes,
    mal: detectarMalColocados(cuadrante, censoPorId).length,
  }
}
