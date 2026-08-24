// =============================================================
//  LISTADO DE ENSAYOS
//  Abiertos arriba, archivados abajo.
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  leerEnsayos, archivarEnsayo, reabrirEnsayo, ESTADOS,
} from '../lib/ensayos'
import { crearEnsayoCompleto, borrarEnsayoCompleto } from '../lib/sincro'
import { fechaBonita, diaSemana, hoyISO, leerOpciones } from '../lib/calendario'
import { resumen } from '../lib/cuadrante'
import { P } from '../lib/roles'
import { useAuth } from '../context/AuthContext'
import { Page, PageHeader, Cargando, Vacio, Modal, Alerta, Toast } from '../components/ui'

export default function Ensayos() {
  const { puede } = useAuth()
  const puedeEditar = puede(P.ENSAYOS_EDITAR)
  const navigate = useNavigate()

  const [ensayos, setEnsayos] = useState([])
  const [lugares, setLugares] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [toast, setToast] = useState(null)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  const recargar = async () => {
    setCargando(true)
    try {
      const [lista, ops] = await Promise.all([leerEnsayos(), leerOpciones()])
      setEnsayos(lista)
      setLugares(ops.lugares)
    } catch (e) {
      console.error(e)
      avisar('No se han podido cargar los ensayos.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { recargar() }, [])

  const abiertos = useMemo(() => ensayos.filter((e) => e.estado !== 'archivado'), [ensayos])
  const archivados = useMemo(() => ensayos.filter((e) => e.estado === 'archivado'), [ensayos])

  const crear = async (datos) => {
    try {
      const { ensayoId } = await crearEnsayoCompleto(datos)
      setModalNuevo(false)
      navigate(`/ensayos/${ensayoId}`)
    } catch (e) {
      console.error(e)
      avisar('No se ha podido crear el ensayo.', 'error')
    }
  }

  const archivar = async (e) => {
    if (!confirm(`¿Archivar el ensayo del ${fechaBonita(e.fecha_iso)}?\n\nQuedará guardado y podrás reabrirlo cuando quieras.`)) return
    try {
      await archivarEnsayo(e.id)
      avisar('Ensayo archivado.')
      recargar()
    } catch { avisar('No se ha podido archivar.', 'error') }
  }

  const reabrir = async (e) => {
    if (!confirm(`¿Reabrir el ensayo del ${fechaBonita(e.fecha_iso)}?`)) return
    try {
      await reabrirEnsayo(e.id)
      avisar('Ensayo reabierto.')
      recargar()
    } catch { avisar('No se ha podido reabrir.', 'error') }
  }

  const eliminar = async (e) => {
    const aviso = e.evento_id
      ? `¿BORRAR definitivamente el ensayo del ${fechaBonita(e.fecha_iso)}?\n\n⚠️ Se borrará TAMBIÉN su convocatoria del calendario.\n\nEsta acción no se puede deshacer.`
      : `¿BORRAR definitivamente el ensayo del ${fechaBonita(e.fecha_iso)}?\n\nEsta acción no se puede deshacer.`

    if (!confirm(aviso)) return
    try {
      await borrarEnsayoCompleto(e)
      avisar(e.evento_id ? 'Ensayo y convocatoria eliminados.' : 'Ensayo eliminado.')
      recargar()
    } catch { avisar('No se ha podido borrar.', 'error') }
  }

  return (
    <Page>
      <PageHeader
        titulo="Ensayos"
        icono="📋"
        subtitulo={`${abiertos.length} abierto(s) · ${archivados.length} archivado(s)`}
      >
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)} className="btn-oro">
            ➕ Nuevo ensayo
          </button>
        )}
      </PageHeader>

      {cargando ? (
        <Cargando texto="Cargando ensayos…" />
      ) : ensayos.length === 0 ? (
        <div className="card">
          <Vacio
            icono="📋"
            titulo="Todavía no hay ensayos"
            texto="Crea el primer ensayo o genéralo desde una convocatoria del calendario."
          >
            <div className="flex gap-2">
              {puedeEditar && (
                <button onClick={() => setModalNuevo(true)} className="btn-oro">
                  ➕ Crear ensayo
                </button>
              )}
              <Link to="/calendario" className="btn-ghost">📅 Ir al calendario</Link>
            </div>
          </Vacio>
        </div>
      ) : (
        <div className="space-y-8">

          {/* --- ABIERTOS --- */}
          <section>
            <h2 className="font-serif text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ensayos abiertos ({abiertos.length})
            </h2>

            {abiertos.length === 0 ? (
              <div className="card p-6 text-center text-sm text-slate-400">
                No hay ningún ensayo abierto ahora mismo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {abiertos.map((e) => (
                  <TarjetaEnsayo
                    key={e.id} ensayo={e} puedeEditar={puedeEditar}
                    onArchivar={archivar} onBorrar={eliminar}
                  />
                ))}
              </div>
            )}
          </section>

          {/* --- ARCHIVADOS --- */}
          {archivados.length > 0 && (
            <section>
              <h2 className="font-serif text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Ensayos archivados ({archivados.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {archivados.map((e) => (
                  <TarjetaEnsayo
                    key={e.id} ensayo={e} puedeEditar={puedeEditar}
                    onReabrir={reabrir} onBorrar={eliminar}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ModalNuevoEnsayo
        abierto={modalNuevo}
        lugares={lugares}
        onCerrar={() => setModalNuevo(false)}
        onCrear={crear}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// =============================================================
//  TARJETA DE ENSAYO
// =============================================================

function TarjetaEnsayo({ ensayo, puedeEditar, onArchivar, onReabrir, onBorrar }) {
  const archivado = ensayo.estado === 'archivado'
  const est = ESTADOS[ensayo.estado] || ESTADOS.abierto
  const r = ensayo.cuadrante ? resumen(ensayo.cuadrante) : null
  const numAsistentes = ensayo.asistentes?.length || 0

  return (
    <div className={`card p-5 transition hover:shadow-md ${archivado ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            {diaSemana(ensayo.fecha_iso)}
          </p>
          <h3 className="font-serif text-lg font-bold text-morado">
            {fechaBonita(ensayo.fecha_iso)}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {ensayo.hora} · {ensayo.lugar}
          </p>
          {ensayo.evento_id && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              🔗 Unido al calendario
            </p>
          )}
        </div>
        <span className={`chip shrink-0 ${est.chip}`}>{est.nombre}</span>
      </div>

      {/* Datos rápidos */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="chip bg-morado/10 text-morado">
          👥 {numAsistentes} asistente{numAsistentes === 1 ? '' : 's'}
        </span>
        {r ? (
          <>
            <span className="chip bg-oro/20 text-oro-dark">
              {r.turnos} turno{r.turnos === 1 ? '' : 's'}
            </span>
            {r.libres > 0 && (
              <span className="chip bg-amber-100 text-amber-800">
                {r.libres} hueco{r.libres === 1 ? '' : 's'}
              </span>
            )}
          </>
        ) : (
          <span className="chip bg-slate-100 text-slate-500">Sin cuadrante</span>
        )}
      </div>

      {ensayo.notas && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded p-2.5 mb-4 line-clamp-2">
          {ensayo.notas}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <Link to={`/ensayos/${ensayo.id}`} className="btn-morado text-xs flex-1">
          {archivado ? '👁️ Ver' : '✏️ Abrir'}
        </Link>

        {puedeEditar && !archivado && onArchivar && (
          <button onClick={() => onArchivar(ensayo)} className="btn-ghost text-xs" title="Archivar">
            📦
          </button>
        )}
        {puedeEditar && archivado && onReabrir && (
          <button onClick={() => onReabrir(ensayo)} className="btn-ghost text-xs" title="Reabrir">
            🔓
          </button>
        )}
        {puedeEditar && (
          <button
            onClick={() => onBorrar(ensayo)}
            className="btn-ghost text-xs px-2 text-red-500"
            title="Borrar"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================
//  MODAL DE CREACION
// =============================================================

function ModalNuevoEnsayo({ abierto, lugares, onCerrar, onCrear }) {
  const [f, setF] = useState({
    fecha_iso: hoyISO(), hora: '20:00', lugar: '', notas: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (abierto) {
      setF({ fecha_iso: hoyISO(), hora: '20:00', lugar: lugares[0] || '', notas: '' })
      setError('')
    }
  }, [abierto, lugares])

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.fecha_iso) return setError('Elige una fecha.')
    if (!f.lugar?.trim()) return setError('Elige un lugar.')
    onCrear(f)
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo ensayo">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Día *</label>
            <input
              type="date" className="input"
              value={f.fecha_iso} onChange={(e) => set('fecha_iso', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hora</label>
            <input
              type="time" className="input"
              value={f.hora} onChange={(e) => set('hora', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Lugar *</label>
          <select className="input" value={f.lugar} onChange={(e) => set('lugar', e.target.value)}>
            {lugares.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={f.notas} onChange={(e) => set('notas', e.target.value)}
            placeholder="Indicaciones para este ensayo…"
          />
        </div>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <Alerta tipo="info">
          Se creará también la <b>convocatoria en el calendario</b>, y se abrirá
          el ensayo para que vayas apuntando la asistencia.
        </Alerta>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-oro">Crear y abrir</button>
        </div>
      </form>
    </Modal>
  )
}
