// =============================================================
//  ESTADISTICAS DEL CUADRANTE
//
//  MODELO DE PESO
//  --------------
//  La vara es una viga que se apoya en los hombros. Como cada
//  costalero tiene una altura de hombro distinta, el mas alto
//  toca primero y carga mas.
//
//  La vara flexiona como maximo unos 9 cm, asi que quien este
//  mas de 9 cm por debajo del mas alto de SU vara y seccion
//  no llega a tocarla: carga 0 kg.
//
//  Dentro de ese margen el reparto es proporcional a lo cerca
//  que este cada uno del mas alto:
//
//     contacto_i = 1 - (hMax - h_i) / FLEXION      (minimo 0)
//     peso_i     = pesoDelGrupo * contacto_i / suma(contactos)
//
//  El peso total del trono se reparte a partes iguales entre
//  las tres varas, y dentro de cada vara mitad delante y mitad
//  detras.
// =============================================================

import { SECCIONES, PESO_TRONO_KG, PESO_CRUZ_KG } from './constantes'
import { varasDeTurno, mediaAltura } from './cuadrante'

// Recorrido de flexion de la vara, en centimetros
export const FLEXION_VARA_CM = 9

// A partir de este rango de altura dentro de una vara, avisamos:
// significa que alguien se esta quedando sin tocar
export const RANGO_AVISO_CM = FLEXION_VARA_CM

// -------------------------------------------------------------
//  PESO DE UN GRUPO (una vara y una seccion)
// -------------------------------------------------------------
export function repartirPeso(personas, pesoGrupo) {
  const validas = personas.map((p, i) => ({ p, i })).filter((x) => x.p)
  if (!validas.length) return personas.map(() => 0)

  const hMax = Math.max(...validas.map((x) => x.p.altura || 0))

  // Cuanto toca cada uno la vara (0 = no llega)
  const contactos = validas.map((x) => {
    const diferencia = hMax - (x.p.altura || 0)
    return Math.max(0, 1 - diferencia / FLEXION_VARA_CM)
  })

  const suma = contactos.reduce((a, b) => a + b, 0)

  const salida = personas.map(() => 0)
  validas.forEach((x, k) => {
    salida[x.i] = suma > 0 ? (pesoGrupo * contactos[k]) / suma : 0
  })

  return salida
}

// -------------------------------------------------------------
//  ESTADISTICAS DE UN TURNO COMPLETO
// -------------------------------------------------------------
export function estadisticasTurno(turno, pieza = 'trono') {
  const varas = varasDeTurno(turno)
  const pesoTotal = pieza === 'cruz' ? PESO_CRUZ_KG : PESO_TRONO_KG

  // Cada vara se lleva su parte, y dentro mitad delante y mitad detras
  const pesoPorVara = varas.length ? pesoTotal / varas.length : 0
  const pesoPorGrupo = pesoPorVara / SECCIONES.length

  const grupos = {}     // vara -> seccion -> datos
  const pesos = {}      // clave "vara|seccion|indice" -> kg

  varas.forEach((vara) => {
    grupos[vara] = {}
    SECCIONES.forEach((seccion) => {
      const lista = turno.varas[vara]?.[seccion] || []
      const kilos = repartirPeso(lista, pesoPorGrupo)

      lista.forEach((_, i) => {
        pesos[`${vara}|${seccion}|${i}`] = kilos[i]
      })

      const ocupadas = lista.filter(Boolean)
      const alturas = ocupadas.map((p) => p.altura || 0)

      grupos[vara][seccion] = {
        ocupadas: ocupadas.length,
        plazas: lista.length,
        media: mediaAltura(lista),
        min: alturas.length ? Math.min(...alturas) : 0,
        max: alturas.length ? Math.max(...alturas) : 0,
        rango: alturas.length ? Math.max(...alturas) - Math.min(...alturas) : 0,
        peso: kilos.reduce((a, b) => a + b, 0),
        // Quien no llega a tocar la vara
        sinTocar: ocupadas.filter((p, k) => {
          const idx = lista.indexOf(p)
          return kilos[idx] === 0
        }).length,
      }
    })
  })

  // --- Totales por vara ---
  const porVara = {}
  varas.forEach((vara) => {
    const d = grupos[vara].Delante
    const t = grupos[vara].Detras
    const todas = [
      ...(turno.varas[vara]?.Delante || []),
      ...(turno.varas[vara]?.Detras || []),
    ]
    const alturas = todas.filter(Boolean).map((p) => p.altura || 0)

    porVara[vara] = {
      media: mediaAltura(todas),
      rango: alturas.length ? Math.max(...alturas) - Math.min(...alturas) : 0,
      peso: d.peso + t.peso,
      ocupadas: d.ocupadas + t.ocupadas,
      plazas: d.plazas + t.plazas,
    }
  })

  // --- Mitades: las tres varas delanteras juntas y las traseras ---
  const porMitad = {}
  SECCIONES.forEach((seccion) => {
    const todas = varas.flatMap((v) => turno.varas[v]?.[seccion] || [])
    const alturas = todas.filter(Boolean).map((p) => p.altura || 0)

    porMitad[seccion] = {
      media: mediaAltura(todas),
      min: alturas.length ? Math.min(...alturas) : 0,
      max: alturas.length ? Math.max(...alturas) : 0,
      rango: alturas.length ? Math.max(...alturas) - Math.min(...alturas) : 0,
      peso: varas.reduce((s, v) => s + grupos[v][seccion].peso, 0),
      ocupadas: todas.filter(Boolean).length,
      plazas: todas.length,
    }
  })

  // --- Equilibrio izquierda / derecha ---
  const izq = porVara['Izquierda']
  const der = porVara['Derecha']
  const equilibrio = (izq && der)
    ? {
        difMedia: Math.abs(izq.media - der.media),
        difPeso: Math.abs(izq.peso - der.peso),
        masCargada: izq.peso > der.peso ? 'Izquierda' : 'Derecha',
      }
    : null

  // --- Avisos ---
  const avisos = []
  varas.forEach((vara) => {
    SECCIONES.forEach((seccion) => {
      const g = grupos[vara][seccion]
      if (g.ocupadas < 2) return

      if (g.rango > RANGO_AVISO_CM) {
        avisos.push({
          vara,
          seccion,
          tipo: 'rango',
          texto: `${vara} ${seccion === 'Detras' ? 'detrás' : 'delante'}: ${g.rango} cm de diferencia` +
                 (g.sinTocar ? ` · ${g.sinTocar} sin tocar la vara` : ''),
        })
      }
    })
  })

  if (equilibrio && equilibrio.difMedia >= 3) {
    avisos.push({
      tipo: 'equilibrio',
      texto: `Las varas Izquierda y Derecha se llevan ${equilibrio.difMedia.toFixed(1)} cm de media`,
    })
  }

  const todasLasPersonas = varas.flatMap((v) =>
    SECCIONES.flatMap((s) => (turno.varas[v]?.[s] || []))
  ).filter(Boolean)

  return {
    grupos,
    porVara,
    porMitad,
    equilibrio,
    avisos,
    pesos,
    pesoTotal,
    ocupadas: todasLasPersonas.length,
    mediaGeneral: mediaAltura(todasLasPersonas),
  }
}

