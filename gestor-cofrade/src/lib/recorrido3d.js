// =============================================================
//  MOTOR DE LA ANIMACIÓN 3D DEL RECORRIDO
//  El paso avanza por la ruta dejando una estela dorada, se para
//  en cada parada (relevos de turno) con órbita de cámara y avisa
//  a la interfaz para que muestre la tarjeta.
//
//  No depende de React: la interfaz (controles y tarjeta) escucha
//  los eventos onProgreso / onParada / onEstado.
// =============================================================

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../styles/recorrido3d.css'
import { crearRuta, prepararEstilo, ESTILOS } from './mapa'
import { svgPaso } from './pasoSvg'

const CAMARA = {
  zoom: 17.3, pitch: 60,             // mientras anda
  zoomParada: 18.2, pitchParada: 55, // en las paradas
  giroOrbital: 6,                    // grados/segundo de órbita al parar
  adelanto: 14,                      // metros por delante del paso a los que mira
  suavizadoPosicion: 3.2, suavizadoGiro: 1.6, suavizadoZoom: 1.3,
}
const ORO = '#f2c75c', ORO_BLANCO = '#fff3c4', MORADO = '#7b3fa8'
const INTERACCIONES = ['dragPan', 'scrollZoom', 'boxZoom', 'dragRotate', 'keyboard', 'doubleClickZoom', 'touchZoomRotate', 'touchPitch']

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const suave = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x) }
const anguloHacia = (de, a, k) => de + ((((a - de) % 360) + 540) % 360 - 180) * k

