// =============================================================
//  MOTOR DE CUADRANTES
//  Genera y manipula la colocacion de costaleros en el trono.
//
//  Estructura de un cuadrante:
//  [
//    {                                   <- Turno A
//      id: 'A',
//      varas: {
//        Izquierda: { Delante: [pos...], Detras: [pos...] },
//        Centro:    { ... },
//        Derecha:   { ... },
//      }
//    },
//    ...
//  ]
//
//  Cada "pos" (posicion) es:
//  { costalero_id, nombre, altura, bloqueado }
//  o null si es un hueco libre.
// =============================================================

import {
  VARAS, VARAS_CRUZ, SECCIONES, COSTALEROS_POR_SECCION,
  COSTALEROS_POR_SECCION_CRUZ, PESO_TRONO_KG,
  LIMITE_PESO_PERSONA, etiquetaTurno, ALGORITMO_POR_DEFECTO,
} from './constantes'

// =============================================================
//  CONFIGURACION DE ESTRUCTURA
//
//  El motor es generico: las varas salen de la propia config,
//  asi que sirve igual para el trono (3 varas x 6+6) que para
//  la cruz guia (2 varas x 2+2).
// =============================================================

function construirConfig(varas, porSeccion) {
  const salida = {}
  varas.forEach((v) => {
    salida[v] = { Delante: porSeccion, Detras: porSeccion }
  })
  return salida
}

// Trono: 3 varas x (6 delante + 6 detras) = 36
export function configPorDefecto() {
  return construirConfig(VARAS, COSTALEROS_POR_SECCION)
}

// Cruz guia: 2 varas x (2 delante + 2 detras) = 8
export function configCruz() {
  return construirConfig(VARAS_CRUZ, COSTALEROS_POR_SECCION_CRUZ)
}

// Config por defecto segun la pieza
export function configDePieza(pieza) {
  return pieza === 'cruz' ? configCruz() : configPorDefecto()
}

// Nombres de las varas de una config (respetando su orden)
export function varasDe(config) {
  return Object.keys(config || configPorDefecto())
}

// Nombres de las varas de un turno ya construido
export function varasDeTurno(turno) {
  return Object.keys(turno?.varas || {})
}

// Cuantos costaleros caben con una configuracion dada
export function plazasTotales(config) {
  return Object.values(config || configPorDefecto())
    .reduce((t, v) => t + (v.Delante || 0) + (v.Detras || 0), 0)
}

// Numero de turnos recomendado segun los asistentes
export function turnosRecomendados(numAsistentes, config) {
  const plazas = plazasTotales(config)
  if (plazas <= 0) return 1
  return Math.max(1, Math.ceil(numAsistentes / plazas))
}

// =============================================================
//  CREACION DE ESTRUCTURA VACIA
// =============================================================

function turnoVacio(indice, config, pieza = 'trono') {
  const varas = {}
  varasDe(config).forEach((v) => {
    varas[v] = {
      Delante: Array(config[v]?.Delante ?? 0).fill(null),
      Detras: Array(config[v]?.Detras ?? 0).fill(null),
    }
  })
  // Trono -> A, B, C...   Cruz -> 1, 2, 3...
  return { id: etiquetaTurno(indice, pieza), varas }
}

export function cuadranteVacio(numTurnos, config, pieza = 'trono') {
  const cfg = config || configPorDefecto()
  return Array.from({ length: numTurnos }, (_, i) => turnoVacio(i, cfg, pieza))
}

// =============================================================
//  RECORRIDO DE POSICIONES
//  Devuelve una lista plana de referencias { t, vara, seccion, i }
//  en orden: turno -> vara -> seccion -> indice
// =============================================================

export function todasLasPosiciones(cuadrante) {
  const refs = []
  cuadrante.forEach((turno, t) => {
    varasDeTurno(turno).forEach((vara) => {
      SECCIONES.forEach((seccion) => {
        const lista = turno.varas[vara]?.[seccion] || []
        lista.forEach((_, i) => refs.push({ t, vara, seccion, i }))
      })
    })
  })
  return refs
}

