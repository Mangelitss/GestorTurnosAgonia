// =============================================================
//  MAPA DEL RECORRIDO
//  Geometría de la ruta, reparto de tramos sobre ella y estilo
//  del mapa (MapLibre + OpenFreeMap, sin claves de pago).
//
//  Formato guardado en la procesión (Firestore no admite arrays
//  anidados, por eso cada punto es un objeto):
//    recorrido: { nombre_archivo, origen: 'gpx'|'dibujo', puntos: [{lat,lng}, ...] }
//    tramo.fin_ruta: 0..1  -> dónde termina el tramo, en fracción del recorrido.
//                             El tramo empieza donde acaba el anterior.
// =============================================================

import { indiceDeEtiqueta } from './constantes'

export const ESTILOS = {
  claro: 'https://tiles.openfreemap.org/styles/positron',
  oscuro: 'https://tiles.openfreemap.org/styles/dark',
}

// Centro por defecto (Orihuela) cuando aún no hay recorrido
export const CENTRO_POR_DEFECTO = [-0.9465, 38.0858]

// -------------------------------------------------------------
//  PUNTOS: lectura, guardado y simplificación
// -------------------------------------------------------------

// Devuelve [[lng, lat], ...] admitiendo el formato nuevo ({lat,lng})
// y el antiguo ([lat, lng]).
export function coordsDeRecorrido(recorrido) {
  const puntos = recorrido?.puntos || []
  return puntos
    .map((p) => (Array.isArray(p) ? [Number(p[1]), Number(p[0])] : [Number(p.lng), Number(p.lat)]))
    .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
}

export function puntosParaGuardar(coords) {
  return coords.map(([lng, lat]) => ({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) }))
}

// Quita puntos redundantes (muy juntos) para que el documento no crezca.
export function simplificar(coords, minimo = 2.5, maximo = 2500) {
  if (coords.length < 3) return coords
  let paso = minimo
  let salida = coords
  for (let intento = 0; intento < 8; intento++) {
    const [o] = coords
    const mx = 111320 * Math.cos((o[1] * Math.PI) / 180)
    salida = [coords[0]]
    for (let i = 1; i < coords.length - 1; i++) {
      const a = salida[salida.length - 1], b = coords[i]
      if (Math.hypot((b[0] - a[0]) * mx, (b[1] - a[1]) * 110540) >= paso) salida.push(b)
    }
    salida.push(coords[coords.length - 1])
    if (salida.length <= maximo) break
    paso *= 1.6
  }
  return salida
}

// -------------------------------------------------------------
//  RUTA: distancias, interpolación y proyección
// -------------------------------------------------------------

export function crearRuta(coords) {
  if (!coords || coords.length < 2) return null
  const o = coords[0]
  const mx = 111320 * Math.cos((o[1] * Math.PI) / 180), my = 110540
  const aXY = (c) => [(c[0] - o[0]) * mx, (c[1] - o[1]) * my]
  const xy = coords.map(aXY)
  const dist = [0]
  for (let i = 1; i < xy.length; i++) {
    dist.push(dist[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]))
  }
  const longitud = dist[dist.length - 1]
  const clamp = (v) => Math.min(longitud, Math.max(0, v))

  const segmento = (d) => {
    let lo = 0, hi = dist.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (dist[m] <= d) lo = m; else hi = m }
    return lo
  }

  const puntoEn = (d) => {
    d = clamp(d)
    const i = segmento(d), j = Math.min(i + 1, coords.length - 1)
    const len = dist[j] - dist[i], t = len > 0 ? (d - dist[i]) / len : 0
    return {
      i,
      lngLat: [coords[i][0] + (coords[j][0] - coords[i][0]) * t, coords[i][1] + (coords[j][1] - coords[i][1]) * t],
      xy: [xy[i][0] + (xy[j][0] - xy[i][0]) * t, xy[i][1] + (xy[j][1] - xy[i][1]) * t],
    }
  }

  // Rumbo de la calle (0 = norte, sentido horario)
  const rumboEn = (d, atras = 8, adelante = 26) => {
    const a = puntoEn(d - atras).xy, b = puntoEn(d + adelante).xy
    const dx = b[0] - a[0], dy = b[1] - a[1]
    return Math.hypot(dx, dy) < 0.5 ? null : (Math.atan2(dx, dy) * 180) / Math.PI
  }

  // Punto de la ruta más cercano a una coordenada -> { d, metros }
  const proyectar = (lngLat) => {
    const p = aXY(lngLat)
    let mejor = { d: 0, metros: Infinity }
    for (let i = 0; i < xy.length - 1; i++) {
      const a = xy[i], b = xy[i + 1]
      const vx = b[0] - a[0], vy = b[1] - a[1]
      const l2 = vx * vx + vy * vy
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2)) : 0
      const m = Math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1])
      if (m < mejor.metros) mejor = { d: dist[i] + Math.sqrt(l2) * t, metros: m }
    }
    return mejor
  }

  // Coordenadas entre dos distancias
  const trozo = (d0, d1) => {
    d0 = clamp(d0); d1 = clamp(d1)
    if (d1 <= d0) return [puntoEn(d0).lngLat, puntoEn(d0).lngLat]
    const salida = [puntoEn(d0).lngLat]
    for (let i = 0; i < coords.length; i++) if (dist[i] > d0 && dist[i] < d1) salida.push(coords[i])
    salida.push(puntoEn(d1).lngLat)
    return salida
  }

  const limitesDe = (lista) => lista.reduce(
    (b, c) => [[Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])], [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])]],
    [[lista[0][0], lista[0][1]], [lista[0][0], lista[0][1]]]
  )

  return {
    coords, dist, longitud, puntoEn, rumboEn, proyectar, trozo,
    limites: limitesDe(coords), limitesDe,
  }
}

