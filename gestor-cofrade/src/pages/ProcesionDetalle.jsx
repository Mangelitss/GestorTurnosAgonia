// =============================================================
//  DETALLE DE UNA PROCESION
//  Pestañas:  Tramos · Turnos · Publicar
// =============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  leerProcesion, guardarProcesion, indexarCenso, esArchivada,
} from '../lib/procesiones'
import { leerCenso } from '../lib/censo'
import { detectarConflictos } from '../lib/conflictos'
import { TIPOS_PROCESION, ESTADOS_PROCESION } from '../lib/constantes'
import { COL } from '../lib/firebase'
import { useEdicionProtegida } from '../lib/useEdicionProtegida'
import { P } from '../lib/roles'
import { useAuth, nombreConComa } from '../context/AuthContext'
import PestanaTramos from '../components/PestanaTramos'
import PestanaTurnos from '../components/PestanaTurnos'
import PestanaPublicar from '../components/PestanaPublicar'
import { LeyendaConflictos } from '../components/PanelConflictos'
import { AvisoBloqueo, EstadoGuardado } from '../components/AvisoBloqueo'
import { Page, Cargando, Modal, Alerta, Toast } from '../components/ui'

const PESTANAS = [
  { id: 'tramos', label: 'Tramos', icono: '🗺️' },
  { id: 'turnos', label: 'Turnos', icono: '👥' },
  { id: 'revision', label: 'Revisión', icono: '🔎' },
]