export function leerPos(cuadrante, ref) {
  return cuadrante[ref.t]?.varas[ref.vara]?.[ref.seccion]?.[ref.i] ?? null
}

export function escribirPos(cuadrante, ref, valor) {
  cuadrante[ref.t].varas[ref.vara][ref.seccion][ref.i] = valor
}

// Todos los ocupantes con su ubicacion
export function ocupantes(cuadrante) {
  return todasLasPosiciones(cuadrante)
    .map((ref) => ({ ref, p: leerPos(cuadrante, ref) }))
    .filter((x) => x.p)
}

// Huecos libres
export function huecos(cuadrante) {
  return todasLasPosiciones(cuadrante).filter((ref) => !leerPos(cuadrante, ref))
}

// IDs de los costaleros ya colocados
export function idsColocados(cuadrante) {
  return new Set(ocupantes(cuadrante).map((x) => x.p.costalero_id).filter(Boolean))
}

// =============================================================
//  GENERACION DEL CUADRANTE
//
//  Reparto por BLOQUES de altura:
//
//   1. Se ordena a todo el mundo por altura de hombro, de mayor
//      a menor.
//   2. El TURNO A se lleva a los 36 primeros. Es el bloque de
//      elite y nunca aporta repetidores de forma automatica.
//   3. Los turnos siguientes van cogiendo bloques de 36.
//   4. Si al ultimo turno le faltan N costaleros, se cogen los
//      N DE MENOR ALTURA DEL TURNO INMEDIATAMENTE ANTERIOR y se
//      DUPLICAN: siguen en su turno y ademas entran aqui
//      marcados como repetidores. Asi el reparto queda nivelado.
//   5. Dentro de cada turno se mezcla todo y se coloca en U:
//      los mas altos en las puntas de las varas y los mas bajos
//      pegados al trono.
//
//  Se respeta el campo "puede_repetir" del censo: quien lo tenga
//  desmarcado nunca se duplica.
// =============================================================

// Devuelve solo el cuadrante (uso normal)
export function generarCuadrante(asistentes, opciones = {}) {
  return generarConAvisos(asistentes, opciones).cuadrante
}