// -------------------------------------------------------------
//  TRAMOS SOBRE LA RUTA
// -------------------------------------------------------------

const valida = (f) => typeof f === 'number' && Number.isFinite(f) && f > 0 && f < 1

// Fracción (0..1) donde termina cada tramo. Los que no la tienen se
// reparten a partes iguales entre sus vecinos conocidos.
export function finesDeTramos(tramos) {
  const n = tramos.length
  if (!n) return []
  const fines = tramos.map((t, i) => (i < n - 1 && valida(t.fin_ruta) ? t.fin_ruta : null))
  fines[n - 1] = 1
  let previo = 0
  for (let i = 0; i < n - 1; i++) {
    if (fines[i] === null) continue
    if (fines[i] <= previo) fines[i] = null
    else previo = fines[i]
  }
  let ancla = -1, valor = 0
  for (let k = 0; k < n; k++) {
    if (fines[k] === null) continue
    const hueco = k - ancla
    for (let j = ancla + 1; j < k; j++) fines[j] = valor + ((fines[k] - valor) * (j - ancla)) / hueco
    ancla = k
    valor = fines[k]
  }
  return fines
}

// [{ id, inicio, fin }] en metros
export function rangosTramos(tramos, longitud) {
  const fines = finesDeTramos(tramos)
  return tramos.map((t, k) => ({ id: t.id, inicio: (k ? fines[k - 1] : 0) * longitud, fin: fines[k] * longitud }))
}

const redondear = (f) => Math.round(f * 10000) / 10000

// Fija todos los cortes (con uno cambiado, si se indica)
export function fijarCortes(tramos, cambio = null) {
  const fines = finesDeTramos(tramos)
  if (cambio) fines[cambio.indice] = cambio.fin
  return tramos.map((t, k) => ({ ...t, fin_ruta: k === tramos.length - 1 ? 1 : redondear(fines[k]) }))
}

// Reparte la ruta a partes iguales entre los tramos
export function repartirTramos(tramos) {
  const n = tramos.length
  return tramos.map((t, k) => ({ ...t, fin_ruta: k === n - 1 ? 1 : redondear((k + 1) / n) }))
}

// -------------------------------------------------------------
//  COLORES DE TURNO
// -------------------------------------------------------------

export const COLORES_TURNO = ['#8e24aa', '#e0a100', '#1e88e5', '#e53935', '#43a047', '#f4511e', '#00897b', '#6d4c41']

export function colorTurno(etiqueta) {
  const i = indiceDeEtiqueta(etiqueta)
  return i === null || i < 0 ? '#94a3b8' : COLORES_TURNO[i % COLORES_TURNO.length]
}

// -------------------------------------------------------------
//  ESTILO DEL MAPA
// -------------------------------------------------------------

export function fuenteVectorial(map) {
  const fuentes = map.getStyle().sources
  return Object.keys(fuentes).find((k) => fuentes[k].type === 'vector')
}

