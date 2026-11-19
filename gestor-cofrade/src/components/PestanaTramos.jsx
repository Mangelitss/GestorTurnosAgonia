// =============================================================
//  PESTAÑA DE TRAMOS
//  Mapa del recorrido dividido en tramos (cada uno del color de su
//  turno), lista de tramos con desde/hasta y asignación de turnos,
//  y vista cinematográfica en 3D.
// =============================================================

import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { FASES } from '../lib/constantes'
import {
  tramoVacio, reordenarTramos, moverTramo, letrasTurno,
} from '../lib/procesiones'
import {
  coordsDeRecorrido, crearRuta, simplificar, puntosParaGuardar, finesDeTramos, colorTurno,
} from '../lib/mapa'
import { Modal, Alerta, Vacio } from './ui'

// El mapa (MapLibre) pesa mucho: solo se descarga al abrir esta pestaña
const MapaTramos = lazy(() => import('./MapaTramos'))
const Recorrido3D = lazy(() => import('./Recorrido3D'))

export default function PestanaTramos({
  procesion,
  soloLectura,
  onCambiar,        // (cambios parciales) => void
  avisar,
}) {
  const [editando, setEditando] = useState(null)
  const [modalRuta, setModalRuta] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [ver3D, setVer3D] = useState(false)

  const tramos = useMemo(
    () => reordenarTramos(procesion.tramos || []),
    [procesion.tramos]
  )
  const coords = useMemo(() => coordsDeRecorrido(procesion.recorrido), [procesion.recorrido])
  const tramoSel = tramos.find((t) => t.id === seleccionado) || null
  const numeroSel = tramoSel ? tramos.indexOf(tramoSel) + 1 : 0

  // Pulsar el mismo tramo otra vez lo deselecciona
  const seleccionar = useCallback(
    (id) => setSeleccionado((actual) => (id && actual === id ? null : id)),
    []
  )

  const letrasTrono = letrasTurno(procesion.turnos_trono || 0, 'trono')   // A, B, C…
  const letrasCruz = letrasTurno(procesion.turnos_cruz || 0, 'cruz')      // 1, 2, 3…

  const ida = tramos.filter((t) => (t.fase || 'ida') === 'ida')
  const regreso = tramos.filter((t) => t.fase === 'regreso')

  // --- Operaciones ---
  const guardarTramo = (datos) => {
    const existe = tramos.some((t) => t.id === datos.id)
    const nuevos = existe
      ? tramos.map((t) => (t.id === datos.id ? datos : t))
      : [...tramos, datos]
    onCambiar({ tramos: reordenarTramos(nuevos) })
    setEditando(null)
  }

  const borrarTramo = (id) => {
    if (!confirm('¿Borrar este tramo?')) return
    onCambiar({ tramos: reordenarTramos(tramos.filter((t) => t.id !== id)) })
    setEditando(null)
  }

  // Al reordenar, los relevos se quedan en su sitio del mapa: lo que se
  // mueve es el tramo (nombre, turnos…), no el trozo de calle.
  const mover = (id, dir) => {
    const fines = finesDeTramos(tramos)
    const movidos = moverTramo(tramos, id, dir)
    const conRuta = tramos.some((t) => typeof t.fin_ruta === 'number')
    onCambiar({
      tramos: conRuta
        ? movidos.map((t, k) => ({ ...t, fin_ruta: k === movidos.length - 1 ? 1 : Math.round(fines[k] * 10000) / 10000 }))
        : movidos,
    })
  }

  const cambiarTurno = (id, campo, valor) => {
    onCambiar({
      tramos: tramos.map((t) => (t.id === id ? { ...t, [campo]: valor || null } : t)),
    })
  }

  const anadir = (fase) => {
    setEditando({
      ...tramoVacio(fase, tramos.length),
      nombre: fase === 'regreso'
        ? `Regreso ${regreso.length + 1}`
        : `Tramo ${ida.length + 1}`,
      turno_trono: letrasTrono[0] || 'A',
    })
  }

  // --- Validación ---
  const sinTurno = tramos.filter((t) => !t.turno_trono)

  return (
    <div className="space-y-6">

      {/* ---- Mapa del recorrido con los tramos ---- */}
      <Suspense fallback={<div className="card grid h-[520px] place-items-center text-sm text-slate-400">Cargando mapa…</div>}>
      <MapaTramos
        recorrido={procesion.recorrido}
        tramos={tramos}
        seleccionado={seleccionado}
        onSeleccionar={seleccionar}
        soloLectura={soloLectura}
        onCambiarTramos={(nuevos) => onCambiar({ tramos: reordenarTramos(nuevos) })}
        onGuardarRecorrido={(r) => { onCambiar({ recorrido: r }); avisar('Recorrido guardado.') }}
        onSubirArchivo={() => setModalRuta(true)}
        onQuitarRecorrido={() => onCambiar({ recorrido: null })}
        onVer3D={() => setVer3D(true)}
        avisar={avisar}
      />
      </Suspense>

      {/* ---- Tramo seleccionado: turnos a mano ---- */}
      {tramoSel && (
        <div className="card animate-aparecer flex flex-wrap items-center gap-3 border-l-4 px-5 py-3"
             style={{ borderLeftColor: colorTurno(tramoSel.turno_trono) }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: colorTurno(tramoSel.turno_trono) }}>
            {numeroSel}
          </span>
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-semibold text-slate-800">{tramoSel.nombre || `Tramo ${numeroSel}`}</p>
            <p className="text-xs text-slate-500">
              {(FASES[tramoSel.fase] || FASES.ida).nombre}
              {(tramoSel.desde || tramoSel.hasta) && ` · ${tramoSel.desde || '—'} → ${tramoSel.hasta || '—'}`}
            </p>
          </div>
          <SelectorTurno
            etiqueta="Trono" clase="text-morado" valor={tramoSel.turno_trono} opciones={letrasTrono}
            soloLectura={soloLectura} onCambiar={(v) => cambiarTurno(tramoSel.id, 'turno_trono', v)}
          />
          {procesion.lleva_cruz && (
            <SelectorTurno
              etiqueta="Cruz" clase="text-sky-700" valor={tramoSel.turno_cruz} opciones={letrasCruz}
              soloLectura={soloLectura} onCambiar={(v) => cambiarTurno(tramoSel.id, 'turno_cruz', v)}
            />
          )}
          {!soloLectura && (
            <button onClick={() => setEditando({ ...tramoSel })} className="btn-ghost px-3 py-1.5 text-xs">✏️ Editar</button>
          )}
          <button onClick={() => setSeleccionado(null)} className="px-2 text-lg leading-none text-slate-400 hover:text-slate-700" title="Quitar selección">×</button>
        </div>
      )}

      {sinTurno.length > 0 && (
        <Alerta tipo="aviso">
          Hay <b>{sinTurno.length} tramo(s) sin turno de trono asignado</b>.
          Todo tramo debe llevar uno.
        </Alerta>
      )}

      {/* ---- Tramos de ida ---- */}
      <BloqueFase
        titulo="Ida"
        icono="→"
        tramos={ida}
        letrasTrono={letrasTrono}
        letrasCruz={letrasCruz}
        llevaCruz={procesion.lleva_cruz}
        soloLectura={soloLectura}
        onEditar={setEditando}
        onMover={mover}
        onCambiarTurno={cambiarTurno}
        onAnadir={() => anadir('ida')}
        seleccionado={seleccionado}
        onSeleccionar={seleccionar}
        desplazamiento={0}
      />

      {/* ---- Tramos de regreso ---- */}
      <BloqueFase
        titulo="Regreso"
        icono="←"
        tramos={regreso}
        letrasTrono={letrasTrono}
        letrasCruz={letrasCruz}
        llevaCruz={procesion.lleva_cruz}
        soloLectura={soloLectura}
        onEditar={setEditando}
        onMover={mover}
        onCambiarTurno={cambiarTurno}
        onAnadir={() => anadir('regreso')}
        nota="Entre la ida y el regreso hay descanso, así que cargar en el último tramo de la ida y el primero del regreso no cuenta como tramos seguidos."
        seleccionado={seleccionado}
        onSeleccionar={seleccionar}
        desplazamiento={ida.length}
      />

      {/* ---- Modales ---- */}
      <FichaTramo
        tramo={editando}
        letrasTrono={letrasTrono}
        letrasCruz={letrasCruz}
        llevaCruz={procesion.lleva_cruz}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarTramo}
        onBorrar={borrarTramo}
      />

      <ModalRecorrido
        abierto={modalRuta}
        onCerrar={() => setModalRuta(false)}
        onCargar={(r) => { onCambiar({ recorrido: r }); setModalRuta(false); avisar('Recorrido cargado.') }}
      />

      {ver3D && (
        <Suspense fallback={null}>
          <Recorrido3D
            abierto={ver3D}
            onCerrar={() => setVer3D(false)}
            coords={coords}
            tramos={tramos}
            titulo={procesion.nombre}
            subtitulo="Recorrido procesional"
            llevaCruz={procesion.lleva_cruz}
          />
        </Suspense>
      )}
    </div>
  )
}