// Devuelve el cuadrante y la lista de avisos de huecos sin cubrir
export function generarConAvisos(asistentes, opciones = {}) {
  const {
    numTurnos = 1,
    config = configPorDefecto(),
    cuadranteAnterior = null,   // para respetar posiciones bloqueadas
    modo = 'u',                 // 'u' = trono | 'parejas' = cruz guia
    algoritmo = ALGORITMO_POR_DEFECTO,  // 'V' (zigzag) | 'U' (varas a la vez)
    censoPorId = {},            // para consultar "puede_repetir"
    rellenarConAnterior = true, // completar el ultimo turno con repetidores
    pieza = modo === 'parejas' ? 'cruz' : 'trono',   // marca las etiquetas
  } = opciones

  const cuadrante = cuadranteVacio(numTurnos, config, pieza)

  // --- 1. Trasladar las posiciones bloqueadas del cuadrante anterior ---
  const bloqueados = new Set()
  if (cuadranteAnterior) {
    ocupantes(cuadranteAnterior)
      .filter((x) => x.p.bloqueado)
      .forEach(({ ref, p }) => {
        // Solo si la posicion sigue existiendo en la nueva estructura
        const existe = cuadrante[ref.t]?.varas[ref.vara]?.[ref.seccion]?.length > ref.i
        if (existe) {
          escribirPos(cuadrante, ref, { ...p })
          if (p.costalero_id) bloqueados.add(p.costalero_id)
        }
      })
  }

  // --- 2. Pool ordenado por altura, de mayor a menor ---
  const pool = asistentes
    .filter((a) => !bloqueados.has(a.costalero_id ?? a.id))
    .map((a) => ({
      costalero_id: a.costalero_id ?? a.id ?? null,
      nombre: a.nombre,
      altura: Number(a.altura) || 0,
      pref_hombro: a.pref_hombro || '',
      bloqueado: false,
    }))
    .sort((a, b) => b.altura - a.altura)

  // --- 3. Repartir en bloques y completar con repetidores ---
  const avisos = []
  const bloquesPorTurno = []     // lo que le toca a cada turno
  let cursor = 0

  for (let t = 0; t < numTurnos; t++) {
    const libres = todasLasPosiciones(cuadrante)
      .filter((r) => r.t === t && !leerPos(cuadrante, r))

    const cuantos = libres.length
    const propios = pool.slice(cursor, cursor + cuantos)
    cursor += propios.length

    let bloque = [...propios]

    // ¿Se queda corto? Tiramos del turno anterior
    const faltan = cuantos - bloque.length

    if (faltan > 0 && rellenarConAnterior && modo !== 'parejas' && t > 0) {
      const anterior = bloquesPorTurno[t - 1] || []

      // Ya colocados en ESTE turno, para no duplicar dentro del mismo
      const yaAqui = new Set([
        ...bloque.map((p) => p.costalero_id),
        ...ocupantes(cuadrante).filter((x) => x.ref.t === t).map((x) => x.p.costalero_id),
      ])

      const candidatos = anterior
        .filter((p) => p.costalero_id && !yaAqui.has(p.costalero_id))
        .filter((p) => !p.repetidor)                                   // no encadenamos
        .filter((p) => censoPorId[p.costalero_id]?.puede_repetir !== false)
        .sort((a, b) => a.altura - b.altura)                           // los mas bajos primero
        .slice(0, faltan)

      candidatos.forEach((p) => {
        bloque.push({ ...p, bloqueado: false, repetidor: true, repite_de: cuadrante[t - 1].id })
      })

      if (candidatos.length < faltan) {
        avisos.push({
          turno: cuadrante[t].id,
          faltan: faltan - candidatos.length,
          motivo: candidatos.length === 0
            ? `No hay costaleros disponibles en el Turno ${cuadrante[t - 1].id} que puedan repetir.`
            : `Solo se han podido repetir ${candidatos.length} de los ${faltan} que faltaban.`,
        })
      }
    } else if (faltan > 0) {
      avisos.push({
        turno: cuadrante[t].id,
        faltan,
        motivo: t === 0
          ? 'No hay costaleros suficientes para completar el primer turno.'
          : 'Quedan huecos sin cubrir.',
      })
    }

    bloquesPorTurno[t] = bloque

    // --- 4. Colocar el turno ---
    if (modo === 'parejas') colocarPorFilasParejas(cuadrante, bloque, libres)
    else colocarBloqueEnTurno(cuadrante, t, bloque, libres, algoritmo)
  }

  return { cuadrante, avisos }
}

// -------------------------------------------------------------
//  MODO "PAREJAS" — para la CRUZ GUIA
//  Aqui no interesa la forma de U, sino que la fila de DELANTE
//  tenga alturas parecidas entre si, y lo mismo la de DETRAS.
//  Por eso partimos el bloque en dos mitades por altura:
//  la mitad alta va entera delante y la baja entera detras.
// -------------------------------------------------------------
function colocarPorFilasParejas(cuadrante, bloque, libres) {
  if (!bloque.length) return

  const ordenados = [...bloque].sort((a, b) => b.altura - a.altura)

  const delante = libres.filter((r) => r.seccion === 'Delante')
  const detras = libres.filter((r) => r.seccion === 'Detras')

  // Los mas altos cubren la fila delantera; el resto, la trasera
  const paraDelante = ordenados.slice(0, delante.length)
  const paraDetras = ordenados.slice(delante.length)

  delante.forEach((ref, i) => {
    if (paraDelante[i]) escribirPos(cuadrante, ref, paraDelante[i])
  })
  detras.forEach((ref, i) => {
    if (paraDetras[i]) escribirPos(cuadrante, ref, paraDetras[i])
  })
}