const TONOS = {
  // Piedra cálida para la vista de noche; tonos claros para el editor
  oscuro: { colores: ['#5e4a3f', '#6e5747', '#7f6753'], luz: { color: '#ffe3bf', intensity: 0.5 } },
  claro: { colores: ['#e4ddd3', '#d9d0c4', '#cbc0b1'], luz: { color: '#ffffff', intensity: 0.35 } },
}

// Prepara el estilo: edificios 3D, luz y limpieza de iconos.
// Devuelve el id de la capa ANTES de la cual deben ir las capas
// propias para quedar por encima de calles y edificios (pero bajo
// los rótulos).
//
// Ojo: las capas 3D tienen que ir DESPUÉS de todas las capas planas.
// Si alguna capa plana (calles, planta de edificios…) va detrás, se
// pinta encima de la extrusión y tapa los tejados.
export function prepararEstilo(map, { tema = 'oscuro', ocultarIconos = true } = {}) {
  const fuente = fuenteVectorial(map)
  for (const capa of map.getStyle().layers) {
    if (capa.type === 'fill-extrusion') map.removeLayer(capa.id)
    else if (capa['source-layer'] === 'building' && capa.type === 'fill') map.setLayoutProperty(capa.id, 'visibility', 'none')
    else if (ocultarIconos && capa.type === 'symbol' && /poi/i.test(capa.id)) map.setLayoutProperty(capa.id, 'visibility', 'none')
  }
  const capas = map.getStyle().layers
  let ultimaPlana = -1
  capas.forEach((c, i) => { if (c.type !== 'symbol') ultimaPlana = i })
  const rotulos = capas[ultimaPlana + 1]?.id

  const t = TONOS[tema] || TONOS.oscuro
  if (fuente) {
    map.addLayer({
      id: 'edificios-3d',
      type: 'fill-extrusion',
      source: fuente,
      'source-layer': 'building',
      minzoom: 14,
      filter: ['!', ['to-boolean', ['get', 'hide_3d']]],
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8],
          0, t.colores[0], 12, t.colores[1], 30, t.colores[2]],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.2, ['coalesce', ['get', 'render_height'], 8]],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.2, ['coalesce', ['get', 'render_min_height'], 0]],
        // Opacos: si son translúcidos se transparentan las paredes de atrás
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
      },
    }, rotulos)
  }
  try { map.setLight({ anchor: 'viewport', position: [1.3, 200, 35], ...t.luz }) } catch { /* sin luz */ }
  return { rotulos, edificios: map.getLayer('edificios-3d') ? 'edificios-3d' : rotulos }
}

// -------------------------------------------------------------
//  NOMBRE DE LA CALLE MÁS CERCANA (datos del propio mapa)
// -------------------------------------------------------------

export function calleCercana(map, lngLat, radio = 35) {
  const fuente = fuenteVectorial(map)
  if (!fuente) return null
  const mx = 111320 * Math.cos((lngLat[1] * Math.PI) / 180)
  const aXY = (c) => [(c[0] - lngLat[0]) * mx, (c[1] - lngLat[1]) * 110540]
  let mejor = { nombre: null, metros: radio }
  let feats = []
  try { feats = map.querySourceFeatures(fuente, { sourceLayer: 'transportation_name' }) } catch { return null }
  for (const f of feats) {
    const nombre = f.properties?.['name:es'] || f.properties?.name
    if (!nombre) continue
    const g = f.geometry
    const lineas = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
    for (const linea of lineas) {
      for (let i = 0; i < linea.length - 1; i++) {
        const a = aXY(linea[i]), b = aXY(linea[i + 1])
        const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy
        const t = l2 > 0 ? Math.max(0, Math.min(1, -(a[0] * vx + a[1] * vy) / l2)) : 0
        const m = Math.hypot(a[0] + vx * t, a[1] + vy * t)
        if (m < mejor.metros) mejor = { nombre, metros: m }
      }
    }
  }
  return mejor.nombre
}

// -------------------------------------------------------------
//  TRAZADO A PIE POR LAS CALLES (servidor público de OSRM)
// -------------------------------------------------------------

export async function caminoPorCalles(a, b) {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    const c = j?.routes?.[0]?.geometry?.coordinates
    return j.code === 'Ok' && c?.length >= 2 ? c : null
  } catch {
    return null
  }
}
