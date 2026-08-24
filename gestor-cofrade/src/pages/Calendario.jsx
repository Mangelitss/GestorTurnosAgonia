// =============================================================
//  CALENDARIO — rejilla mensual de convocatorias
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MESES, DIAS_SEMANA, rejillaMes, agruparPorFecha, fechaBonita, hoyISO,
  leerEventos, eventoVacio,
  leerOpciones, anadirOpcion, borrarOpcion, esBase, estiloTipo, diaSemana,
} from '../lib/calendario'
import {
  TIPO_ENSAYO, esConvocatoriaDeEnsayo, crearEventoCompleto,
  actualizarEventoSincronizado, borrarEventoCompleto, convertirEnEnsayo,
  cambiarMotivoYBorrarEnsayo, cambiarMotivoYDesvincular,
} from '../lib/sincro'
import { pdfCalendarioMes, pdfCalendarioListado } from '../lib/pdf'
import { P } from '../lib/roles'
import { useAuth } from '../context/AuthContext'
import { Page, PageHeader, Cargando, Modal, Alerta, Toast } from '../components/ui'

export default function Calendario() {
  const { puede } = useAuth()
  const puedeEditar = puede(P.CAL_EDITAR)
  const puedeEnsayos = puede(P.ENSAYOS_EDITAR)
  const navigate = useNavigate()

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  const [eventos, setEventos] = useState([])
  const [opciones, setOpciones] = useState({ tipos: [], lugares: [] })
  const [cargando, setCargando] = useState(true)
  const [toast, setToast] = useState(null)

  const [editando, setEditando] = useState(null)
  const [modalOpciones, setModalOpciones] = useState(false)
  const [diaDetalle, setDiaDetalle] = useState(null)
  const [cambioMotivo, setCambioMotivo] = useState(null)   // { datos, original }

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  const recargar = async () => {
    setCargando(true)
    try {
      const [evs, ops] = await Promise.all([leerEventos(), leerOpciones()])
      setEventos(evs)
      setOpciones(ops)
    } catch (e) {
      console.error(e)
      avisar('No se ha podido cargar el calendario.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { recargar() }, [])

  const celdas = useMemo(() => rejillaMes(anio, mes), [anio, mes])
  const porFecha = useMemo(() => agruparPorFecha(eventos), [eventos])

  const eventosDelMes = useMemo(() => {
    const pre = `${anio}-${String(mes + 1).padStart(2, '0')}`
    return eventos.filter((e) => (e.fecha_iso || '').startsWith(pre))
  }, [eventos, anio, mes])

  const irMes = (delta) => {
    const d = new Date(anio, mes + delta, 1)
    setAnio(d.getFullYear())
    setMes(d.getMonth())
  }

  const irHoy = () => {
    const d = new Date()
    setAnio(d.getFullYear())
    setMes(d.getMonth())
  }

  // --- Guardar evento (con sincronización de ensayos) ---
  const guardar = async (datos) => {
    try {
      // ---- ALTA ----
      if (!datos.id) {
        const { ensayoId } = await crearEventoCompleto(datos)
        setEditando(null)
        if (ensayoId) {
          avisar('Convocatoria y ensayo creados.')
          navigate(`/ensayos/${ensayoId}`)
          return
        }
        avisar('Convocatoria añadida.')
        recargar()
        return
      }

      // ---- EDICIÓN ----
      const original = eventos.find((e) => e.id === datos.id)
      const eraEnsayo = esConvocatoriaDeEnsayo(original)
      const esEnsayo = esConvocatoriaDeEnsayo(datos)

      // Dejaba de ser ensayo y tenía uno asociado -> preguntar
      if (eraEnsayo && !esEnsayo && original?.ensayo_id) {
        setEditando(null)
        setCambioMotivo({ datos, original })
        return
      }

      // Pasa a ser ensayo y no tenía -> crearlo
      if (!eraEnsayo && esEnsayo) {
        const nuevoId = await convertirEnEnsayo(datos.id, datos)
        setEditando(null)
        avisar('Convocatoria actualizada y ensayo creado.')
        navigate(`/ensayos/${nuevoId}`)
        return
      }

      await actualizarEventoSincronizado(datos.id, datos)
      setEditando(null)
      avisar(datos.ensayo_id
        ? 'Convocatoria y ensayo actualizados.'
        : 'Convocatoria actualizada.')
      recargar()
    } catch (e) {
      console.error(e)
      avisar('No se ha podido guardar.', 'error')
    }
  }

  // --- Resolver el cambio de motivo ---
  const resolverCambioMotivo = async (accion) => {
    const { datos, original } = cambioMotivo || {}
    setCambioMotivo(null)
    if (!datos) return

    try {
      if (accion === 'borrar') {
        await cambiarMotivoYBorrarEnsayo(datos.id, datos, original.ensayo_id)
        avisar('Motivo cambiado y ensayo eliminado.')
      } else if (accion === 'desvincular') {
        await cambiarMotivoYDesvincular(datos.id, datos, original.ensayo_id)
        avisar('Motivo cambiado. El ensayo sigue existiendo por su cuenta.')
      }
      recargar()
    } catch (e) {
      console.error(e)
      avisar('No se ha podido guardar.', 'error')
    }
  }

  // --- Borrar (arrastra el ensayo asociado) ---
  const eliminar = async (id, tipo) => {
    const ev = eventos.find((e) => e.id === id)
    const aviso = ev?.ensayo_id
      ? `¿Borrar la convocatoria "${tipo}"?\n\n⚠️ Se borrará TAMBIÉN su ensayo, con toda la lista de asistencia y el cuadrante.\n\nEsta acción no se puede deshacer.`
      : `¿Borrar la convocatoria "${tipo}"?`

    if (!confirm(aviso)) return

    try {
      await borrarEventoCompleto(ev || { id })
      avisar(ev?.ensayo_id ? 'Convocatoria y ensayo eliminados.' : 'Convocatoria eliminada.')
      setEditando(null)
      setDiaDetalle(null)
      recargar()
    } catch (e) {
      console.error(e)
      avisar('No se ha podido borrar.', 'error')
    }
  }

  const abrirNuevo = (fechaISO) => {
    if (!puedeEditar) return
    setEditando({ ...eventoVacio(fechaISO), tipo: opciones.tipos[0] || 'Ensayo', lugar: opciones.lugares[0] || '' })
  }

  return (
    <Page>
      <PageHeader
        titulo="Calendario"
        icono="📅"
        subtitulo={`${eventosDelMes.length} convocatoria(s) en ${MESES[mes]}`}
      >
        {puedeEditar && (
          <button onClick={() => setModalOpciones(true)} className="btn-ghost text-xs">
            ⚙️ Tipos y lugares
          </button>
        )}
        <button
          onClick={() => pdfCalendarioMes(anio, mes, eventosDelMes)}
          className="btn-ghost text-xs"
        >
          📄 PDF del mes
        </button>
        <button
          onClick={() => pdfCalendarioListado(
            [...eventosDelMes].sort((a, b) => a.fecha_iso.localeCompare(b.fecha_iso)),
            `Convocatorias de ${MESES[mes]}`
          )}
          className="btn-ghost text-xs"
        >
          📋 PDF listado
        </button>
        {puedeEditar && (
          <button onClick={() => abrirNuevo(hoyISO())} className="btn-oro">
            ➕ Nueva convocatoria
          </button>
        )}
      </PageHeader>

      {/* --- Navegador de mes --- */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => irMes(-1)} className="btn-ghost px-3" title="Mes anterior">←</button>
          <h2 className="font-serif text-xl font-bold text-morado min-w-[210px] text-center">
            {MESES[mes]} {anio}
          </h2>
          <button onClick={() => irMes(1)} className="btn-ghost px-3" title="Mes siguiente">→</button>
          <button onClick={irHoy} className="btn-ghost text-xs ml-2">Hoy</button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          {opciones.tipos.slice(0, 4).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${estiloTipo(t).punto}`} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* --- Rejilla --- */}
      {cargando ? (
        <Cargando texto="Cargando convocatorias…" />
      ) : (
        <div className="card overflow-hidden">
          {/* Cabecera de dias */}
          <div className="grid grid-cols-7 bg-morado">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2.5 text-center text-xs font-bold text-oro-light uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {celdas.map((c, i) => {
              const evs = porFecha[c.iso] || []
              return (
                <div
                  key={c.iso + i}
                  onClick={() => (evs.length ? setDiaDetalle(c.iso) : abrirNuevo(c.iso))}
                  className={`min-h-[104px] border-b border-r border-slate-200 p-1.5 transition
                              ${c.delMes ? 'bg-white hover:bg-oro/5 cursor-pointer' : 'bg-slate-50/70'}
                              ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                  ${c.esHoy ? 'bg-morado text-white'
                                    : c.delMes ? 'text-slate-700' : 'text-slate-300'}`}
                    >
                      {c.dia}
                    </span>
                    {evs.length > 2 && (
                      <span className="text-[10px] text-slate-400">{evs.length}</span>
                    )}
                  </div>

                  {c.delMes && (
                    <div className="space-y-1">
                      {evs.slice(0, 2).map((e) => {
                        const est = estiloTipo(e.tipo)
                        return (
                          <div
                            key={e.id}
                            className={`text-[10px] leading-tight px-1.5 py-1 rounded border ${est.chip} truncate`}
                            title={`${e.hora} · ${e.tipo} · ${e.lugar}${e.ensayo_id ? ' · con ensayo' : ''}`}
                          >
                            <b>{e.hora}</b> {e.tipo}
                            {e.ensayo_id && <span className="ml-0.5">📋</span>}
                          </div>
                        )
                      })}
                      {evs.length > 2 && (
                        <div className="text-[10px] text-slate-400 px-1.5">
                          +{evs.length - 2} más…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- Modales --- */}
      <DetalleDia
        fechaISO={diaDetalle}
        eventos={diaDetalle ? porFecha[diaDetalle] || [] : []}
        puedeEditar={puedeEditar}
        puedeEnsayos={puedeEnsayos}
        onCerrar={() => setDiaDetalle(null)}
        onEditar={(e) => { setDiaDetalle(null); setEditando({ ...e }) }}
        onNuevo={(iso) => { setDiaDetalle(null); abrirNuevo(iso) }}
      />

      <ModalCambioMotivo
        datos={cambioMotivo}
        onResolver={resolverCambioMotivo}
      />

      <FichaEvento
        evento={editando}
        opciones={opciones}
        soloLectura={!puedeEditar}
        onCerrar={() => setEditando(null)}
        onGuardar={guardar}
        onBorrar={eliminar}
      />

      <GestorOpciones
        abierto={modalOpciones}
        opciones={opciones}
        onCerrar={() => setModalOpciones(false)}
        onCambio={setOpciones}
        avisar={avisar}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// =============================================================
//  DETALLE DE UN DIA
// =============================================================

function DetalleDia({ fechaISO, eventos, puedeEditar, puedeEnsayos, onCerrar, onEditar, onNuevo }) {
  if (!fechaISO) return null

  return (
    <Modal
      abierto={!!fechaISO}
      onCerrar={onCerrar}
      titulo={`${diaSemana(fechaISO)}, ${fechaBonita(fechaISO)}`}
    >
      <div className="space-y-3">
        {eventos.map((e) => {
          const est = estiloTipo(e.tipo)
          return (
            <div key={e.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <span className={`chip ${est.chip} mb-1.5`}>
                    {est.icono} {e.tipo}
                  </span>
                  <p className="font-serif text-lg font-bold text-morado">{e.hora}</p>
                  <p className="text-sm text-slate-600">{e.lugar}</p>
                </div>
              </div>

              {e.indicaciones && (
                <p className="text-sm text-slate-500 bg-slate-50 rounded p-2.5 mb-3 leading-relaxed">
                  {e.indicaciones}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {puedeEditar && (
                  <button onClick={() => onEditar(e)} className="btn-ghost text-xs">
                    ✏️ Editar
                  </button>
                )}
                {puedeEnsayos && e.ensayo_id && (
                  <Link to={`/ensayos/${e.ensayo_id}`} className="btn-oro text-xs">
                    📋 Abrir ensayo
                  </Link>
                )}
              </div>
            </div>
          )
        })}

        {puedeEditar && (
          <button onClick={() => onNuevo(fechaISO)} className="btn-ghost w-full">
            ➕ Añadir otra convocatoria este día
          </button>
        )}
      </div>
    </Modal>
  )
}

// =============================================================
//  FICHA DE EVENTO
// =============================================================

function FichaEvento({ evento, opciones, soloLectura, onCerrar, onGuardar, onBorrar }) {
  const [f, setF] = useState(eventoVacio())
  const [error, setError] = useState('')

  useEffect(() => {
    if (evento) { setF({ ...eventoVacio(), ...evento }); setError('') }
  }, [evento])

  if (!evento) return null

  const esNuevo = !evento.id
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.fecha_iso) return setError('Elige una fecha.')
    if (!f.tipo?.trim()) return setError('Elige un motivo.')
    if (!f.lugar?.trim()) return setError('Elige un lugar.')
    onGuardar(f)
  }

  return (
    <Modal
      abierto={!!evento}
      onCerrar={onCerrar}
      titulo={esNuevo ? 'Nueva convocatoria' : 'Editar convocatoria'}
    >
      <form onSubmit={enviar} className="space-y-4">
        <fieldset disabled={soloLectura} className="space-y-4 border-0 p-0 m-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Día *</label>
              <input
                type="date" className="input"
                value={f.fecha_iso}
                onChange={(e) => set('fecha_iso', e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Se mostrará como «{fechaBonita(f.fecha_iso)}»
              </p>
            </div>
            <div>
              <label className="label">Hora *</label>
              <input
                type="time" className="input"
                value={f.hora}
                onChange={(e) => set('hora', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Motivo *</label>
            <select className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {opciones.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            {f.tipo === TIPO_ENSAYO && !evento.ensayo_id && (
              <p className="text-xs text-oro-dark mt-1.5 flex items-start gap-1">
                <span>📋</span>
                <span>Al guardar se creará también el ensayo y se abrirá para pasar lista.</span>
              </p>
            )}
            {evento.ensayo_id && f.tipo === TIPO_ENSAYO && (
              <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1">
                <span>🔗</span>
                <span>Esta convocatoria está unida a un ensayo. Los cambios se aplicarán a los dos.</span>
              </p>
            )}
            {evento.ensayo_id && f.tipo !== TIPO_ENSAYO && (
              <p className="text-xs text-amber-700 mt-1.5 flex items-start gap-1">
                <span>⚠️</span>
                <span>Estás quitándole el motivo «Ensayo». Al guardar te preguntaré qué hacer con el ensayo asociado.</span>
              </p>
            )}
          </div>

          <div>
            <label className="label">Lugar *</label>
            <select className="input" value={f.lugar} onChange={(e) => set('lugar', e.target.value)}>
              {opciones.lugares.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Indicaciones</label>
            <textarea
              className="input min-h-[90px] resize-y"
              value={f.indicaciones}
              onChange={(e) => set('indicaciones', e.target.value)}
              placeholder="Ej: Venir con calzado oscuro y ropa cómoda…"
            />
          </div>
        </fieldset>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="flex gap-2 pt-2">
          {!esNuevo && !soloLectura && (
            <button
              type="button"
              onClick={() => onBorrar(evento.id, evento.tipo)}
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
              {esNuevo ? 'Añadir al calendario' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

// =============================================================
//  MODAL: CAMBIO DE MOTIVO CON ENSAYO ASOCIADO
// =============================================================

function ModalCambioMotivo({ datos, onResolver }) {
  if (!datos) return null

  const { datos: nuevo, original } = datos

  return (
    <Modal
      abierto={!!datos}
      onCerrar={() => onResolver('cancelar')}
      titulo="Esta convocatoria tiene un ensayo"
    >
      <p className="text-sm text-slate-600 mb-5">
        Estás cambiando el motivo de <b>«Ensayo»</b> a <b>«{nuevo.tipo}»</b>,
        pero esta convocatoria tiene un ensayo asociado con su lista de
        asistencia y su cuadrante. ¿Qué quieres hacer con él?
      </p>

      <div className="space-y-2.5">
        <button
          onClick={() => onResolver('desvincular')}
          className="w-full text-left p-4 rounded-lg border-2 border-slate-200
                     hover:border-oro hover:bg-oro/5 transition"
        >
          <p className="font-semibold text-sm text-slate-800">
            🔗 Conservar el ensayo, pero desvincularlo
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            El ensayo sigue existiendo con todos sus datos, pero deja de estar
            unido a esta cita. Lo encontrarás en el listado de Ensayos.
          </p>
        </button>

        <button
          onClick={() => onResolver('borrar')}
          className="w-full text-left p-4 rounded-lg border-2 border-red-200
                     hover:border-red-400 hover:bg-red-50 transition"
        >
          <p className="font-semibold text-sm text-red-700">
            🗑️ Borrar el ensayo
          </p>
          <p className="text-xs text-red-600/80 mt-0.5">
            Se elimina el ensayo con toda su lista de asistencia y su cuadrante.
            Esta acción no se puede deshacer.
          </p>
        </button>

        <button
          onClick={() => onResolver('cancelar')}
          className="w-full text-left p-4 rounded-lg border-2 border-slate-200
                     hover:border-slate-300 transition"
        >
          <p className="font-semibold text-sm text-slate-800">
            ↩️ Cancelar el cambio
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            La convocatoria se queda como estaba, con su motivo «Ensayo».
          </p>
        </button>
      </div>
    </Modal>
  )
}

// =============================================================
//  GESTOR DE TIPOS Y LUGARES
// =============================================================

function GestorOpciones({ abierto, opciones, onCerrar, onCambio, avisar }) {
  const [pestana, setPestana] = useState('tipos')
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')

  const lista = opciones[pestana] || []
  const etiqueta = pestana === 'tipos' ? 'motivo' : 'lugar'

  const anadir = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const nuevos = await anadirOpcion(pestana, valor)
      onCambio({ ...opciones, [pestana]: nuevos })
      setValor('')
      avisar(`Nuevo ${etiqueta} añadido.`)
    } catch (err) {
      setError(err.message)
    }
  }

  const borrar = async (v) => {
    if (!confirm(`¿Borrar "${v}" de la lista?\n\nLas convocatorias que ya lo usen no se modifican.`)) return
    try {
      const nuevos = await borrarOpcion(pestana, v)
      onCambio({ ...opciones, [pestana]: nuevos })
      avisar('Eliminado de la lista.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Motivos y lugares">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
        {[
          { id: 'tipos', label: 'Motivos' },
          { id: 'lugares', label: 'Lugares' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => { setPestana(p.id); setError(''); setValor('') }}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition ${
              pestana === p.id ? 'bg-white text-morado shadow-sm' : 'text-slate-600 hover:text-morado'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={anadir} className="flex gap-2 mb-5">
        <input
          className="input flex-1"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={`Nuevo ${etiqueta}…`}
        />
        <button type="submit" className="btn-oro shrink-0">Añadir</button>
      </form>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      <div className="space-y-2">
        {lista.map((v) => {
          const base = esBase(pestana, v)
          return (
            <div key={v} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
              <span className="flex-1 text-sm font-medium text-slate-800">
                {pestana === 'tipos' && `${estiloTipo(v).icono} `}{v}
              </span>
              {base ? (
                <span className="chip bg-slate-100 text-slate-500">Base</span>
              ) : (
                <button onClick={() => borrar(v)} className="text-red-400 hover:text-red-600 px-1">
                  🗑️
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