// -------------------------------------------------------------
//  DISTANCIA AL EXTREMO DE LA VARA
//
//  La vara va de la punta delantera a la punta trasera:
//
//      PUNTA DELANTERA   <- distancia 0
//        Delante[0]
//         ...
//        Delante[D-1]    <- pegado al trono
//      ====  T R O N O  ====
//        Detras[0]       <- pegado al trono
//         ...
//        Detras[T-1]     <- distancia 0 (punta trasera)
//      PUNTA TRASERA
// -------------------------------------------------------------
export function distanciaAlExtremo(cuadrante, ref) {
  const lista = cuadrante[ref.t]?.varas[ref.vara]?.[ref.seccion] || []
  if (ref.seccion === 'Delante') return ref.i              // 0 = punta delantera
  return Math.max(0, lista.length - 1 - ref.i)             // 0 = punta trasera
}

// -------------------------------------------------------------
//  SECUENCIA DE VARAS EN ZIGZAG
//
//  El reparto SIEMPRE empieza por la vara del CENTRO, para que
//  los mas altos caigan ahi. Despues alterna los laterales:
//
//     Centro, Izquierda, Derecha,
//     Centro, Derecha,   Izquierda,
//     Centro, Izquierda, Derecha,  ...
//
//  (En pantalla las varas se siguen viendo Izquierda, Centro,
//   Derecha. El zigzag es solo el orden de reparto.)
// -------------------------------------------------------------
export function secuenciaVaras(varas, cuantas) {
  const n = varas.length
  if (!n) return []
  if (n === 1) return Array(cuantas).fill(varas[0])

  const centro = Math.floor(n / 2)
  const laterales = varas.filter((_, i) => i !== centro)

  const salida = []
  let trio = 0
  while (salida.length < cuantas) {
    salida.push(varas[centro])
    const orden = trio % 2 === 0 ? laterales : [...laterales].reverse()
    for (const v of orden) {
      if (salida.length >= cuantas) break
      salida.push(v)
    }
    trio++
  }
  return salida
}

// =============================================================
//  COLOCACION DE UN TURNO — DOS ALGORITMOS
//
//  ALGORITMO V (zigzag por el Centro)
//    1. Se ordena el bloque de mayor a menor altura.
//    2. Los primeros van DELANTE (tantos como huecos haya
//       delante) y el resto DETRAS.
//    3. Cada mitad se reparte en zigzag: Centro, Izquierda,
//       Derecha, Centro, Derecha, Izquierda...
//    4. Dentro de cada vara se llena desde la PUNTA hacia el
//       trono, asi los huecos sobrantes quedan junto al trono.
//    5. Si a una vara le toca y ya esta llena, se salta.
//
//  ALGORITMO U (las tres varas a la vez)
//    Se ordenan los huecos por su distancia a la punta de la
//    vara y se van llenando de fuera hacia dentro, avanzando
//    fila a fila en las tres varas al mismo tiempo.
// =============================================================

function colocarBloqueEnTurno(cuadrante, t, bloque, libres, algoritmo = 'V') {
  if (!bloque.length) return
  if (algoritmo === 'U') colocarAlgoritmoU(cuadrante, t, bloque, libres)
  else colocarAlgoritmoV(cuadrante, t, bloque, libres)
}

// --- ALGORITMO V: zigzag empezando por el Centro ---
function colocarAlgoritmoV(cuadrante, t, bloque, libres) {
  const varas = varasDeTurno(cuadrante[t])
  const ordenados = [...bloque].sort((a, b) => b.altura - a.altura)

  const libresDelante = libres.filter((r) => r.seccion === 'Delante')
  const libresDetras = libres.filter((r) => r.seccion === 'Detras')

  // El corte lo marca cuantos huecos hay delante
  const paraDelante = ordenados.slice(0, libresDelante.length)
  const paraDetras = ordenados.slice(libresDelante.length)

  repartirSeccion(cuadrante, varas, libresDelante, paraDelante, 'Delante')
  repartirSeccion(cuadrante, varas, libresDetras, paraDetras, 'Detras')
}