// Peso de una posicion concreta
export function pesoDe(stats, vara, seccion, i) {
  return stats?.pesos?.[`${vara}|${seccion}|${i}`] ?? 0
}

// -------------------------------------------------------------
//  MAPA DE CALOR
//  Del verde (carga poco) al rojo (carga mucho), tomando como
//  referencia el reparto ideal de ese turno.
// -------------------------------------------------------------
export function colorPeso(kg, stats) {
  if (!kg || kg <= 0) return { fondo: '#e2e8f0', texto: '#64748b' }   // no toca

  const ideal = stats.ocupadas > 0 ? stats.pesoTotal / stats.ocupadas : 0
  if (!ideal) return { fondo: '#e2e8f0', texto: '#64748b' }

  // 0 = la mitad del ideal (verde)  ·  1 = el doble del ideal (rojo)
  const p = Math.max(0, Math.min(1, (kg - ideal * 0.5) / (ideal * 1.5)))
  const tono = (1 - p) * 120                    // 120 verde, 0 rojo

  return {
    fondo: `hsl(${tono}, 65%, 45%)`,
    texto: '#ffffff',
  }
}

// Escala para la leyenda
export function escalaCalor(stats) {
  const ideal = stats?.ocupadas > 0 ? stats.pesoTotal / stats.ocupadas : 0
  return [
    { etiqueta: 'No toca', kg: 0, ...colorPeso(0, stats) },
    { etiqueta: `${(ideal * 0.5).toFixed(0)} kg`, kg: ideal * 0.5, ...colorPeso(ideal * 0.5, stats) },
    { etiqueta: `${ideal.toFixed(0)} kg`, kg: ideal, ...colorPeso(ideal, stats) },
    { etiqueta: `${(ideal * 1.5).toFixed(0)} kg`, kg: ideal * 1.5, ...colorPeso(ideal * 1.5, stats) },
    { etiqueta: `${(ideal * 2).toFixed(0)} kg +`, kg: ideal * 2, ...colorPeso(ideal * 2, stats) },
  ]
}

// -------------------------------------------------------------
//  RESUMEN DE TODO EL CUADRANTE
// -------------------------------------------------------------
export function estadisticasCuadrante(cuadrante, pieza = 'trono') {
  if (!cuadrante?.length) return []
  return cuadrante.map((turno) => estadisticasTurno(turno, pieza))
}
