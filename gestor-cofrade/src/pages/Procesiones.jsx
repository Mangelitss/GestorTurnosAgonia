// =============================================================
//  LISTADO DE PROCESIONES — agrupadas por año
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  leerProcesiones, crearProcesion, borrarProcesion,
  procesionVacia, duplicarEstructura,
  asegurarProcesionesDelAnio, marcarBorrada, separarPorAnio, TIPOS_AUTOMATICOS,
} from '../lib/procesiones'
import { TIPOS_PROCESION, ESTADOS_PROCESION, PRESETS_PROCESION } from '../lib/constantes'
import { ocupantes } from '../lib/cuadrante'
import { P } from '../lib/roles'
import { useAuth } from '../context/AuthContext'
import { Page, PageHeader, Cargando, Vacio, Modal, Alerta, Toast } from '../components/ui'

export default function Procesiones() {
  const { puede } = useAuth()
  const puedeEditar = puede(P.PROC_EDITAR)
  const puedeBorrar = puede(P.PROC_BORRAR)
  const navigate = useNavigate()

  const anioActual = new Date().getFullYear()

  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [duplicando, setDuplicando] = useState(null)
  const [archivoAbierto, setArchivoAbierto] = useState(false)
  const [toast, setToast] = useState(null)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  const recargar = async () => {
    setLista(await leerProcesiones())
  }

  // Carga inicial: crea las de este año si faltan
  useEffect(() => {
    let vivo = true
    async function arrancar() {
      setCargando(true)
      try {
        let datos = await leerProcesiones()

        // Miércoles y Viernes se celebran siempre: se crean solos
        if (puedeEditar) {
          const r = await asegurarProcesionesDelAnio(datos, anioActual)
          if (r.creadas > 0) {
            datos = await leerProcesiones()
            if (vivo) {
              const nombres = r.tipos.map((t) => TIPOS_PROCESION[t].corto).join(' y ')
              avisar(`Creadas automáticamente las procesiones de ${nombres} ${anioActual}.`)
            }
          }
        }

        if (vivo) setLista(datos)
      } catch (e) {
        console.error(e)
        if (vivo) avisar('No se han podido cargar las procesiones.', 'error')
      } finally {
        if (vivo) setCargando(false)
      }
    }
    arrancar()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Separadas: año en curso y archivo histórico
  const { actuales, archivo } = useMemo(
    () => separarPorAnio(lista, anioActual),
    [lista, anioActual]
  )

  const agrupar = (arr) => {
    const m = {}
    arr.forEach((p) => {
      const a = p.anio || 0
      if (!m[a]) m[a] = []
      m[a].push(p)
    })
    return Object.entries(m).sort((x, y) => Number(y[0]) - Number(x[0]))
  }

  const porAnio = useMemo(() => agrupar(actuales), [actuales])
  const archivoPorAnio = useMemo(() => agrupar(archivo), [archivo])

  const crear = async (datos) => {
    try {
      const id = await crearProcesion(datos)
      setModalNueva(false)
      setDuplicando(null)
      navigate(`/procesiones/${id}`)
    } catch (e) {
      console.error(e)
      avisar('No se ha podido crear la procesión.', 'error')
    }
  }

  const eliminar = async (p) => {
    const esAutomatica =
      TIPOS_AUTOMATICOS.includes(p.tipo) && Number(p.anio) === anioActual

    const aviso = esAutomatica
      ? `¿BORRAR "${p.nombre}"?\n\nSe perderán los turnos, los tramos y los textos.\n\n⚠️ Como es una procesión que se crea sola cada año, al borrarla NO volverá a aparecer en ${anioActual}. Tendrás que crearla a mano si te arrepientes.`
      : `¿BORRAR "${p.nombre}"?\n\nSe perderán los turnos, los tramos y los textos.\nEsta acción no se puede deshacer.`

    if (!confirm(aviso)) return

    try {
      await borrarProcesion(p.id)
      // Recordamos que la borró para no recrearla
      if (esAutomatica) await marcarBorrada(p.anio, p.tipo)
      avisar('Procesión eliminada.')
      recargar()
    } catch { avisar('No se ha podido borrar.', 'error') }
  }

  return (
    <Page>
      <PageHeader
        titulo="Procesiones"
        icono="✝️"
        subtitulo={`${lista.length} procesión(es) · ${lista.filter((p) => p.publicado).length} publicada(s)`}
      >
        {puedeEditar && (
          <button onClick={() => setModalNueva(true)} className="btn-oro">
            ➕ Nueva procesión
          </button>
        )}
      </PageHeader>

      {cargando ? (
        <Cargando texto="Cargando procesiones…" />
      ) : lista.length === 0 ? (
        <div className="card">
          <Vacio
            icono="✝️"
            titulo="Todavía no hay ninguna procesión"
            texto="Crea la primera y define sus tramos y turnos."
          >
            {puedeEditar && (
              <button onClick={() => setModalNueva(true)} className="btn-oro">
                ➕ Crear procesión
              </button>
            )}
          </Vacio>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ---- Año en curso y posteriores ---- */}
          {porAnio.map(([anio, procs]) => (
            <section key={anio}>
              <h2 className="font-serif text-lg font-bold text-slate-700 mb-3 flex items-center gap-3">
                {anio}
                {Number(anio) === anioActual && (
                  <span className="chip bg-oro/20 text-oro-dark">Año en curso</span>
                )}
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-normal text-slate-400">
                  {procs.length} procesión(es)
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {procs.map((p) => (
                  <TarjetaProcesion
                    key={p.id}
                    procesion={p}
                    puedeEditar={puedeEditar}
                    puedeBorrar={puedeBorrar}
                    onDuplicar={() => setDuplicando(p)}
                    onBorrar={() => eliminar(p)}
                  />
                ))}
              </div>
            </section>
          ))}

          {porAnio.length === 0 && (
            <div className="card p-8 text-center text-sm text-slate-400">
              No hay procesiones de {anioActual}.
            </div>
          )}

          {/* ---- Archivo de años anteriores ---- */}
          {archivo.length > 0 && (
            <section className="pt-4 border-t border-slate-200">
              <button
                onClick={() => setArchivoAbierto((a) => !a)}
                className="w-full flex items-center gap-3 mb-3 text-left group"
              >
                <span className="font-serif text-lg font-bold text-slate-500 group-hover:text-morado transition">
                  📁 Procesiones anteriores
                </span>
                <span className="chip bg-slate-100 text-slate-600">{archivo.length}</span>
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-slate-400 text-sm">
                  {archivoAbierto ? '▾ Ocultar' : '▸ Ver archivo'}
                </span>
              </button>

              {archivoAbierto && (
                <div className="space-y-6">
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5">
                    ℹ️ Procesiones de años pasados. Puedes consultarlas, duplicarlas
                    para reutilizar su recorrido y tramos, y editarlas si hiciera falta.
                  </p>

                  {archivoPorAnio.map(([anio, procs]) => (
                    <div key={anio}>
                      <h3 className="font-serif text-base font-bold text-slate-500 mb-3 flex items-center gap-3">
                        {anio}
                        <span className="flex-1 h-px bg-slate-100" />
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {procs.map((p) => (
                          <TarjetaProcesion
                            key={p.id}
                            procesion={p}
                            puedeEditar={puedeEditar}
                            puedeBorrar={puedeBorrar}
                            archivada
                            onDuplicar={() => setDuplicando(p)}
                            onBorrar={() => eliminar(p)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <ModalNuevaProcesion
        abierto={modalNueva}
        existentes={lista}
        onCerrar={() => setModalNueva(false)}
        onCrear={crear}
      />

      <ModalDuplicar
        origen={duplicando}
        existentes={lista}
        onCerrar={() => setDuplicando(null)}
        onCrear={crear}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// =============================================================
//  TARJETA
// =============================================================

function TarjetaProcesion({ procesion: p, puedeEditar, puedeBorrar, archivada, onDuplicar, onBorrar }) {
  const tipo = TIPOS_PROCESION[p.tipo] || TIPOS_PROCESION.extraordinaria
  const estado = ESTADOS_PROCESION[p.estado] || ESTADOS_PROCESION.borrador

  const nTrono = p.cuadrante_trono ? ocupantes(p.cuadrante_trono).length : 0
  const nCruz = p.cuadrante_cruz ? ocupantes(p.cuadrante_cruz).length : 0
  const nTramos = p.tramos?.length || 0

  const esLetra = tipo.icono.length === 1 && /[A-Z]/.test(tipo.icono)

  return (
    <div className={`card p-5 hover:shadow-md transition ${archivada ? 'opacity-80 bg-slate-50/50' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                          ${p.tipo === 'viernes' ? 'bg-morado/10 text-morado'
                            : p.tipo === 'miercoles' ? 'bg-oro/20 text-oro-dark'
                            : 'bg-slate-100 text-slate-600'}
                          ${esLetra ? 'font-serif text-xl font-bold' : 'text-xl'}`}>
            {tipo.icono}
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-base font-bold text-morado truncate">
              {p.nombre || tipo.nombre}
            </h3>
            <p className="text-xs text-slate-500">{tipo.nombre}</p>
          </div>
        </div>
        {archivada
          ? <span className="chip shrink-0 bg-slate-100 text-slate-500">Archivada</span>
          : <span className={`chip shrink-0 ${estado.chip}`}>{estado.nombre}</span>}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <span className="chip bg-morado/10 text-morado">
          ✝️ {nTrono} en trono
        </span>
        {p.lleva_cruz && (
          <span className="chip bg-sky-100 text-sky-800">
            ✚ {nCruz} en cruz
          </span>
        )}
        <span className="chip bg-slate-100 text-slate-600">
          {nTramos} tramo{nTramos === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex gap-2">
        <Link to={`/procesiones/${p.id}`} className="btn-morado text-xs flex-1">
          {puedeEditar ? '✏️ Abrir' : '👁️ Ver'}
        </Link>
        {puedeEditar && (
          <button onClick={onDuplicar} className="btn-ghost text-xs px-2" title="Duplicar para otro año">
            📑
          </button>
        )}
        {puedeBorrar && (
          <button onClick={onBorrar} className="btn-ghost text-xs px-2 text-red-500" title="Borrar">
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================
//  MODAL: NUEVA PROCESION
// =============================================================

function ModalNuevaProcesion({ abierto, existentes, onCerrar, onCrear }) {
  const [tipo, setTipo] = useState('miercoles')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [error, setError] = useState('')

  useEffect(() => {
    if (abierto) {
      setTipo('miercoles')
      setAnio(new Date().getFullYear())
      setError('')
    }
  }, [abierto])

  const preset = PRESETS_PROCESION[tipo]
  const yaExiste = existentes.some((p) => p.tipo === tipo && Number(p.anio) === Number(anio))

  const enviar = (e) => {
    e.preventDefault()
    if (!anio || anio < 2000 || anio > 2100) return setError('Escribe un año válido.')
    if (yaExiste && !confirm(`Ya existe una procesión de ${TIPOS_PROCESION[tipo].nombre} en ${anio}.\n\n¿Crear otra igualmente?`)) return
    onCrear(procesionVacia(tipo, anio))
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva procesión" ancho="max-w-xl">
      <form onSubmit={enviar} className="space-y-5">
        <div>
          <label className="label">Tipo de procesión</label>
          <div className="space-y-2.5">
            {Object.values(TIPOS_PROCESION).map((t) => (
              <label
                key={t.id}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                  tipo === t.id ? 'border-oro bg-oro/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio" name="tipo" value={t.id}
                  checked={tipo === t.id}
                  onChange={() => setTipo(t.id)}
                  className="w-4 h-4 accent-morado mt-0.5"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800">{t.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {PRESETS_PROCESION[t.id].turnos_trono} turnos de trono
                    {PRESETS_PROCESION[t.id].lleva_cruz &&
                      ` · ${PRESETS_PROCESION[t.id].turnos_cruz} de cruz`}
                    {' · '}
                    {PRESETS_PROCESION[t.id].tramos_ida} tramos de ida
                    {PRESETS_PROCESION[t.id].tramos_regreso > 0 &&
                      ` + ${PRESETS_PROCESION[t.id].tramos_regreso} de regreso`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Año</label>
          <input
            type="number" className="input w-32" min={2000} max={2100}
            value={anio} onChange={(e) => setAnio(Number(e.target.value))}
          />
        </div>

        {yaExiste && (
          <Alerta tipo="aviso">
            Ya tienes una procesión de <b>{TIPOS_PROCESION[tipo].nombre}</b> en {anio}.
          </Alerta>
        )}

        <Alerta tipo="info">
          Se crearán los tramos y turnos por defecto. Podrás cambiarlo todo después.
        </Alerta>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-oro">Crear y abrir</button>
        </div>
      </form>
    </Modal>
  )
}

// =============================================================
//  MODAL: DUPLICAR
// =============================================================

function ModalDuplicar({ origen, existentes, onCerrar, onCrear }) {
  const [anio, setAnio] = useState(new Date().getFullYear() + 1)

  useEffect(() => {
    if (origen) setAnio(Number(origen.anio) + 1)
  }, [origen])

  if (!origen) return null

  const tipo = TIPOS_PROCESION[origen.tipo] || TIPOS_PROCESION.extraordinaria
  const yaExiste = existentes.some(
    (p) => p.tipo === origen.tipo && Number(p.anio) === Number(anio)
  )

  return (
    <Modal abierto={!!origen} onCerrar={onCerrar} titulo="Duplicar procesión">
      <p className="text-sm text-slate-600 mb-5">
        Se copiarán de <b>{origen.nombre}</b> el recorrido, los tramos con sus
        turnos asignados, los textos y la normativa.
        <br />
        <b className="text-morado">Los costaleros no se copian</b>: los cuadrantes
        se generan de cero.
      </p>

      <div className="mb-5">
        <label className="label">Año de la nueva procesión</label>
        <input
          type="number" className="input w-32" min={2000} max={2100}
          value={anio} onChange={(e) => setAnio(Number(e.target.value))}
        />
      </div>

      {yaExiste && (
        <div className="mb-5">
          <Alerta tipo="aviso">
            Ya existe una procesión de <b>{tipo.nombre}</b> en {anio}.
          </Alerta>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
        <button
          onClick={() => onCrear(duplicarEstructura(origen, anio))}
          className="btn-oro"
        >
          Duplicar para {anio}
        </button>
      </div>
    </Modal>
  )
}