// --- ALGORITMO U: las tres varas se llenan a la vez ---
function colocarAlgoritmoU(cuadrante, t, bloque, libres) {
  const orden = varasDeTurno(cuadrante[t])
  const posicionVara = (v) => orden.indexOf(v)

  const huecosOrdenados = [...libres].sort((a, b) => {
    const da = distanciaAlExtremo(cuadrante, a)
    const db = distanciaAlExtremo(cuadrante, b)
    if (da !== db) return da - db                          // primero las puntas
    if (a.vara !== b.vara) return posicionVara(a.vara) - posicionVara(b.vara)
    return a.seccion === 'Delante' ? -1 : 1                 // delante antes que detras
  })

  const ordenados = [...bloque].sort((a, b) => b.altura - a.altura)

  huecosOrdenados.forEach((ref, k) => {
    if (k < ordenados.length) escribirPos(cuadrante, ref, ordenados[k])
  })
}

function repartirSeccion(cuadrante, varas, libres, personas, seccion) {
  if (!personas.length || !libres.length) return

  // Huecos de cada vara, ordenados desde la punta hacia el trono
  const porVara = {}
  varas.forEach((v) => { porVara[v] = [] })
  libres.forEach((r) => { if (porVara[r.vara]) porVara[r.vara].push(r) })

  varas.forEach((v) => {
    porVara[v].sort((a, b) =>
      seccion === 'Delante'
        ? a.i - b.i            // delante: de la punta delantera al trono
        : b.i - a.i            // detras: de la punta trasera al trono
    )
  })

  // Secuencia larga por si hay que saltar varas llenas
  const patron = secuenciaVaras(varas, personas.length + varas.length * 3)
  const cursor = {}
  varas.forEach((v) => { cursor[v] = 0 })

  let idx = 0        // persona que toca colocar
  let paso = 0       // posicion en el patron
  let fallos = 0     // varas llenas seguidas

  while (idx < personas.length && fallos < varas.length * 3) {
    const v = patron[paso % patron.length]
    paso++

    if (cursor[v] < porVara[v].length) {
      escribirPos(cuadrante, porVara[v][cursor[v]], personas[idx])
      cursor[v]++
      idx++
      fallos = 0
    } else {
      fallos++
    }
  }
}

// =============================================================
//  OPERACIONES SOBRE UN CUADRANTE EXISTENTE
// =============================================================

// Copia profunda (para no mutar el estado de React)
export function clonar(cuadrante) {
  return JSON.parse(JSON.stringify(cuadrante))
}

// Intercambia dos posiciones (para el arrastrar y soltar)
export function intercambiar(cuadrante, refA, refB) {
  const c = clonar(cuadrante)
  const a = leerPos(c, refA)
  const b = leerPos(c, refB)

  // Una posicion bloqueada no se puede mover
  if (a?.bloqueado || b?.bloqueado) return { cuadrante, error: 'Hay una posición bloqueada.' }

  escribirPos(c, refA, b)
  escribirPos(c, refB, a)
  return { cuadrante: c }
}

// Coloca a una persona en un hueco concreto
export function colocarEn(cuadrante, ref, persona) {
  const c = clonar(cuadrante)
  const actual = leerPos(c, ref)
  if (actual?.bloqueado) return { cuadrante, error: 'Esa posición está bloqueada.' }
  escribirPos(c, ref, { ...persona, bloqueado: false })
  return { cuadrante: c }
}

// Quita a una persona de su posicion
export function quitarDe(cuadrante, ref) {
  const c = clonar(cuadrante)
  const actual = leerPos(c, ref)
  if (actual?.bloqueado) return { cuadrante, error: 'Esa posición está bloqueada.' }
  escribirPos(c, ref, null)
  return { cuadrante: c }
}