export default function ProcesionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { puede, perfil } = useAuth()

  const [procesion, setProcesion] = useState(null)
  const [censo, setCenso] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState('tramos')
  const [modalDatos, setModalDatos] = useState(false)
  const [toast, setToast] = useState(null)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  // --- Carga ---
  useEffect(() => {
    let vivo = true
    async function cargar() {
      setCargando(true)
      try {
        const [p, c] = await Promise.all([leerProcesion(id), leerCenso()])
        if (!vivo) return
        if (!p) { avisar('Esa procesión no existe.', 'error'); navigate('/procesiones'); return }
        setProcesion(p)
        setCenso(c)
      } catch (e) {
        console.error(e)
        avisar('No se ha podido cargar la procesión.', 'error')
      } finally {
        if (vivo) setCargando(false)
      }
    }
    cargar()
    return () => { vivo = false }
  }, [id, navigate])

  // --- Edición protegida: bloqueo, guardado automático y aviso al salir ---
  const guardarEnServidor = useCallback(
    (cambios) => guardarProcesion(id, cambios),
    [id]
  )

  const {
    soloLectura, bloqueo, comprobando,
    sinGuardar, guardando, ultimoGuardado,
    cambiar, guardarAhora, forzarEntrada, reintentar,
  } = useEdicionProtegida({
    tipo: 'procesion',
    id,
    coleccion: COL.PROCESIONES,
    usuario: { uid: perfil?.id, nombre: nombreConComa(perfil) },
    puedeEditar: puede(P.PROC_EDITAR),
    datos: procesion,
    setDatos: setProcesion,
    guardarEnServidor,
    activo: !!procesion,
  })

  const guardar = useCallback(async (extra = null, mensaje = 'Cambios guardados.') => {
    if (extra) cambiar(extra)
    const r = await guardarAhora()
    if (r?.ok) avisar(mensaje)
    else if (r && !r.ok) avisar('No se ha podido guardar.', 'error')
  }, [cambiar, guardarAhora])

  // --- Datos derivados ---
  const censoPorId = useMemo(() => indexarCenso(censo), [censo])

  const conflictos = useMemo(
    () => (procesion ? detectarConflictos(procesion, censoPorId) : null),
    [procesion, censoPorId]
  )

  if (cargando) return <Page><Cargando texto="Cargando procesión…" /></Page>
  if (!procesion) return null

  const tipo = TIPOS_PROCESION[procesion.tipo] || TIPOS_PROCESION.extraordinaria
  const estado = ESTADOS_PROCESION[procesion.estado] || ESTADOS_PROCESION.borrador
  const esLetra = tipo.icono.length === 1 && /[A-Z]/.test(tipo.icono)

  return (
    <Page>
      {/* ---------- CABECERA ---------- */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="min-w-0">
          <Link to="/procesiones" className="text-sm text-slate-500 hover:text-morado mb-1 inline-block">
            ← Volver a procesiones
          </Link>
          <h1 className="font-serif text-2xl font-bold text-morado flex items-center gap-3 flex-wrap">
            <span className={esLetra ? 'font-serif' : ''}>{tipo.icono}</span>
            {procesion.nombre}
            <span className={`chip ${estado.chip}`}>{estado.nombre}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {tipo.nombre} · {procesion.anio}
            {!soloLectura && (
              <button
                onClick={() => setModalDatos(true)}
                className="ml-2 text-oro-dark hover:underline text-xs"
              >
                editar datos
              </button>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <EstadoGuardado
            sinGuardar={sinGuardar}
            guardando={guardando}
            ultimoGuardado={ultimoGuardado}
            onGuardar={() => guardar()}
          />
          {conflictos && conflictos.total > 0 && (
            <button
              onClick={() => setPestana('publicar')}
              className={`chip cursor-pointer ${
                conflictos.puedePublicar
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300 animate-pulse-fast'
              }`}
            >
              {conflictos.puedePublicar
                ? `${conflictos.total} aviso(s)`
                : `${conflictos.bloqueantes} conflicto(s)`}
            </button>
          )}
        </div>
      </div>

      {/* ---------- AVISO DE BLOQUEO ---------- */}
      <AvisoBloqueo
        bloqueo={bloqueo}
        onForzar={async () => {
          const r = await forzarEntrada()
          avisar(r.ok ? 'Has tomado el control de la edición.' : 'No se ha podido.', r.ok ? 'exito' : 'error')
        }}
        onReintentar={async () => {
          const r = await reintentar()
          if (r.ok) avisar('Ya puedes editarla.')
        }}
      />

      {/* ---------- AVISO DE ARCHIVADA ---------- */}
      {esArchivada(procesion) && (
        <div className="mb-5">
          <Alerta tipo="aviso">
            Esta procesión es de <b>{procesion.anio}</b> y está en el archivo.
            Puedes consultarla y duplicarla para reutilizar su recorrido y tramos.
            Si la modificas, estarás cambiando un histórico.
          </Alerta>
        </div>
      )}

      {/* ---------- PESTAÑAS ---------- */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id)}
            className={`px-5 py-2.5 rounded-md text-sm font-semibold transition flex items-center gap-2 ${
              pestana === p.id ? 'bg-white text-morado shadow-sm' : 'text-slate-600 hover:text-morado'
            }`}
          >
            <span>{p.icono}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Leyenda visible en la pestaña de turnos */}
      {pestana === 'turnos' && (
        <div className="card p-3 mb-4">
          <LeyendaConflictos compacta />
        </div>
      )}

      {/* ---------- CONTENIDO ---------- */}
      {pestana === 'tramos' && (
        <PestanaTramos
          procesion={procesion}
          soloLectura={soloLectura}
          onCambiar={cambiar}
          avisar={avisar}
        />
      )}

      {pestana === 'turnos' && (
        <PestanaTurnos
          procesion={procesion}
          censo={censo}
          censoPorId={censoPorId}
          conflictos={conflictos}
          soloLectura={soloLectura}
          onCambiar={cambiar}
          avisar={avisar}
        />
      )}

      {pestana === 'revision' && (
        <PestanaPublicar
          procesion={procesion}
          conflictos={conflictos}
          soloLectura={soloLectura}
          onCambiar={cambiar}
          avisar={avisar}
        />
      )}

      <ModalDatos
        abierto={modalDatos}
        procesion={procesion}
        onCerrar={() => setModalDatos(false)}
        onGuardar={(d) => { cambiar(d); setModalDatos(false) }}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// =============================================================
//  MODAL: DATOS GENERALES
// =============================================================

function ModalDatos({ abierto, procesion, onCerrar, onGuardar }) {
  const [f, setF] = useState({})

  useEffect(() => {
    if (abierto && procesion) {
      setF({
        nombre: procesion.nombre || '',
        anio: procesion.anio || new Date().getFullYear(),
        fecha_iso: procesion.fecha_iso || '',
        lleva_cruz: procesion.lleva_cruz !== false,
      })
    }
  }, [abierto, procesion])

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Datos de la procesión">
      <form
        onSubmit={(e) => { e.preventDefault(); onGuardar(f) }}
        className="space-y-4"
      >
        <div>
          <label className="label">Nombre</label>
          <input
            className="input" value={f.nombre || ''}
            onChange={(e) => set('nombre', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Año</label>
            <input
              type="number" className="input" min={2000} max={2100}
              value={f.anio || ''} onChange={(e) => set('anio', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Fecha de salida</label>
            <input
              type="date" className="input"
              value={f.fecha_iso || ''} onChange={(e) => set('fecha_iso', e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer bg-sky-50 border border-sky-200 rounded-lg p-3">
          <input
            type="checkbox" checked={!!f.lleva_cruz}
            onChange={(e) => set('lleva_cruz', e.target.checked)}
            className="w-4 h-4 accent-morado mt-0.5"
          />
          <span className="text-sm text-sky-900">
            <b>Lleva Cruz Guía</b>
            <span className="block text-xs text-sky-700/80 mt-0.5">
              Si lo desmarcas, desaparecen los turnos de cruz de esta procesión.
            </span>
          </span>
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-morado">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
