// =============================================================
//  COMPLETAR HUECOS
//
//  Mete gente en los huecos de un cuadrante ya hecho sin romper el
//  orden de alturas de ninguna vara:
//
//   - Se mira cual es el orden de esa vara y seccion, y la persona
//     entra donde le toca por altura. Si el hueco esta en otro sitio,
//     los que hay entre medias se corren un puesto hacia el hueco.
//   - Las posiciones bloqueadas no se mueven nunca.
//   - No se empeora ningun hombro.
//   - Cada uno va al turno cuyas alturas se parecen mas a la suya.
//
//  Primero entran los candidatos; despues, si se pasan, los
//  repetidores. No modifica el cuadrante recibido: devuelve uno nuevo
//  y la lista de cambios, para poder enseñarlos antes de aplicarlos.
// =============================================================

import { SECCIONES } from './constantes'
import { clonar, ocupantes, varasDeTurno } from './cuadrante'
import { clavesMalColocadas } from './hombros'

// 1 = de bajo a alto segun avanza la lista, -1 = de alto a bajo.
// Si la lista no lo aclara, el orden normal: los altos en las puntas.
export function ordenDeLista(lista, seccion) {
  const alturas = lista.filter(Boolean).map((p) => p.altura || 0)
  let signo = 0
  for (let i = 1; i < alturas.length; i++) signo += Math.sign(alturas[i] - alturas[i - 1])
  if (signo !== 0) return Math.sign(signo)
  return seccion === 'Delante' ? -1 : 1
}

// Mete a alguien en la lista sin romper el orden, con el menor numero
// de movimientos. Devuelve { lista, movidos } o null si no cabe.
export function insertarEnLista(lista, persona, orden) {
  const n = lista.length
  const altura = persona.altura || 0
  let mejor = null

  for (let hueco = 0; hueco < n; hueco++) {
    if (lista[hueco]) continue

    for (let k = 0; k < n; k++) {
      const desde = Math.min(hueco, k)
      const hasta = Math.max(hueco, k)
      const tramo = lista.slice(desde, hasta + 1)
      if (tramo.some((p) => p?.bloqueado)) continue

      // Corre a los de entre medias hacia el hueco
      const nueva = [...lista]
      if (k > hueco) for (let i = hueco; i < k; i++) nueva[i] = lista[i + 1]
      if (k < hueco) for (let i = hueco; i > k; i--) nueva[i] = lista[i - 1]
      nueva[k] = persona

      // Sus vecinos reales tienen que quedar bien por altura
      const antes = nueva.slice(0, k).reverse().find(Boolean)
      const despues = nueva.slice(k + 1).find(Boolean)
      if (antes && Math.sign((altura - (antes.altura || 0)) * orden) < 0) continue
      if (despues && Math.sign(((despues.altura || 0) - altura) * orden) < 0) continue

      const movidos = tramo.filter(Boolean).length
      if (!mejor || movidos < mejor.movidos) mejor = { lista: nueva, movidos }
    }
  }

  return mejor
}

function rangoAlturas(personas) {
  const alturas = personas.filter(Boolean).map((p) => p.altura || 0)
  return alturas.length ? [Math.min(...alturas), Math.max(...alturas)] : null
}

function distanciaARango(altura, rango) {
  if (!rango) return 0
  if (altura < rango[0]) return rango[0] - altura
  if (altura > rango[1]) return altura - rango[1]
  return 0
}

// Las listas con algun hueco, con lo que costaria meter a esta persona
function opcionesPara(c, persona) {
  const opciones = []

  c.forEach((turno, t) => {
    const enTurno = ocupantes(c).filter((x) => x.ref.t === t).map((x) => x.p)
    if (persona.costalero_id && enTurno.some((p) => p.costalero_id === persona.costalero_id)) return

    const rangoTurno = rangoAlturas(enTurno)

    varasDeTurno(turno).forEach((vara) => {
      SECCIONES.forEach((seccion) => {
        const lista = turno.varas[vara]?.[seccion]
        if (!lista?.some((p) => !p)) return

        const hecho = insertarEnLista(lista, persona, ordenDeLista(lista, seccion))
        if (!hecho) return

        const altura = persona.altura || 0
        // Manda el turno; despues la vara; y a igualdad, mover a menos gente
        const coste = distanciaARango(altura, rangoTurno) * 10
          + distanciaARango(altura, rangoAlturas(lista))
          + hecho.movidos * 0.01

        opciones.push({ t, vara, seccion, lista: hecho.lista, movidos: hecho.movidos, coste })
      })
    })
  })

  return opciones.sort((a, b) => a.coste - b.coste)
}

// La mejor opcion que no empeore ningun hombro
function mejorOpcion(c, persona, censoPorId, malAhora) {
  for (const op of opcionesPara(c, persona)) {
    const prueba = clonar(c)
    prueba[op.t].varas[op.vara][op.seccion] = op.lista
    if (clavesMalColocadas(prueba, censoPorId).size <= malAhora) return { ...op, cuadrante: prueba }
  }
  return null
}

function colocarTodos(c, personas, censoPorId, esRepetidor, colocados) {
  let actual = c
  let pendientes = [...personas]
  let movidos = 0
  let malAhora = clavesMalColocadas(actual, censoPorId).size

  // En cada vuelta entra la pareja persona-hueco que mejor encaja
  while (pendientes.length) {
    let mejor = null
    pendientes.forEach((persona) => {
      const op = mejorOpcion(actual, persona, censoPorId, malAhora)
      if (op && (!mejor || op.coste < mejor.op.coste)) mejor = { persona, op }
    })
    if (!mejor) break

    actual = mejor.op.cuadrante
    malAhora = clavesMalColocadas(actual, censoPorId).size
    movidos += mejor.op.movidos
    colocados.push({ persona: mejor.persona, t: mejor.op.t, repetidor: esRepetidor })
    pendientes = pendientes.filter((p) => p !== mejor.persona)
  }

  return { cuadrante: actual, pendientes, movidos }
}

export function completarHuecos(cuadrante, candidatos, { censoPorId = {}, repetidores = [] } = {}) {
  const colocados = []

  const preparar = (lista, extra) => [...lista]
    .sort((a, b) => (b.altura || 0) - (a.altura || 0))
    .map((p) => ({ ...p, ...extra, bloqueado: false }))

  const primera = colocarTodos(
    clonar(cuadrante), preparar(candidatos, {}), censoPorId, false, colocados
  )
  const segunda = colocarTodos(
    primera.cuadrante, preparar(repetidores, { repetidor: true }), censoPorId, true, colocados
  )

  // Los puestos se leen al final: los ultimos en entrar pueden haber corrido a otros
  const final = segunda.cuadrante
  const conPuesto = colocados.map(({ persona, t, repetidor }) => ({
    persona,
    repetidor,
    ref: ocupantes(final).find((x) => x.ref.t === t && x.p.costalero_id === persona.costalero_id)?.ref,
  }))

  return {
    cuadrante: final,
    colocados: conPuesto,
    movidos: primera.movidos + segunda.movidos,
    fuera: primera.pendientes,
  }
}