// Bloquea o desbloquea una posicion
export function alternarBloqueo(cuadrante, ref) {
  const c = clonar(cuadrante)
  const p = leerPos(c, ref)
  if (!p) return { cuadrante, error: 'No hay nadie en esa posición.' }
  escribirPos(c, ref, { ...p, bloqueado: !p.bloqueado })
  return { cuadrante: c }
}

// Mete a alguien en el primer hueco libre disponible
export function meterEnPrimerHueco(cuadrante, persona) {
  const libres = huecos(cuadrante)
  if (!libres.length) return { cuadrante, error: 'No queda ningún hueco libre.' }
  return colocarEn(cuadrante, libres[0], persona)
}

// Vacia un turno entero, respetando las posiciones bloqueadas
export function limpiarTurno(cuadrante, t) {
  const c = clonar(cuadrante)
  let quitados = 0
  let conservados = 0

  todasLasPosiciones(c)
    .filter((r) => r.t === t)
    .forEach((ref) => {
      const p = leerPos(c, ref)
      if (!p) return
      if (p.bloqueado) { conservados++; return }
      escribirPos(c, ref, null)
      quitados++
    })

  return { cuadrante: c, quitados, conservados }
}

// Cuenta cuantos se quitarian y cuantos se quedarian al limpiar un turno
export function contarLimpieza(cuadrante, t) {
  let quitables = 0
  let bloqueados = 0

  todasLasPosiciones(cuadrante)
    .filter((r) => r.t === t)
    .forEach((ref) => {
      const p = leerPos(cuadrante, ref)
      if (!p) return
      if (p.bloqueado) bloqueados++
      else quitables++
    })

  return { quitables, bloqueados }
}

// Anade un hueco extra al final de una seccion concreta
export function anadirHueco(cuadrante, t, vara, seccion) {
  const c = clonar(cuadrante)
  c[t].varas[vara][seccion].push(null)
  return c
}

// Quita el ultimo hueco de una seccion (solo si esta vacio)
export function quitarHueco(cuadrante, t, vara, seccion) {
  const c = clonar(cuadrante)
  const lista = c[t].varas[vara][seccion]
  if (!lista.length) return { cuadrante, error: 'No quedan posiciones que quitar.' }
  if (lista[lista.length - 1] !== null) {
    return { cuadrante, error: 'La última posición está ocupada. Quita antes al costalero.' }
  }
  lista.pop()
  return { cuadrante: c }
}

// Anade un turno nuevo al final
export function anadirTurno(cuadrante, config, pieza = 'trono') {
  const c = clonar(cuadrante)
  c.push(turnoVacio(c.length, config || configPorDefecto(), pieza))
  return c
}

// Quita el ultimo turno (solo si esta completamente vacio)
export function quitarTurno(cuadrante) {
  if (cuadrante.length <= 1) return { cuadrante, error: 'Debe quedar al menos un turno.' }
  const ultimo = cuadrante.length - 1
  const ocupado = ocupantes(cuadrante).some((x) => x.ref.t === ultimo)
  if (ocupado) return { cuadrante, error: 'El último turno tiene costaleros. Vacíalo primero.' }
  const c = clonar(cuadrante)
  c.pop()
  return { cuadrante: c }
}

// =============================================================
//  CONFLICTOS
//  En los ensayos solo comprobamos el ROJO: la misma persona
//  ocupando dos posiciones dentro del mismo turno.
// =============================================================

