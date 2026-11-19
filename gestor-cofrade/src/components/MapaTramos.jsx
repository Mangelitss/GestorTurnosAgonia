// =============================================================
//  MAPA DE TRAMOS
//  El recorrido se ve dividido en tramos, cada uno del color de su
//  turno de trono. Los puntos blancos son los relevos: se arrastran
//  sobre la ruta para decidir dónde empieza y acaba cada tramo.
//  También permite dibujar el recorrido a mano, ajustado a las calles.
// =============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  ESTILOS, CENTRO_POR_DEFECTO, coordsDeRecorrido, crearRuta, rangosTramos, finesDeTramos,
  fijarCortes, repartirTramos, colorTurno, prepararEstilo, calleCercana, caminoPorCalles, simplificar, puntosParaGuardar,
} from '../lib/mapa'

const VACIO = { type: 'FeatureCollection', features: [] }
const km = (m) => `${(m / 1000).toFixed(2).replace('.', ',')} km`

export default function MapaTramos({
  recorrido,
  tramos,                 // ordenados (ida y después regreso)
  seleccionado,
  onSeleccionar,
  soloLectura,
  onCambiarTramos,        // (tramos) => void
  onGuardarRecorrido,     // (recorrido) => void
  onSubirArchivo,
  onQuitarRecorrido,
  onVer3D,
  avisar,
}) {
  const divRef = useRef(null)
  const mapRef = useRef(null)
  const marcadoresRef = useRef([])
  const [listo, setListo] = useState(false)
  const [en3D, setEn3D] = useState(true)

  // Dibujo a mano: cada clic añade un segmento (ajustado a las calles o recto)
  const [dibujo, setDibujo] = useState({ activo: false, segmentos: [], ajustar: true, ocupado: false })
  const dibujoRef = useRef(dibujo)
  dibujoRef.current = dibujo

  const coords = useMemo(() => coordsDeRecorrido(recorrido), [recorrido])
  const ruta = useMemo(() => crearRuta(coords), [coords])
  const rangos = useMemo(() => (ruta ? rangosTramos(tramos, ruta.longitud) : []), [ruta, tramos])

  // Lo último de las props, para los manejadores del mapa
  const vivo = useRef({})
  vivo.current = { tramos, ruta, onSeleccionar, onCambiarTramos, soloLectura }

  // ---------- Crear el mapa (una vez) ----------
  useEffect(() => {
    const map = new maplibregl.Map({
      container: divRef.current,
      style: ESTILOS.claro,
      center: CENTRO_POR_DEFECTO,
      zoom: 15,
      pitch: 50,
      maxPitch: 70,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    let iniciado = false
    const iniciar = () => {
      if (iniciado) return
      iniciado = true
      const { rotulos } = prepararEstilo(map, { tema: 'claro' })
      map.addSource('ruta', { type: 'geojson', data: VACIO })
      map.addSource('tramos', { type: 'geojson', data: VACIO })
      map.addSource('dibujo', { type: 'geojson', data: VACIO })
      const lineas = { 'line-join': 'round', 'line-cap': 'round' }
      // En el editor la ruta va SOBRE los edificios: lo importante es verla entera
      map.addLayer({ id: 'ruta-borde', type: 'line', source: 'ruta', layout: lineas,
        paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 6, 18, 14], 'line-opacity': 0.95 } }, rotulos)
      map.addLayer({ id: 'tramos-linea', type: 'line', source: 'tramos', layout: lineas,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, ['case', ['get', 'sel'], 6, 3.5], 18, ['case', ['get', 'sel'], 12, 7]],
          'line-opacity': ['case', ['get', 'atenuado'], 0.35, 1],
        } }, rotulos)
      map.addLayer({ id: 'tramos-toque', type: 'line', source: 'tramos', layout: lineas,
        paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 22 } }, rotulos)
      map.addLayer({ id: 'dibujo-linea', type: 'line', source: 'dibujo', layout: lineas, filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#4F1243', 'line-width': 4, 'line-dasharray': [2, 1.2] } })
      map.addLayer({ id: 'dibujo-puntos', type: 'circle', source: 'dibujo', filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#4F1243', 'circle-stroke-width': 2.5 } })

      map.on('click', 'tramos-toque', (e) => {
        if (dibujoRef.current.activo) return
        const id = e.features?.[0]?.properties?.id
        if (id) vivo.current.onSeleccionar(id)
      })
      map.on('mouseenter', 'tramos-toque', () => { if (!dibujoRef.current.activo) map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'tramos-toque', () => { if (!dibujoRef.current.activo) map.getCanvas().style.cursor = '' })
      setListo(true)
    }
    map.on('style.load', iniciar)
    map.on('load', iniciar)
    map.on('error', (e) => console.warn('[mapa]', e?.error?.message || e))
    mapRef.current = map
    return () => {
      marcadoresRef.current.forEach((m) => m.remove())
      marcadoresRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ---------- Ruta: datos y encuadre ----------
  useEffect(() => {
    const map = mapRef.current
    if (!listo || !map) return
    map.getSource('ruta').setData(ruta
      ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ruta.coords } }
      : VACIO)
    if (ruta) map.fitBounds(ruta.limites, { padding: 60, duration: 600, maxZoom: 17 })
  }, [listo, ruta])

  // ---------- Tramos coloreados ----------
  const pintarTramos = (lista) => {
    const map = mapRef.current
    if (!map || !ruta) return
    const rs = rangosTramos(lista, ruta.longitud)
    map.getSource('tramos').setData({
      type: 'FeatureCollection',
      features: lista.map((t, k) => ({
        type: 'Feature',
        properties: {
          id: t.id,
          color: colorTurno(t.turno_trono),
          sel: t.id === seleccionado,
          atenuado: !!seleccionado && t.id !== seleccionado,
        },
        geometry: { type: 'LineString', coordinates: ruta.trozo(rs[k].inicio, rs[k].fin) },
      })),
    })
  }

  useEffect(() => {
    const map = mapRef.current
    if (!listo || !map) return
    marcadoresRef.current.forEach((m) => m.remove())
    marcadoresRef.current = []
    if (!ruta || dibujo.activo) {
      map.getSource('tramos').setData(VACIO)
      return
    }
    pintarTramos(tramos)
    const L = ruta.longitud
    const poner = (el, lngLat, opciones = {}) => {
      const m = new maplibregl.Marker({ element: el, ...opciones }).setLngLat(lngLat).addTo(map)
      marcadoresRef.current.push(m)
      return m
    }

    // Etiqueta de cada tramo: número y turno
    tramos.forEach((t, k) => {
      const r = rangos[k]
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `rounded-full border-2 border-white px-2 py-0.5 text-[11px] font-bold text-white shadow-md transition
                      ${seleccionado && seleccionado !== t.id ? 'opacity-50' : ''} ${seleccionado === t.id ? 'ring-2 ring-offset-1 ring-morado scale-110' : ''}`
      el.style.background = colorTurno(t.turno_trono)
      el.textContent = `${k + 1}${t.turno_trono ? ` · ${t.turno_trono}` : ''}`
      el.title = `${t.nombre || `Tramo ${k + 1}`}${t.desde || t.hasta ? ` (${t.desde || '—'} → ${t.hasta || '—'})` : ''}`
      el.addEventListener('click', (e) => { e.stopPropagation(); vivo.current.onSeleccionar(t.id) })
      poner(el, ruta.puntoEn((r.inicio + r.fin) / 2).lngLat)
    })

    // Salida y recogida
    const bandera = (texto, fondo) => {
      const el = document.createElement('div')
      el.className = `rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow ${fondo}`
      el.textContent = texto
      return el
    }
    poner(bandera('Salida', 'bg-emerald-600'), ruta.coords[0], { anchor: 'bottom', offset: [0, -6] })
    poner(bandera('Recogida', 'bg-morado'), ruta.coords[ruta.coords.length - 1], { anchor: 'bottom', offset: [0, -6] })

    // Relevos arrastrables (entre el tramo k y el k+1)
    const fines = finesDeTramos(tramos)
    for (let k = 0; k < tramos.length - 1; k++) {
      const el = document.createElement('div')
      el.className = `h-4 w-4 rounded-full border-[3px] border-morado bg-white shadow-md ${soloLectura ? '' : 'cursor-grab'}`
      el.title = soloLectura ? `Relevo ${k + 1} → ${k + 2}` : `Relevo ${k + 1} → ${k + 2}: arrástralo por la ruta`
      const m = poner(el, ruta.puntoEn(fines[k] * L).lngLat, { draggable: !soloLectura })
      if (soloLectura) continue
      const margen = Math.min(15, L * 0.01)
      const minimo = (k ? fines[k - 1] * L : 0) + margen
      const maximo = fines[k + 1] * L - margen
      let d = fines[k] * L
      m.on('drag', () => {
        const ll = m.getLngLat()
        d = Math.min(maximo, Math.max(minimo, ruta.proyectar([ll.lng, ll.lat]).d))
        m.setLngLat(ruta.puntoEn(d).lngLat)
        pintarTramos(fijarCortes(tramos, { indice: k, fin: d / L }))
      })
      m.on('dragend', () => vivo.current.onCambiarTramos(fijarCortes(vivo.current.tramos, { indice: k, fin: d / L })))
    }
  }, [listo, ruta, tramos, rangos, seleccionado, soloLectura, dibujo.activo])

  // Al elegir un tramo, el mapa se acerca a él
  useEffect(() => {
    const map = mapRef.current
    if (!listo || !map || !ruta || !seleccionado) return
    const k = tramos.findIndex((t) => t.id === seleccionado)
    if (k < 0) return
    map.fitBounds(ruta.limitesDe(ruta.trozo(rangos[k].inicio, rangos[k].fin)), { padding: 90, duration: 700, maxZoom: 17.5 })
  }, [seleccionado])

  // ---------- Dibujo a mano ----------
  const geometriaDibujo = (segmentos) => segmentos.flat()
  useEffect(() => {
    const map = mapRef.current
    if (!listo || !map) return
    const g = geometriaDibujo(dibujo.segmentos)
    const clics = dibujo.segmentos.map((s) => s[s.length - 1])
    map.getSource('dibujo').setData(dibujo.activo ? {
      type: 'FeatureCollection',
      features: [
        ...(g.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: g } }] : []),
        ...clics.map((c) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } })),
      ],
    } : VACIO)
    map.getCanvas().style.cursor = dibujo.activo ? 'crosshair' : ''
    for (const id of ['ruta-borde']) map.setLayoutProperty(id, 'visibility', dibujo.activo ? 'none' : 'visible')
  }, [listo, dibujo])

  useEffect(() => {
    const map = mapRef.current
    if (!listo || !map) return undefined
    const onClic = async (e) => {
      const d = dibujoRef.current
      if (!d.activo || d.ocupado) return
      const p = [e.lngLat.lng, e.lngLat.lat]
      if (!d.segmentos.length) { setDibujo({ ...d, segmentos: [[p]] }); return }
      const ultimo = d.segmentos[d.segmentos.length - 1].slice(-1)[0]
      if (!d.ajustar) { setDibujo({ ...d, segmentos: [...d.segmentos, [p]] }); return }
      setDibujo({ ...d, ocupado: true })
      const camino = await caminoPorCalles(ultimo, p)
      const actual = dibujoRef.current
      if (!actual.activo) return
      if (!camino) avisar?.('No se ha podido ajustar a las calles: se une en línea recta.', 'error')
      setDibujo({ ...actual, ocupado: false, segmentos: [...actual.segmentos, camino ? camino.slice(1) : [p]] })
    }
    map.on('click', onClic)
    return () => map.off('click', onClic)
  }, [listo, avisar])

  const empezarDibujo = () => {
    if (ruta && !confirm('Vas a dibujar un recorrido nuevo que sustituirá al actual. ¿Seguir?')) return
    onSeleccionar(null)
    setDibujo({ activo: true, segmentos: [], ajustar: true, ocupado: false })
    mapRef.current?.easeTo({ pitch: 0, duration: 600 })
    setEn3D(false)
  }
  const guardarDibujo = () => {
    const g = simplificar(geometriaDibujo(dibujo.segmentos))
    if (g.length < 2) { avisar?.('Marca al menos dos puntos del recorrido.', 'error'); return }
    onGuardarRecorrido({ nombre_archivo: 'Dibujado en el mapa', origen: 'dibujo', puntos: puntosParaGuardar(g) })
    setDibujo({ activo: false, segmentos: [], ajustar: true, ocupado: false })
  }

  // ---------- Acciones ----------
  const alternar3D = () => {
    const nuevo = !en3D
    setEn3D(nuevo)
    mapRef.current?.easeTo({ pitch: nuevo ? 50 : 0, duration: 600 })
  }

  const rellenarCalles = async () => {
    const map = mapRef.current
    if (!map || !ruta) return
    // Con toda la ruta a la vista, las teselas con los nombres de calle están cargadas
    map.fitBounds(ruta.limites, { padding: 60, duration: 0, maxZoom: 16 })
    map.triggerRepaint()
    await Promise.race([map.once('idle'), new Promise((r) => setTimeout(r, 3000))])
    let cuantos = 0
    const nuevos = tramos.map((t, k) => {
      const r = rangos[k]
      const c = { ...t }
      if (!c.desde?.trim()) { const n = calleCercana(map, ruta.puntoEn(r.inicio + 3).lngLat); if (n) { c.desde = n; cuantos++ } }
      if (!c.hasta?.trim()) { const n = calleCercana(map, ruta.puntoEn(r.fin - 3).lngLat); if (n) { c.hasta = n; cuantos++ } }
      return c
    })
    if (cuantos) { onCambiarTramos(nuevos); avisar?.(`Rellenados ${cuantos} nombres de calle.`) }
    else avisar?.('No había campos vacíos o no se han encontrado calles cerca.', 'error')
  }

  const huecosVacios = tramos.some((t) => !t.desde?.trim() || !t.hasta?.trim())
  const nPuntosDibujo = dibujo.segmentos.length

  return (
    <div className="card overflow-hidden">
      {/* Cabecera y acciones */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-serif text-base font-bold text-morado">Recorrido y tramos</h3>
          {ruta ? (
            <p className="text-sm text-slate-600">
              📍 <b>{recorrido.nombre_archivo || 'Recorrido'}</b> · {km(ruta.longitud)} · {tramos.length} tramo{tramos.length === 1 ? '' : 's'}
            </p>
          ) : (
            <p className="text-sm text-slate-400">Sube un GPX/KML o dibuja el recorrido sobre el mapa.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!soloLectura && !dibujo.activo && (
            <>
              <button onClick={onSubirArchivo} className="btn-ghost text-xs">📍 {ruta ? 'Cambiar GPX/KML' : 'Subir GPX/KML'}</button>
              <button onClick={empezarDibujo} className="btn-ghost text-xs">✏️ Dibujar</button>
              {ruta && tramos.length > 1 && (
                <button
                  onClick={() => {
                    if (tramos.some((t) => typeof t.fin_ruta === 'number') && !confirm('¿Repartir el recorrido a partes iguales entre los tramos? Se perderán los relevos que hayas colocado.')) return
                    onCambiarTramos(repartirTramos(tramos))
                  }}
                  className="btn-ghost text-xs" title="Divide la ruta en tramos de la misma longitud"
                >
                  ⚖️ Repartir
                </button>
              )}
              {ruta && huecosVacios && (
                <button onClick={rellenarCalles} className="btn-ghost text-xs" title="Pone el nombre de la calle en los Desde/Hasta vacíos">
                  🏷️ Rellenar calles
                </button>
              )}
              {ruta && (
                <button
                  onClick={() => { if (confirm('¿Quitar el recorrido? Los tramos se conservan.')) onQuitarRecorrido() }}
                  className="btn-ghost px-2 text-xs text-red-500" title="Quitar recorrido"
                >
                  🗑️
                </button>
              )}
            </>
          )}
          {ruta && !dibujo.activo && (
            <button onClick={onVer3D} className="btn-morado text-xs">🎬 Ver en 3D</button>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="relative h-[440px] md:h-[520px]">
        {/* h-full y no "absolute inset-0": MapLibre fuerza position:relative en su contenedor */}
        <div ref={divRef} className="h-full w-full" />

        {!dibujo.activo && (
          <button
            onClick={alternar3D}
            className="absolute left-3 top-3 rounded-lg border border-slate-300 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
          >
            {en3D ? '2D' : '3D'}
          </button>
        )}

        {!ruta && !dibujo.activo && listo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/40 p-4">
            <div className="pointer-events-auto max-w-sm rounded-2xl bg-white p-5 text-center shadow-elevada">
              <p className="font-serif font-bold text-morado">Aún no hay recorrido</p>
              <p className="mt-1 text-sm text-slate-500">
                Súbelo en GPX/KML o dibújalo pulsando sobre las calles. Después podrás repartir los tramos y sus turnos sobre el mapa.
              </p>
              {!soloLectura && (
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={onSubirArchivo} className="btn-ghost text-xs">📍 Subir GPX/KML</button>
                  <button onClick={empezarDibujo} className="btn-morado text-xs">✏️ Dibujar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {dibujo.activo && (
          <div className="absolute left-3 right-14 top-3 max-w-md rounded-2xl border border-morado/20 bg-white/95 p-4 shadow-elevada backdrop-blur">
            <p className="text-sm font-bold text-morado">✏️ Dibujando el recorrido</p>
            <p className="mt-1 text-xs text-slate-500">
              Pulsa sobre el mapa en orden, desde la salida hasta la recogida.
              {dibujo.ajustar ? ' Cada tramo se ajusta solo a las calles.' : ' Los puntos se unen en línea recta.'}
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox" checked={dibujo.ajustar}
                onChange={(e) => setDibujo((d) => ({ ...d, ajustar: e.target.checked }))}
              />
              Ajustar a las calles
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-xs text-slate-500">
                {dibujo.ocupado ? 'Buscando el camino…' : `${nPuntosDibujo} punto${nPuntosDibujo === 1 ? '' : 's'}`}
              </span>
              <button
                onClick={() => setDibujo((d) => ({ ...d, segmentos: d.segmentos.slice(0, -1) }))}
                disabled={!nPuntosDibujo || dibujo.ocupado} className="btn-ghost px-3 py-1.5 text-xs"
              >
                ↶ Deshacer
              </button>
              <button onClick={() => setDibujo({ activo: false, segmentos: [], ajustar: true, ocupado: false })} className="btn-ghost px-3 py-1.5 text-xs">
                Cancelar
              </button>
              <button onClick={guardarDibujo} disabled={nPuntosDibujo < 2 || dibujo.ocupado} className="btn-oro px-3 py-1.5 text-xs">
                Guardar recorrido
              </button>
            </div>
          </div>
        )}
      </div>

      {ruta && !dibujo.activo && (
        <p className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
          {soloLectura
            ? 'Cada color es un turno de trono. Pulsa un tramo para verlo.'
            : 'Cada color es un turno de trono. Pulsa un tramo para elegir su turno y arrastra los puntos blancos (relevos) para mover dónde empieza y acaba.'}
        </p>
      )}
    </div>
  )
}
