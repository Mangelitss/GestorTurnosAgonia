// =============================================================
//  CENSO DE COSTALEROS
//  Tabla con buscador, filtros, seleccion multiple, alta/edicion,
//  campos personalizados e importacion del datos.json antiguo.
// =============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  leerCenso, crearCostalero, actualizarCostalero, borrarCostalero,
  costaleroVacio, normalizar, marcarProcesionEnLote, borrarEnLote,
  leerCamposExtra, anadirCampoExtra, borrarCampoExtra, valorPorDefecto,
  importarCensoAntiguo, exportarCensoJSON,
  aplicarExclusion, normalizarExclusion,
} from '../lib/censo'
import { OPCIONES_HOMBRO } from '../lib/constantes'
import { P } from '../lib/roles'
import { useAuth } from '../context/AuthContext'
import { Page, PageHeader, Cargando, Vacio, Modal, Alerta, Toast } from '../components/ui'

export default function Censo() {
  const { puede } = useAuth()
  const puedeEditar = puede(P.CENSO_EDITAR)
  const puedeBorrar = puede(P.CENSO_BORRAR)
  const puedeImportar = puede(P.CENSO_IMPORTAR)
  const puedeCampos = puede(P.CENSO_CAMPOS)

  const [censo, setCenso] = useState([])
  const [camposExtra, setCamposExtra] = useState([])
  const [cargando, setCargando] = useState(true)
  const [toast, setToast] = useState(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | miercoles | viernes | ninguna
  const [orden, setOrden] = useState({ col: 'nombre', desc: false })

  // Seleccion multiple
  const [seleccionados, setSeleccionados] = useState(new Set())

  // Modales
  const [editando, setEditando] = useState(null)      // objeto costalero o null
  const [modalCampos, setModalCampos] = useState(false)
  const [modalImportar, setModalImportar] = useState(false)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  // --- Carga inicial ---
  const recargar = async () => {
    setCargando(true)
    try {
      const [lista, campos] = await Promise.all([leerCenso(), leerCamposExtra()])
      setCenso(lista)
      setCamposExtra(campos)
    } catch (e) {
      console.error(e)
      avisar('No se ha podido cargar el censo.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { recargar() }, [])

  // --- Filtrado y ordenacion ---
  const visibles = useMemo(() => {
    const q = normalizar(busqueda)
    let lista = censo.filter((c) => {
      if (q && !normalizar(c.nombre).includes(q) && !String(c.altura).includes(q)) return false
      if (filtro === 'miercoles' && !c.miercoles_santo) return false
      if (filtro === 'viernes' && !c.viernes_santo) return false
      if (filtro === 'cruz' && !c.cruz_miercoles && !c.cruz_viernes) return false
      if (filtro === 'ninguna' && (c.miercoles_santo || c.viernes_santo)) return false
      return true
    })

    const { col, desc } = orden
    lista = [...lista].sort((a, b) => {
      let r
      if (col === 'altura') r = (a.altura || 0) - (b.altura || 0)
      else r = normalizar(a[col]).localeCompare(normalizar(b[col]))
      return desc ? -r : r
    })
    return lista
  }, [censo, busqueda, filtro, orden])

  const ordenarPor = (col) =>
    setOrden((o) => ({ col, desc: o.col === col ? !o.desc : false }))

  // --- Seleccion ---
  const alternarSeleccion = (id) => {
    setSeleccionados((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const todosVisiblesSeleccionados =
    visibles.length > 0 && visibles.every((c) => seleccionados.has(c.id))

  const alternarTodos = () => {
    setSeleccionados((s) => {
      const n = new Set(s)
      if (todosVisiblesSeleccionados) visibles.forEach((c) => n.delete(c.id))
      else visibles.forEach((c) => n.add(c.id))
      return n
    })
  }

  // --- Acciones en lote ---
  const accionLote = async (campo, valor) => {
    const ids = [...seleccionados]
    if (!ids.length) return
    try {
      await marcarProcesionEnLote(ids, campo, valor)

      // Día y cruz se excluyen: al marcar uno, desmarcamos el otro
      if (valor) {
        const opuesto = { ...aplicarExclusion({}, campo, true) }
        delete opuesto[campo]
        for (const [k, v] of Object.entries(opuesto)) {
          await marcarProcesionEnLote(ids, k, v)
        }
      }

      avisar(`${ids.length} costaleros actualizados.`)
      setSeleccionados(new Set())
      recargar()
    } catch {
      avisar('No se han podido guardar los cambios.', 'error')
    }
  }

  const borrarSeleccionados = async () => {
    const ids = [...seleccionados]
    if (!ids.length) return
    if (!confirm(`¿Seguro que quieres borrar ${ids.length} costalero(s) del censo?\n\nEsta acción no se puede deshacer.`)) return
    try {
      await borrarEnLote(ids)
      avisar(`${ids.length} costaleros eliminados.`)
      setSeleccionados(new Set())
      recargar()
    } catch {
      avisar('No se han podido borrar.', 'error')
    }
  }

  // --- Guardar ficha ---
  const guardarFicha = async (datos) => {
    try {
      if (datos.id) {
        await actualizarCostalero(datos.id, datos)
        avisar('Costalero actualizado.')
      } else {
        await crearCostalero(datos)
        avisar('Costalero añadido al censo.')
      }
      setEditando(null)
      recargar()
    } catch (e) {
      console.error(e)
      avisar('No se ha podido guardar.', 'error')
    }
  }

  const eliminarFicha = async (id, nombre) => {
    if (!confirm(`¿Borrar a ${nombre} del censo?`)) return
    try {
      await borrarCostalero(id)
      avisar('Costalero eliminado.')
      setEditando(null)
      recargar()
    } catch {
      avisar('No se ha podido borrar.', 'error')
    }
  }

  // --- Contadores ---
  const stats = useMemo(() => ({
    total: censo.length,
    miercoles: censo.filter((c) => c.miercoles_santo).length,
    viernes: censo.filter((c) => c.viernes_santo).length,
    cruzMie: censo.filter((c) => c.cruz_miercoles).length,
    cruzVie: censo.filter((c) => c.cruz_viernes).length,
  }), [censo])

  return (
    <Page>
      <PageHeader
        titulo="Censo de Costaleros"
        icono="👥"
        subtitulo={`${stats.total} costaleros · ${stats.miercoles} Miércoles · ${stats.viernes} Viernes · ✚ ${stats.cruzMie}/${stats.cruzVie} cruz`}
      >
        {puedeCampos && (
          <button onClick={() => setModalCampos(true)} className="btn-ghost text-xs">
            ⚙️ Campos
          </button>
        )}
        {puedeImportar && (
          <button onClick={() => setModalImportar(true)} className="btn-ghost text-xs">
            📥 Importar
          </button>
        )}
        <button onClick={() => exportarCensoJSON(censo)} className="btn-ghost text-xs">
          💾 Exportar
        </button>
        {puedeEditar && (
          <button
            onClick={() => setEditando({ ...costaleroVacio() })}
            className="btn-oro"
          >
            ➕ Añadir costalero
          </button>
        )}
      </PageHeader>

      {/* --- Barra de filtros --- */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              className="input pl-9"
              placeholder="Buscar por nombre o altura…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'miercoles', label: 'Miércoles' },
              { id: 'viernes', label: 'Viernes' },
              { id: 'cruz', label: '✚ Cruz' },
              { id: 'ninguna', label: 'Sin apuntar' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  filtro === f.id
                    ? 'bg-white text-morado shadow-sm'
                    : 'text-slate-600 hover:text-morado'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 whitespace-nowrap">
            {visibles.length} de {censo.length}
          </span>
        </div>

        {/* --- Acciones en lote --- */}
        {seleccionados.size > 0 && puedeEditar && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-morado mr-1">
              {seleccionados.size} seleccionado(s):
            </span>
            <button onClick={() => accionLote('miercoles_santo', true)} className="btn-ghost text-xs">
              + Miércoles
            </button>
            <button onClick={() => accionLote('miercoles_santo', false)} className="btn-ghost text-xs">
              − Miércoles
            </button>
            <button onClick={() => accionLote('viernes_santo', true)} className="btn-ghost text-xs">
              + Viernes
            </button>
            <button onClick={() => accionLote('viernes_santo', false)} className="btn-ghost text-xs">
              − Viernes
            </button>
            <span className="w-px h-5 bg-slate-200" />
            <button onClick={() => accionLote('cruz_miercoles', true)} className="btn-ghost text-xs">
              ✚ Cruz Mié
            </button>
            <button onClick={() => accionLote('cruz_viernes', true)} className="btn-ghost text-xs">
              ✚ Cruz Vie
            </button>
            {puedeBorrar && (
              <button onClick={borrarSeleccionados} className="btn-rojo text-xs ml-auto">
                🗑️ Borrar
              </button>
            )}
            <button onClick={() => setSeleccionados(new Set())} className="text-xs text-slate-500 hover:text-morado px-2">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* --- Tabla --- */}
      <div className="card overflow-hidden">
        {cargando ? (
          <Cargando texto="Cargando el censo…" />
        ) : censo.length === 0 ? (
          <Vacio
            icono="👥"
            titulo="El censo está vacío"
            texto="Añade costaleros uno a uno o importa el archivo datos.json del programa antiguo."
          >
            <div className="flex gap-2">
              {puedeEditar && (
                <button onClick={() => setEditando({ ...costaleroVacio() })} className="btn-oro">
                  ➕ Añadir el primero
                </button>
              )}
              {puedeImportar && (
                <button onClick={() => setModalImportar(true)} className="btn-ghost">
                  📥 Importar datos.json
                </button>
              )}
            </div>
          </Vacio>
        ) : visibles.length === 0 ? (
          <Vacio icono="🔍" titulo="Sin resultados" texto="Prueba a cambiar la búsqueda o los filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={todosVisiblesSeleccionados}
                      onChange={alternarTodos}
                      className="w-4 h-4 accent-morado cursor-pointer"
                    />
                  </th>
                  <Th col="nombre" orden={orden} onClick={ordenarPor}>Nombre</Th>
                  <Th col="altura" orden={orden} onClick={ordenarPor} centro>Altura</Th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-slate-600">Hombro</th>
                  <th className="px-3 py-3 text-left font-bold text-xs uppercase tracking-wide text-slate-600">Teléfono</th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-slate-600" title="Miércoles Santo">Mié</th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-slate-600" title="Viernes Santo">Vie</th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-sky-700" title="Solo cruz el Miércoles">✚ Mié</th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-sky-700" title="Solo cruz el Viernes">✚ Vie</th>
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-slate-600">Repite</th>
                  {camposExtra.map((c) => (
                    <th key={c.clave} className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wide text-slate-600">
                      {c.etiqueta}
                    </th>
                  ))}
                  <th className="w-16 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-oro/5 transition ${seleccionados.has(c.id) ? 'bg-oro/10' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(c.id)}
                        onChange={() => alternarSeleccion(c.id)}
                        className="w-4 h-4 accent-morado cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{c.nombre}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {c.altura ? `${c.altura} cm` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      {c.pref_hombro || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                      {c.telefono || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">{c.miercoles_santo ? '✅' : '—'}</td>
                    <td className="px-3 py-2.5 text-center">{c.viernes_santo ? '✅' : '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {c.cruz_miercoles
                        ? <span className="text-sky-600 font-bold">✚</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {c.cruz_viernes
                        ? <span className="text-sky-600 font-bold">✚</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {c.puede_repetir === false
                        ? <span className="chip bg-slate-100 text-slate-500">No</span>
                        : <span className="chip bg-emerald-100 text-emerald-700">Sí</span>}
                    </td>
                    {camposExtra.map((ce) => (
                      <td key={ce.clave} className="px-3 py-2.5 text-center text-slate-600">
                        {formatearExtra(c.campos_extra?.[ce.clave], ce.tipo)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setEditando({ ...c })}
                        className="text-slate-400 hover:text-morado px-1.5 py-1 rounded hover:bg-slate-100 transition"
                        title={puedeEditar ? 'Editar' : 'Ver ficha'}
                      >
                        {puedeEditar ? '✏️' : '👁️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Modales --- */}
      <FichaCostalero
        costalero={editando}
        camposExtra={camposExtra}
        soloLectura={!puedeEditar}
        puedeBorrar={puedeBorrar}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarFicha}
        onBorrar={eliminarFicha}
      />

      <GestorCampos
        abierto={modalCampos}
        campos={camposExtra}
        onCerrar={() => setModalCampos(false)}
        onCambio={(nuevos) => { setCamposExtra(nuevos); recargar() }}
        avisar={avisar}
      />

      <ImportarCenso
        abierto={modalImportar}
        onCerrar={() => setModalImportar(false)}
        onImportado={() => { setModalImportar(false); recargar() }}
        avisar={avisar}
        hayDatos={censo.length > 0}
      />

      <Toast
        mensaje={toast?.mensaje}
        tipo={toast?.tipo}
        onCerrar={() => setToast(null)}
      />
    </Page>
  )
}

// =============================================================
//  SUBCOMPONENTES
// =============================================================

function Th({ col, orden, onClick, children, centro }) {
  const activo = orden.col === col
  return (
    <th
      onClick={() => onClick(col)}
      className={`px-3 py-3 font-bold text-xs uppercase tracking-wide text-slate-600
                  cursor-pointer hover:text-morado select-none ${centro ? 'text-center' : 'text-left'}`}
    >
      {children}
      <span className="ml-1 text-[10px]">{activo ? (orden.desc ? '▼' : '▲') : '↕'}</span>
    </th>
  )
}

function formatearExtra(valor, tipo) {
  if (valor === undefined || valor === null || valor === '') return <span className="text-slate-300">—</span>
  if (tipo === 'si_no') return valor ? '✅' : '—'
  return String(valor)
}

// --- Ficha de alta / edicion ---
function FichaCostalero({ costalero, camposExtra, soloLectura, puedeBorrar, onCerrar, onGuardar, onBorrar }) {
  const [f, setF] = useState(costaleroVacio())
  const [error, setError] = useState('')

  useEffect(() => {
    if (costalero) {
      setF({ ...costaleroVacio(), ...costalero, campos_extra: costalero.campos_extra || {} })
      setError('')
    }
  }, [costalero])

  if (!costalero) return null

  const esNuevo = !costalero.id
  // Día y cruz del mismo día se excluyen entre sí
  const set = (k, v) => setF((x) => ({ ...x, ...aplicarExclusion(x, k, v) }))
  const setExtra = (k, v) => setF((x) => ({ ...x, campos_extra: { ...x.campos_extra, [k]: v } }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('El nombre es obligatorio.')
    const altura = Number(f.altura)
    if (!altura || altura < 80 || altura > 220) {
      return setError('La altura de hombro debe estar entre 80 y 220 cm.')
    }
    onGuardar(normalizarExclusion({ ...f, nombre: f.nombre.trim(), altura }))
  }

  return (
    <Modal
      abierto={!!costalero}
      onCerrar={onCerrar}
      titulo={soloLectura ? 'Ficha del costalero' : esNuevo ? 'Nuevo costalero' : 'Editar costalero'}
    >
      <form onSubmit={enviar} className="space-y-4">
        <fieldset disabled={soloLectura} className="space-y-4 border-0 p-0 m-0 disabled:opacity-90">
        <div>
          <label className="label">Nombre y apellidos *</label>
          <input
            className="input" autoFocus value={f.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Ej: Antonio Ruiz Pérez"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Altura de hombro (cm) *</label>
            <input
              type="number" className="input" value={f.altura || ''}
              onChange={(e) => set('altura', e.target.value)}
              placeholder="145" min={80} max={220}
            />
          </div>
          <div>
            <label className="label">Hombro preferido</label>
            <select
              className="input" value={f.pref_hombro}
              onChange={(e) => set('pref_hombro', e.target.value)}
            >
              {OPCIONES_HOMBRO.map((o) => (
                <option key={o} value={o}>{o || 'Indiferente'}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Teléfono</label>
          <input
            className="input" value={f.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="600 000 000"
          />
        </div>

        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <p className="label mb-2">Participación</p>
          <Check
            label="Sale en Miércoles Santo"
            checked={f.miercoles_santo}
            onChange={(v) => set('miercoles_santo', v)}
          />
          <Check
            label="Sale en Viernes Santo"
            checked={f.viernes_santo}
            onChange={(v) => set('viernes_santo', v)}
          />
          <Check
            label="🔁  Puede repetir turno"
            checked={f.puede_repetir}
            onChange={(v) => set('puede_repetir', v)}
            ayuda="Si lo desmarcas, el generador nunca lo pondrá dos veces."
          />
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-3">
          <p className="label mb-1 text-sky-800">✚ Cruz Guía</p>
          <p className="text-xs text-sky-700/80 mb-2 leading-relaxed">
            Quien va en la cruz de un día <b>no sale en el trono</b> de ese día.
            Al marcar aquí se desmarca sola la casilla del día de arriba, y al revés.
          </p>
          <Check
            label="Va en la Cruz el Miércoles Santo"
            checked={f.cruz_miercoles}
            onChange={(v) => set('cruz_miercoles', v)}
          />
          <Check
            label="Va en la Cruz el Viernes Santo"
            checked={f.cruz_viernes}
            onChange={(v) => set('cruz_viernes', v)}
          />
        </div>

        {camposExtra.length > 0 && (
          <div className="bg-oro/5 border border-oro/20 rounded-lg p-4 space-y-3">
            <p className="label mb-2">Datos adicionales</p>
            {camposExtra.map((c) => (
              <div key={c.clave}>
                {c.tipo === 'si_no' ? (
                  <Check
                    label={c.etiqueta}
                    checked={!!f.campos_extra?.[c.clave]}
                    onChange={(v) => setExtra(c.clave, v)}
                  />
                ) : (
                  <>
                    <label className="label">{c.etiqueta}</label>
                    <input
                      type={c.tipo === 'numero' ? 'number' : 'text'}
                      className="input"
                      value={f.campos_extra?.[c.clave] ?? ''}
                      onChange={(e) =>
                        setExtra(c.clave, c.tipo === 'numero' ? Number(e.target.value) : e.target.value)
                      }
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        </fieldset>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="flex gap-2 pt-2">
          {!esNuevo && puedeBorrar && !soloLectura && (
            <button
              type="button"
              onClick={() => onBorrar(costalero.id, costalero.nombre)}
              className="btn-rojo"
            >
              🗑️ Borrar
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onCerrar} className="btn-ghost">
            {soloLectura ? 'Cerrar' : 'Cancelar'}
          </button>
          {!soloLectura && (
            <button type="submit" className="btn-morado">
              {esNuevo ? 'Añadir al censo' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

function Check({ label, checked, onChange, ayuda }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <input
        type="checkbox" checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-morado mt-0.5 cursor-pointer"
      />
      <span className="min-w-0">
        <span className="text-sm text-slate-700 group-hover:text-morado transition">{label}</span>
        {ayuda && <span className="block text-xs text-slate-400 mt-0.5">{ayuda}</span>}
      </span>
    </label>
  )
}

// --- Gestor de campos personalizados ---
function GestorCampos({ abierto, campos, onCerrar, onCambio, avisar }) {
  const [etiqueta, setEtiqueta] = useState('')
  const [tipo, setTipo] = useState('texto')
  const [error, setError] = useState('')

  const anadir = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const nuevos = await anadirCampoExtra(etiqueta, tipo)
      onCambio(nuevos)
      setEtiqueta('')
      avisar('Campo añadido.')
    } catch (err) {
      setError(err.message)
    }
  }

  const borrar = async (clave, etq) => {
    if (!confirm(`¿Borrar el campo "${etq}"?\n\nLos datos ya guardados en los costaleros no se mostrarán más.`)) return
    await borrarCampoExtra(clave)
    onCambio(campos.filter((c) => c.clave !== clave))
    avisar('Campo eliminado.')
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Campos personalizados del censo">
      <p className="text-sm text-slate-500 mb-5">
        Añade los datos extra que necesites (DNI, año de ingreso, observaciones médicas…).
        Aparecerán en la ficha de todos los costaleros.
      </p>

      <form onSubmit={anadir} className="flex gap-2 mb-5">
        <input
          className="input flex-1" value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          placeholder="Nombre del campo"
        />
        <select className="input w-32" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="texto">Texto</option>
          <option value="numero">Número</option>
          <option value="si_no">Sí / No</option>
        </select>
        <button type="submit" className="btn-oro shrink-0">Añadir</button>
      </form>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {campos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Todavía no hay campos personalizados.
        </p>
      ) : (
        <div className="space-y-2">
          {campos.map((c) => (
            <div
              key={c.clave}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">{c.etiqueta}</p>
                <p className="text-xs text-slate-400 font-mono">{c.clave}</p>
              </div>
              <span className="chip bg-slate-100 text-slate-600">
                {c.tipo === 'si_no' ? 'Sí/No' : c.tipo}
              </span>
              <button
                onClick={() => borrar(c.clave, c.etiqueta)}
                className="text-red-400 hover:text-red-600 px-1"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// --- Importador del datos.json antiguo ---
function ImportarCenso({ abierto, onCerrar, onImportado, avisar, hayDatos }) {
  const inputRef = useRef(null)
  const [previsualizacion, setPrevisualizacion] = useState(null)
  const [sustituir, setSustituir] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const onArchivo = async (e) => {
    setError('')
    setPrevisualizacion(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const texto = await file.text()
      const json = JSON.parse(texto)
      if (!Array.isArray(json)) throw new Error('El archivo debe contener una lista de costaleros.')
      setPrevisualizacion({ nombre: file.name, lista: json })
    } catch (err) {
      setError(err.message || 'El archivo no es un JSON válido.')
    }
  }

  const importar = async () => {
    if (!previsualizacion) return
    setProcesando(true)
    setError('')
    try {
      const r = await importarCensoAntiguo(previsualizacion.lista, { sustituir })
      avisar(`${r.importados} costaleros importados${r.saltados ? ` (${r.saltados} saltados)` : ''}.`)
      setPrevisualizacion(null)
      if (inputRef.current) inputRef.current.value = ''
      onImportado()
    } catch (err) {
      setError(err.message || 'No se ha podido importar.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Importar censo">
      <p className="text-sm text-slate-500 mb-5">
        Sube el archivo <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">datos.json</code> del
        programa antiguo y se cargarán todos los costaleros de golpe.
      </p>

      <input
        ref={inputRef}
        type="file" accept=".json,application/json"
        onChange={onArchivo}
        className="block w-full text-sm text-slate-600 mb-4
                   file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0
                   file:text-sm file:font-semibold file:bg-morado file:text-white
                   hover:file:bg-morado-light file:cursor-pointer cursor-pointer"
      />

      {previsualizacion && (
        <div className="space-y-4">
          <Alerta tipo="info">
            <b>{previsualizacion.nombre}</b>
            <br />
            Se han detectado <b>{previsualizacion.lista.length}</b> costaleros.
          </Alerta>

          <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {previsualizacion.lista.slice(0, 20).map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-medium">{p.nombre}</td>
                    <td className="px-3 py-1.5 text-slate-500 text-right">{p.altura} cm</td>
                    <td className="px-3 py-1.5 text-center w-16">
                      {p.miercoles_santo ? '🕯️' : ''} {p.viernes_santo ? '✝️' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previsualizacion.lista.length > 20 && (
              <p className="text-xs text-slate-400 text-center py-2 border-t border-slate-100">
                … y {previsualizacion.lista.length - 20} más
              </p>
            )}
          </div>

          {hayDatos && (
            <label className="flex items-start gap-2.5 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg p-3">
              <input
                type="checkbox" checked={sustituir}
                onChange={(e) => setSustituir(e.target.checked)}
                className="w-4 h-4 accent-red-600 mt-0.5"
              />
              <span className="text-sm text-amber-900">
                <b>Borrar el censo actual antes de importar</b>
                <span className="block text-xs mt-0.5">
                  Si no lo marcas, los costaleros se añadirán a los que ya existen (puede haber duplicados).
                </span>
              </span>
            </label>
          )}

          {error && <Alerta tipo="error">{error}</Alerta>}

          <div className="flex gap-2 justify-end">
            <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
            <button onClick={importar} disabled={procesando} className="btn-oro">
              {procesando ? 'Importando…' : `Importar ${previsualizacion.lista.length} costaleros`}
            </button>
          </div>
        </div>
      )}

      {error && !previsualizacion && <Alerta tipo="error">{error}</Alerta>}
    </Modal>
  )
}