export function detectarDuplicados(cuadrante) {
  const porTurno = {}   // t -> { costalero_id -> [refs] }

  ocupantes(cuadrante).forEach(({ ref, p }) => {
    if (!p.costalero_id) return
    if (!porTurno[ref.t]) porTurno[ref.t] = {}
    if (!porTurno[ref.t][p.costalero_id]) porTurno[ref.t][p.costalero_id] = []
    porTurno[ref.t][p.costalero_id].push(ref)
  })

  const conflictivas = new Set()   // claves "t-vara-seccion-i"
  const detalle = []               // para el panel de avisos

  Object.entries(porTurno).forEach(([t, mapa]) => {
    Object.entries(mapa).forEach(([cid, refs]) => {
      if (refs.length > 1) {
        refs.forEach((r) => conflictivas.add(claveRef(r)))
        const p = leerPos(cuadrante, refs[0])
        detalle.push({
          turno: cuadrante[Number(t)].id,
          costalero_id: cid,
          nombre: p?.nombre || '—',
          veces: refs.length,
          refs,
        })
      }
    })
  })

  return { conflictivas, detalle }
}

export function claveRef(ref) {
  return `${ref.t}-${ref.vara}-${ref.seccion}-${ref.i}`
}

// =============================================================
//  ESTADISTICAS Y PESO
// =============================================================

// Reparto de peso segun la altura respecto a la media de la seccion
export function calcularEstadisticas(personas, pesoTotal = PESO_TRONO_KG, plazas = 36) {
  const validos = personas.filter(Boolean)
  if (!validos.length) return { media: 0, total: 0, pesos: [] }

  const media = validos.reduce((s, p) => s + (p.altura || 0), 0) / validos.length
  const base = pesoTotal / plazas

  let total = 0
  const pesos = personas.map((p) => {
    if (!p) return 0
    const kg = Math.min(
      LIMITE_PESO_PERSONA,
      Math.max(0, base + (p.altura - media) * (base * 0.05))
    )
    total += kg
    return kg
  })

  return { media, total, pesos }
}

// Resumen general del cuadrante
export function resumen(cuadrante) {
  const total = todasLasPosiciones(cuadrante).length
  const ocupadas = ocupantes(cuadrante).length
  const bloqueadas = ocupantes(cuadrante).filter((x) => x.p.bloqueado).length
  return {
    turnos: cuadrante.length,
    plazas: total,
    ocupadas,
    libres: total - ocupadas,
    bloqueadas,
  }
}

// Media de altura de una lista de posiciones
export function mediaAltura(personas) {
  const v = personas.filter(Boolean)
  if (!v.length) return 0
  return v.reduce((s, p) => s + (p.altura || 0), 0) / v.length
}

// =============================================================
//  REPETIDORES (solo trono)
//  Si un turno se queda corto, se rellena con costaleros de
//  otros turnos que tengan "puede_repetir" en el censo.
//  Se marcan con la bandera "repetidor" para verlos en amarillo.
// =============================================================

export function rellenarConRepetidores(cuadrante, censoPorId) {
  const c = clonar(cuadrante)
  let metidos = 0

  for (let t = 0; t < c.length; t++) {
    const libresTurno = todasLasPosiciones(c).filter((r) => r.t === t && !leerPos(c, r))
    if (!libresTurno.length) continue

    // Ya colocados en ESTE turno (no pueden repetir dentro del mismo)
    const enEsteTurno = new Set(
      ocupantes(c).filter((x) => x.ref.t === t).map((x) => x.p.costalero_id)
    )

    // Candidatos: gente de otros turnos con permiso para repetir
    const candidatos = ocupantes(c)
      .filter((x) => x.ref.t !== t)
      .filter((x) => !x.p.repetidor)                       // no encadenamos repeticiones
      .filter((x) => x.p.costalero_id && !enEsteTurno.has(x.p.costalero_id))
      .filter((x) => censoPorId[x.p.costalero_id]?.puede_repetir !== false)
      .map((x) => x.p)

    // Sin duplicar candidatos y de menor a mayor altura (los mas bajos repiten antes)
    const vistos = new Set()
    const unicos = candidatos.filter((p) => {
      if (vistos.has(p.costalero_id)) return false
      vistos.add(p.costalero_id)
      return true
    }).sort((a, b) => a.altura - b.altura)

    // Rellenamos respetando la forma de U del turno
    const huecosOrdenados = [...libresTurno].sort(
      (a, b) => distanciaAlExtremo(c, a) - distanciaAlExtremo(c, b)
    ).reverse()   // los repetidores entran por las posiciones mas cercanas al trono

    huecosOrdenados.forEach((ref, k) => {
      const p = unicos[k]
      if (!p) return
      escribirPos(c, ref, { ...p, bloqueado: false, repetidor: true })
      enEsteTurno.add(p.costalero_id)
      metidos++
    })
  }

  return { cuadrante: c, metidos }
}