function SelectorTurno({ etiqueta, clase, valor, opciones, soloLectura, onCambiar }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <span className={`text-[10px] font-bold uppercase tracking-wide ${clase}`}>{etiqueta}</span>
      <select
        className="input w-16 px-2 py-1 text-sm"
        value={valor || ''}
        disabled={soloLectura}
        onChange={(e) => onCambiar(e.target.value)}
      >
        <option value="">—</option>
        {opciones.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </label>
  )
}

// =============================================================
//  BLOQUE DE UNA FASE
// =============================================================

function BloqueFase({
  titulo, icono, tramos, letrasTrono, letrasCruz, llevaCruz,
  soloLectura, onEditar, onMover, onCambiarTurno, onAnadir, nota,
  seleccionado, onSeleccionar, desplazamiento = 0,
}) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <h3 className="font-serif text-base font-bold text-morado flex items-center gap-2">
          <span className="text-oro-dark">{icono}</span> {titulo}
          <span className="text-xs font-normal text-slate-400">
            ({tramos.length} tramo{tramos.length === 1 ? '' : 's'})
          </span>
        </h3>
        {!soloLectura && (
          <button onClick={onAnadir} className="btn-ghost text-xs">
            ➕ Añadir tramo
          </button>
        )}
      </div>

      {nota && tramos.length > 0 && (
        <p className="px-5 py-2 text-xs text-slate-500 bg-sky-50/50 border-b border-slate-100">
          ℹ️ {nota}
        </p>
      )}

      {tramos.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          No hay tramos de {titulo.toLowerCase()}.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {tramos.map((t, i) => (
            <div
              key={t.id}
              onClick={(e) => { if (!e.target.closest('select, button, label')) onSeleccionar(t.id) }}
              className={`cursor-pointer px-5 py-3 transition ${
                seleccionado === t.id ? 'bg-oro/10' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">

                {/* Orden, del color de su turno de trono (igual que en el mapa) */}
                <span
                  className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0
                              ${seleccionado === t.id ? 'ring-2 ring-offset-2 ring-morado' : ''}`}
                  style={{ background: colorTurno(t.turno_trono) }}
                  title="Ver en el mapa"
                >
                  {desplazamiento + i + 1}
                </span>

                {/* Nombre y recorrido */}
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-sm text-slate-800">
                    {t.nombre || `Tramo ${i + 1}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.desde || t.hasta
                      ? `${t.desde || '—'} → ${t.hasta || '—'}`
                      : <span className="italic text-slate-300">Sin recorrido definido</span>}
                  </p>
                </div>

                {/* Turno de trono */}
                <label className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-morado uppercase tracking-wide">
                    Trono
                  </span>
                  <select
                    className="input py-1 px-2 w-16 text-sm"
                    value={t.turno_trono || ''}
                    disabled={soloLectura}
                    onChange={(e) => onCambiarTurno(t.id, 'turno_trono', e.target.value)}
                  >
                    <option value="">—</option>
                    {letrasTrono.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>

                {/* Turno de cruz */}
                {llevaCruz && (
                  <label className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wide">
                      Cruz
                    </span>
                    <select
                      className="input py-1 px-2 w-16 text-sm"
                      value={t.turno_cruz || ''}
                      disabled={soloLectura}
                      onChange={(e) => onCambiarTurno(t.id, 'turno_cruz', e.target.value)}
                    >
                      <option value="">—</option>
                      {letrasCruz.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>
                )}

                {/* Acciones */}
                {!soloLectura && (
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={() => onMover(t.id, -1)}
                      disabled={i === 0}
                      className="px-1.5 py-1 rounded text-slate-400 hover:text-morado
                                 hover:bg-slate-100 disabled:opacity-20 transition"
                      title="Subir"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onMover(t.id, 1)}
                      disabled={i === tramos.length - 1}
                      className="px-1.5 py-1 rounded text-slate-400 hover:text-morado
                                 hover:bg-slate-100 disabled:opacity-20 transition"
                      title="Bajar"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => onEditar({ ...t })}
                      className="px-1.5 py-1 rounded text-slate-400 hover:text-morado
                                 hover:bg-slate-100 transition"
                      title="Editar"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>

              {t.texto && (
                <p className="text-xs text-slate-500 bg-oro/5 border-l-2 border-oro/40 px-3 py-1.5 mt-2 ml-10">
                  {t.texto}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================
//  FICHA DE UN TRAMO
// =============================================================

function FichaTramo({ tramo, letrasTrono, letrasCruz, llevaCruz, onCerrar, onGuardar, onBorrar }) {
  const [f, setF] = useState(null)
  const [error, setError] = useState('')

  // Sincronizamos al abrir
  if (tramo && (!f || f.id !== tramo.id)) {
    setF({ ...tramo })
    setError('')
  }
  if (!tramo || !f) return null

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.nombre?.trim()) return setError('Ponle un nombre al tramo.')
    if (!f.turno_trono) return setError('Todo tramo debe llevar un turno de trono.')
    onGuardar({ ...f, nombre: f.nombre.trim() })
  }

  return (
    <Modal abierto={!!tramo} onCerrar={onCerrar} titulo="Tramo del recorrido">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="label">Nombre del tramo *</label>
          <input
            className="input" autoFocus value={f.nombre || ''}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Ej: Tramo 1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Desde</label>
            <input
              className="input" value={f.desde || ''}
              onChange={(e) => set('desde', e.target.value)}
              placeholder="Santuario de Monserrate"
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              className="input" value={f.hasta || ''}
              onChange={(e) => set('hasta', e.target.value)}
              placeholder="Ayuntamiento"
            />
          </div>
        </div>

        <div>
          <label className="label">Fase</label>
          <div className="flex gap-2">
            {Object.values(FASES).map((fa) => (
              <button
                key={fa.id}
                type="button"
                onClick={() => set('fase', fa.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition ${
                  (f.fase || 'ida') === fa.id
                    ? 'border-oro bg-oro/5 text-morado'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {fa.icono} {fa.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Turno de trono *</label>
            <select
              className="input" value={f.turno_trono || ''}
              onChange={(e) => set('turno_trono', e.target.value)}
            >
              <option value="">— Elige turno —</option>
              {letrasTrono.map((l) => <option key={l} value={l}>Turno {l}</option>)}
            </select>
          </div>
          {llevaCruz && (
            <div>
              <label className="label">Turno de cruz</label>
              <select
                className="input" value={f.turno_cruz || ''}
                onChange={(e) => set('turno_cruz', e.target.value || null)}
              >
                <option value="">— Sin cruz —</option>
                {letrasCruz.map((l) => <option key={l} value={l}>Turno {l}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="label">Indicaciones de este tramo</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={f.texto || ''}
            onChange={(e) => set('texto', e.target.value)}
            placeholder="Texto que saldrá en el PDF y en la web para este tramo…"
          />
        </div>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => onBorrar(f.id)} className="btn-rojo">
            🗑️ Borrar
          </button>
          <div className="flex-1" />
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-morado">Guardar tramo</button>
        </div>
      </form>
    </Modal>
  )
}

// =============================================================
//  MODAL: SUBIR RECORRIDO
// =============================================================

function ModalRecorrido({ abierto, onCerrar, onCargar }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [previo, setPrevio] = useState(null)

  const onArchivo = async (e) => {
    setError('')
    setPrevio(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const texto = await file.text()
      const pares = extraerPuntos(texto)                 // [lat, lon]
      if (pares.length < 2) {
        throw new Error('No se han encontrado coordenadas en el archivo.')
      }
      // Se guarda como [{lat,lng}] (Firestore no admite arrays anidados)
      // y sin puntos redundantes para no engordar el documento.
      const coords = simplificar(pares.map(([lat, lon]) => [lon, lat]))
      const ruta = crearRuta(coords)
      setPrevio({
        nombre_archivo: file.name,
        origen: 'gpx',
        puntos: puntosParaGuardar(coords),
        metros: ruta ? Math.round(ruta.longitud) : 0,
      })
    } catch (err) {
      setError(err.message || 'No se ha podido leer el archivo.')
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Recorrido de la procesión">
      <p className="text-sm text-slate-500 mb-4">
        Sube un archivo <b>GPX</b> o <b>KML</b> con el recorrido. Puedes exportarlo
        desde Google Maps, Wikiloc o cualquier app de rutas.
      </p>

      <input
        ref={inputRef}
        type="file" accept=".gpx,.kml,.xml,text/xml"
        onChange={onArchivo}
        className="block w-full text-sm text-slate-600 mb-4
                   file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0
                   file:text-sm file:font-semibold file:bg-morado file:text-white
                   hover:file:bg-morado-light file:cursor-pointer cursor-pointer"
      />

      {error && <Alerta tipo="error">{error}</Alerta>}

      {previo && (
        <div className="space-y-4">
          <Alerta tipo="exito">
            <b>{previo.nombre_archivo}</b>
            <br />
            {previo.puntos.length} puntos · {(previo.metros / 1000).toFixed(2).replace('.', ',')} km de recorrido.
          </Alerta>

          <div className="flex gap-2 justify-end">
            <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
            <button onClick={() => { const { metros: _m, ...r } = previo; onCargar(r) }} className="btn-oro">
              Guardar recorrido
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// Extrae coordenadas de un GPX o KML sin librerias externas
function extraerPuntos(texto) {
  const puntos = []

  // --- GPX: <trkpt lat="..." lon="..."> o <rtept ...> ---
  const gpx = texto.matchAll(/<(?:trkpt|rtept|wpt)[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"/g)
  for (const m of gpx) {
    puntos.push([Number(m[1]), Number(m[2])])
  }
  if (puntos.length) return puntos

  // --- KML: <coordinates>lon,lat,alt lon,lat,alt ...</coordinates> ---
  const kml = texto.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/g)
  for (const m of kml) {
    m[1].trim().split(/\s+/).forEach((par) => {
      const [lon, lat] = par.split(',').map(Number)
      if (Number.isFinite(lat) && Number.isFinite(lon)) puntos.push([lat, lon])
    })
  }

  return puntos
}