export function crearRecorrido3D({
  contenedor,
  coords,
  paradas = [],          // [{ d (metros), pausa (s), ...datos para la tarjeta }]
  iconoUrl = '',
  tamanoIcono = 96,
  velocidadBase = 18,    // metros de recorrido por segundo a 1x
  frenada = 35,          // metros en los que frena y arranca
  eventos = {},
}) {
  const ruta = crearRuta(coords)
  if (!ruta) throw new Error('El recorrido necesita al menos dos puntos')
  const L = ruta.longitud
  const P = paradas
    .map((p) => ({ pausa: 4, ...p, d: clamp(p.d, 0, L) }))
    .sort((a, b) => a.d - b.d)

  const S = {
    d: 0, dDibujada: -1, reproduciendo: false, velocidad: 1,
    estado: 'andando', siguiente: 0, paradaActual: null, tParada: 0,
    orbitaBase: 0, orbitaSentido: 1, seguir: true, cam: null, ultimo: null,
    ultimoAviso: 0,
  }
  let listo = false, destruido = false, raf = 0
  let marcadorPaso, elPaso
  const pines = []

  const map = new maplibregl.Map({
    container: contenedor,
    style: ESTILOS.oscuro,
    bounds: ruta.limites,
    fitBoundsOptions: { padding: 80 },
    pitch: 55, bearing: -18, maxPitch: 75,
    attributionControl: { compact: true },
  })

  const lineaHasta = (d) => {
    if (d < 0.05) return { type: 'FeatureCollection', features: [] }
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ruta.trozo(0, d) } }
  }

  function iniciar() {
    if (listo || destruido) return
    listo = true
    const { rotulos, edificios } = prepararEstilo(map, { tema: 'oscuro' })
    try {
      map.setSky({ 'sky-color': '#1a0f26', 'horizon-color': '#3b2340', 'fog-color': '#140c1c',
        'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.25 })
    } catch { /* versión sin cielo */ }

    map.addSource('r3d-total', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ruta.coords } } })
    map.addSource('r3d-andada', { type: 'geojson', lineMetrics: true, data: lineaHasta(0) })
    const lineas = { 'line-join': 'round', 'line-cap': 'round' }
    const z = (a, b) => ['interpolate', ['linear'], ['zoom'], 14, a, 18, b]
    // La estela va por la calle, bajo los edificios…
    map.addLayer({ id: 'r3d-pendiente', type: 'line', source: 'r3d-total', layout: lineas,
      paint: { 'line-color': '#d9c7ef', 'line-opacity': 0.38, 'line-width': z(1.2, 3), 'line-dasharray': [1, 2.2] } }, edificios)
    map.addLayer({ id: 'r3d-aura', type: 'line', source: 'r3d-andada', layout: lineas,
      paint: { 'line-color': MORADO, 'line-opacity': 0.75, 'line-width': z(10, 34), 'line-blur': z(6, 18) } }, edificios)
    map.addLayer({ id: 'r3d-halo', type: 'line', source: 'r3d-andada', layout: lineas,
      paint: { 'line-color': ORO, 'line-opacity': 0.7, 'line-width': z(5, 15), 'line-blur': 5 } }, edificios)
    map.addLayer({ id: 'r3d-nucleo', type: 'line', source: 'r3d-andada', layout: lineas,
      paint: { 'line-width': z(2.2, 6.5),
        'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, MORADO, 0.55, ORO, 1, ORO_BLANCO] } }, edificios)
    // …y una copia tenue encima, para intuirla cuando un edificio la tapa
    map.addLayer({ id: 'r3d-rayosx', type: 'line', source: 'r3d-andada', layout: lineas,
      paint: { 'line-color': ORO, 'line-opacity': 0.28, 'line-width': z(1.5, 4) } }, rotulos)

    // Marcas de parada
    P.forEach((p, i) => {
      const el = document.createElement('div')
      el.className = 'r3d-pin'
      el.textContent = i + 1
      el.title = p.titulo || ''
      pines.push(el)
      new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ruta.puntoEn(p.d).lngLat).addTo(map)
    })

    // Paso
    elPaso = document.createElement('div')
    elPaso.className = 'r3d-paso'
    elPaso.style.setProperty('--tam', `${tamanoIcono}px`)
    const icono = iconoUrl ? `<img src="${iconoUrl}" alt="Paso">` : svgPaso()
    elPaso.innerHTML = `<div class="luz"></div><div class="sombra"></div><div class="mece">${icono}</div>`
    marcadorPaso = new maplibregl.Marker({ element: elPaso, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
      .setLngLat(ruta.coords[0]).addTo(map)

    setVelocidad(S.velocidad)
    dibujar(true)
    raf = requestAnimationFrame(bucle)
    eventos.onListo?.()
  }
  // Se arranca con el estilo listo, sin esperar a todas las teselas
  map.on('style.load', iniciar)
  map.on('load', iniciar)
  map.on('error', (e) => console.warn('[mapa 3D]', e?.error?.message || e))

  // ---------- Avisos a la interfaz ----------
  const avisarEstado = () => eventos.onEstado?.({ reproduciendo: S.reproduciendo, estado: S.estado })
  const avisarParada = () => eventos.onParada?.(S.paradaActual)

  // ---------- Paradas ----------
  function entrarEnParada(i) {
    S.estado = 'parado'
    S.paradaActual = i
    S.tParada = 0
    S.siguiente = i + 1
    S.orbitaBase = S.cam ? S.cam.bearing : map.getBearing()
    S.orbitaSentido = i % 2 ? -1 : 1
    avisarParada()
  }
  function salirDeParada() {
    const p = P[S.paradaActual]
    S.paradaActual = null
    avisarParada()
    if (p.d >= L - 0.5) { terminar(); return }
    S.estado = 'andando'
    elPaso.classList.remove('levanta'); void elPaso.offsetWidth; elPaso.classList.add('levanta') // ¡Al cielo con él!
    setTimeout(() => elPaso?.classList.remove('levanta'), 800)
  }
  function terminar() {
    S.estado = 'fin'
    S.reproduciendo = false
    S.seguir = false
    setInteracciones(true)
    dibujar(true)
    avisarEstado()
    map.fitBounds(ruta.limites, { padding: 90, pitch: 50, bearing: map.getBearing() - 25, duration: 5000, essential: true })
  }

  // ---------- Bucle ----------
  function avanzar(dt) {
    if (S.estado === 'parado') {
      S.tParada += dt
      if (S.tParada >= Math.max(0, Number(P[S.paradaActual].pausa) || 0)) salirDeParada()
      return
    }
    if (S.estado !== 'andando') return
    const sig = P[S.siguiente], ant = P[S.siguiente - 1]
    const dSig = sig ? sig.d - S.d : L - S.d
    const dAnt = ant ? S.d - ant.d : S.d
    const factor = 0.12 + 0.88 * suave(Math.min(dSig, dAnt) / frenada)
    S.d += velocidadBase * S.velocidad * factor * dt
    if (sig && S.d >= sig.d) { S.d = sig.d; entrarEnParada(S.siguiente) }
    else if (S.d >= L) { S.d = L; terminar() }
  }

  function actualizarCamara(dt, instantaneo) {
    const C = CAMARA
    let centro, zoom, pitch, rumbo
    if (S.estado === 'parado' && S.paradaActual !== null) {
      centro = ruta.puntoEn(P[S.paradaActual].d).lngLat
      zoom = C.zoomParada; pitch = C.pitchParada
      rumbo = S.orbitaBase + C.giroOrbital * S.tParada * S.orbitaSentido
    } else {
      centro = ruta.puntoEn(S.d + C.adelanto).lngLat
      zoom = C.zoom; pitch = C.pitch
      const r = ruta.rumboEn(S.d)
      rumbo = r === null ? (S.cam ? S.cam.bearing : 0) : r
    }
    if (!S.cam || instantaneo) S.cam = { center: [...centro], zoom, pitch, bearing: rumbo }
    else {
      const kP = 1 - Math.exp(-dt * C.suavizadoPosicion)
      const kG = 1 - Math.exp(-dt * C.suavizadoGiro)
      const kZ = 1 - Math.exp(-dt * C.suavizadoZoom)
      S.cam.center = [lerp(S.cam.center[0], centro[0], kP), lerp(S.cam.center[1], centro[1], kP)]
      S.cam.zoom = lerp(S.cam.zoom, zoom, kZ)
      S.cam.pitch = lerp(S.cam.pitch, pitch, kZ)
      S.cam.bearing = anguloHacia(S.cam.bearing, rumbo, kG)
    }
    map.jumpTo(S.cam)
  }

  function dibujar(forzar) {
    if (!listo) return
    elPaso.classList.toggle('andando', S.reproduciendo && S.estado === 'andando')
    if (!forzar && Math.abs(S.d - S.dDibujada) < 0.02) return
    S.dDibujada = S.d
    marcadorPaso.setLngLat(ruta.puntoEn(S.d).lngLat)
    map.getSource('r3d-andada')?.setData(lineaHasta(S.d))
    P.forEach((p, i) => {
      const pasada = p.d < S.d - 0.3 || S.estado === 'fin' || S.paradaActual === i
      pines[i].classList.toggle('visitada', pasada)
      pines[i].classList.toggle('activa', S.paradaActual === i)
    })
    const ahora = performance.now()
    if (forzar || ahora - S.ultimoAviso > 66) { S.ultimoAviso = ahora; eventos.onProgreso?.(S.d, L) }
  }

  function bucle(t) {
    if (destruido) return
    const dt = S.ultimo === null ? 0 : Math.min(0.05, (t - S.ultimo) / 1000)
    S.ultimo = t
    if (S.reproduciendo) avanzar(dt)
    dibujar(false)
    if (S.reproduciendo && S.seguir) actualizarCamara(dt, false)
    raf = requestAnimationFrame(bucle)
  }

  // ---------- Controles ----------
  function setInteracciones(on) {
    INTERACCIONES.forEach((h) => map[h] && (on ? map[h].enable() : map[h].disable()))
  }
  function sincronizarCamara() {
    const c = map.getCenter()
    S.cam = { center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }
  }
  function reproducir() {
    if (!listo) return
    if (S.estado === 'fin') { reiniciar(); return }
    map.stop()
    S.reproduciendo = true
    S.seguir = true
    sincronizarCamara() // vuelve suavemente desde donde lo dejó el usuario
    setInteracciones(false)
    avisarEstado()
  }
  function pausar() {
    S.reproduciendo = false
    setInteracciones(true)
    avisarEstado()
  }
  function alternar() { if (S.reproduciendo) pausar(); else reproducir() }
  function reiniciar() {
    S.d = 0; S.siguiente = 0; S.estado = 'andando'; S.paradaActual = null; S.dDibujada = -1
    avisarParada()
    reproducir()
  }
  function irA(d) {
    if (!listo) return
    map.stop()
    S.d = clamp(d, 0, L)
    if (S.estado === 'fin') { S.estado = 'andando'; avisarEstado() }
    S.estado = 'andando'
    S.paradaActual = null
    avisarParada()
    const i = P.findIndex((p) => p.d > S.d + 0.01)
    S.siguiente = i === -1 ? P.length : i
    S.dDibujada = -1
    dibujar(true)
    actualizarCamara(0, true)
    S.seguir = true
  }
  function setVelocidad(v) {
    S.velocidad = v
    elPaso?.style.setProperty('--mecida', `${(1.7 / Math.sqrt(v)).toFixed(2)}s`)
  }
  function destruir() {
    destruido = true
    cancelAnimationFrame(raf)
    map.remove()
  }

  return {
    map, longitud: L, paradas: P,
    reproducir, pausar, alternar, reiniciar, irA, setVelocidad,
    redimensionar: () => map.resize(),
    estaReproduciendo: () => S.reproduciendo,
    destruir,
  }
}