// =============================================================
//  RELLENAR CRUZ
//  Completa los huecos de la cruz con los costaleros del pool
//  cuya altura sea mas parecida a la de los que ya estan en esa
//  fila (Delante o Detras) de ese turno.
//  "Insertable" = no esta ya en ese turno de cruz.
// =============================================================

export function rellenarCruz(cuadrante, candidatos, opciones = {}) {
  const { excluirIds = new Set() } = opciones
  const c = clonar(cuadrante)
  let metidos = 0

  const libres = huecos(c)
  if (!libres.length) return { cuadrante, metidos: 0, error: 'La cruz ya está completa.' }

  // Agrupamos los huecos por turno y seccion, para calcular la media de cada fila
  const grupos = {}
  libres.forEach((ref) => {
    const clave = `${ref.t}|${ref.seccion}`
    if (!grupos[clave]) grupos[clave] = []
    grupos[clave].push(ref)
  })

  const yaUsados = new Set(excluirIds)

  Object.entries(grupos).forEach(([clave, refs]) => {
    const [tStr, seccion] = clave.split('|')
    const t = Number(tStr)

    // Quien ya esta en ese turno de cruz (no puede repetir dentro del turno)
    const enTurno = new Set(
      ocupantes(c).filter((x) => x.ref.t === t).map((x) => x.p.costalero_id)
    )

    // Media de altura de la fila que estamos rellenando
    const filaActual = ocupantes(c)
      .filter((x) => x.ref.t === t && x.ref.seccion === seccion)
      .map((x) => x.p)

    // Si la fila esta vacia usamos la media del turno entero; si tambien
    // esta vacio, la media de los candidatos.
    let referencia = mediaAltura(filaActual)
    if (!referencia) {
      referencia = mediaAltura(ocupantes(c).filter((x) => x.ref.t === t).map((x) => x.p))
    }
    if (!referencia) {
      referencia = mediaAltura(candidatos)
    }

    refs.forEach((ref) => {
      const disponibles = candidatos
        .filter((p) => p.costalero_id)
        .filter((p) => !enTurno.has(p.costalero_id))
        .filter((p) => !yaUsados.has(p.costalero_id))

      if (!disponibles.length) return

      // El mas parecido en altura a la referencia de la fila
      disponibles.sort(
        (a, b) => Math.abs(a.altura - referencia) - Math.abs(b.altura - referencia)
      )
      const elegido = disponibles[0]

      escribirPos(c, ref, {
        costalero_id: elegido.costalero_id,
        nombre: elegido.nombre,
        altura: elegido.altura,
        bloqueado: false,
      })
      enTurno.add(elegido.costalero_id)
      yaUsados.add(elegido.costalero_id)
      metidos++
    })
  })

  if (!metidos) {
    return { cuadrante, metidos: 0, error: 'No hay candidatos disponibles para rellenar.' }
  }
  return { cuadrante: c, metidos }
}

// ¿Cuantos ocupantes tiene cada turno? (para el aviso de la cruz)
export function ocupacionPorTurno(cuadrante) {
  return cuadrante.map((turno, t) => {
    const refs = todasLasPosiciones(cuadrante).filter((r) => r.t === t)
    const ocupadas = refs.filter((r) => leerPos(cuadrante, r)).length
    return { turno: turno.id, plazas: refs.length, ocupadas, libres: refs.length - ocupadas }
  })
}
