// =============================================================
//  CUADRILLEROS, LICENCIAS Y ROLES
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import {
  ROLES, ROLES_ASIGNABLES, datosRol, puedeGestionarA, P,
  LIMITE_CUADRILLEROS_POR_DEFECTO, ROL_POR_DEFECTO,
} from '../lib/roles'
import { Page, PageHeader, Cargando, Vacio, Alerta, Toast, Modal } from '../components/ui'

// Genera un codigo del tipo AGON-2026-K3P9
function generarCodigo() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres confusos
  let sufijo = ''
  for (let i = 0; i < 4; i++) sufijo += abc[Math.floor(Math.random() * abc.length)]
  return `AGON-${new Date().getFullYear()}-${sufijo}`
}

function fechaLegible(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const REF_CONFIG = () => doc(db, COL.CONFIG, 'general')

export default function Licencias() {
  const { perfil, rol, esSupremo, puede } = useAuth()

  const [licencias, setLicencias] = useState([])
  const [cuadrilleros, setCuadrilleros] = useState([])
  const [limite, setLimite] = useState(LIMITE_CUADRILLEROS_POR_DEFECTO)
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [toast, setToast] = useState(null)

  // Modales
  const [modalNueva, setModalNueva] = useState(false)
  const [editandoRol, setEditandoRol] = useState(null)
  const [modalLimite, setModalLimite] = useState(false)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  const recargar = async () => {
    setCargando(true)
    try {
      const [lSnap, cSnap, cfgSnap] = await Promise.all([
        getDocs(collection(db, COL.LICENCIAS)),
        getDocs(collection(db, COL.CUADRILLEROS)),
        getDoc(REF_CONFIG()),
      ])
      setLicencias(lSnap.docs.map((d) => ({ codigo: d.id, ...d.data() })))
      setCuadrilleros(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      if (cfgSnap.exists() && typeof cfgSnap.data().max_cuadrilleros === 'number') {
        setLimite(cfgSnap.data().max_cuadrilleros)
      }
    } catch (e) {
      console.error(e)
      avisar('No se han podido cargar los datos.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { recargar() }, [])

  const libres = useMemo(
    () => licencias.filter((l) => !l.uid && l.activa !== false),
    [licencias]
  )
  const usadas = useMemo(() => licencias.filter((l) => l.uid), [licencias])

  // Plazas ocupadas = cuadrilleros registrados + licencias pendientes de usar
  const ocupadas = usadas.length + libres.length
  const quedan = Math.max(0, limite - ocupadas)
  const sinPlazas = quedan <= 0

  // --- Crear licencia con rol ---
  const crear = async (rolElegido) => {
    if (sinPlazas) {
      avisar(`Has alcanzado el límite de ${limite} cuadrilleros.`, 'error')
      return
    }
    setGenerando(true)
    try {
      let codigo = generarCodigo()
      while (licencias.some((l) => l.codigo === codigo)) codigo = generarCodigo()

      await setDoc(doc(db, COL.LICENCIAS, codigo), {
        activa: true,
        uid: null,
        rol: rolElegido,
        creada_por: perfil?.nombre_completo || perfil?.nombre || 'desconocido',
        creada: serverTimestamp(),
      })
      avisar(`Licencia ${codigo} creada.`)
      setModalNueva(false)
      recargar()
    } catch {
      avisar('No se ha podido crear la licencia.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  const copiar = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo)
      avisar('Código copiado al portapapeles.')
    } catch {
      avisar('No se ha podido copiar.', 'error')
    }
  }

  const alternarActiva = async (lic) => {
    const nuevo = !lic.activa
    const texto = nuevo
      ? `¿Reactivar el acceso de ${lic.nombre_cuadrillero || lic.codigo}?`
      : `¿Desactivar el acceso de ${lic.nombre_cuadrillero || lic.codigo}?\n\nPerderá el acceso inmediatamente.`
    if (!confirm(texto)) return

    try {
      await updateDoc(doc(db, COL.LICENCIAS, lic.codigo), { activa: nuevo })
      if (lic.uid) {
        await updateDoc(doc(db, COL.CUADRILLEROS, lic.uid), { activo: nuevo }).catch(() => {})
      }
      avisar(nuevo ? 'Acceso reactivado.' : 'Acceso desactivado.')
      recargar()
    } catch {
      avisar('No se ha podido cambiar el estado.', 'error')
    }
  }

  const borrar = async (lic) => {
    if (lic.uid) {
      alert('No puedes borrar una licencia que ya está en uso. Desactívala en su lugar.')
      return
    }
    if (!confirm(`¿Borrar la licencia ${lic.codigo}?`)) return
    try {
      await deleteDoc(doc(db, COL.LICENCIAS, lic.codigo))
      avisar('Licencia eliminada.')
      recargar()
    } catch {
      avisar('No se ha podido borrar.', 'error')
    }
  }

  // --- Cambiar rol de un cuadrillero ---
  const guardarRol = async (uid, codigo, nuevoRol) => {
    try {
      await updateDoc(doc(db, COL.CUADRILLEROS, uid), { rol: nuevoRol })
      await updateDoc(doc(db, COL.LICENCIAS, codigo), { rol: nuevoRol }).catch(() => {})
      avisar('Rol actualizado.')
      setEditandoRol(null)
      recargar()
    } catch {
      avisar('No se ha podido cambiar el rol.', 'error')
    }
  }

  // --- Guardar limite ---
  const guardarLimite = async (n) => {
    try {
      await setDoc(REF_CONFIG(), { max_cuadrilleros: n }, { merge: true })
      setLimite(n)
      setModalLimite(false)
      avisar(`Límite fijado en ${n} cuadrilleros.`)
    } catch {
      avisar('No se ha podido guardar el límite.', 'error')
    }
  }

  return (
    <Page>
      <PageHeader
        titulo="Cuadrilleros y Licencias"
        icono="🔑"
        subtitulo={`${usadas.length} registrado(s) · ${libres.length} licencia(s) sin usar · ${quedan} plaza(s) libre(s)`}
      >
        {esSupremo && (
          <button onClick={() => setModalLimite(true)} className="btn-ghost text-xs">
            ⚙️ Límite: {limite}
          </button>
        )}
        {puede(P.LIC_CREAR) && (
          <button
            onClick={() => setModalNueva(true)}
            disabled={sinPlazas}
            className="btn-oro"
            title={sinPlazas ? 'No quedan plazas disponibles' : ''}
          >
            ➕ Generar licencia
          </button>
        )}
      </PageHeader>

      <div className="mb-6 space-y-3">
        {sinPlazas && (
          <Alerta tipo="aviso">
            Has alcanzado el <b>límite de {limite} cuadrilleros</b>. Para dar de alta a
            alguien más, desactiva a un cuadrillero existente
            {esSupremo ? ' o sube el límite desde el botón de arriba.' : ' o pide al administrador supremo que amplíe el límite.'}
          </Alerta>
        )}
        <Alerta tipo="info">
          Cada licencia sirve <b>para un solo cuadrillero</b> y lleva un rol asociado.
          Genera un código, pásaselo, y él lo activará creando su usuario y contraseña.
        </Alerta>
      </div>

      {/* --- Resumen de roles --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {Object.values(ROLES).map((r) => {
          const cuenta = cuadrilleros.filter((c) => (c.rol || ROL_POR_DEFECTO) === r.id).length
          return (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`chip ${r.chip}`}>
                  {r.id === 'superadmin' && '👑 '}{r.nombre}
                </span>
                <span className="font-bold text-lg text-slate-700">{cuenta}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{r.descripcion}</p>
            </div>
          )
        })}
      </div>

      {cargando ? (
        <Cargando texto="Cargando cuadrilleros…" />
      ) : licencias.length === 0 ? (
        <div className="card">
          <Vacio
            icono="🔑"
            titulo="No hay licencias creadas"
            texto="Genera la primera licencia para dar de alta a otro cuadrillero."
          >
            {puede(P.LIC_CREAR) && (
              <button onClick={() => setModalNueva(true)} className="btn-oro">
                ➕ Generar la primera
              </button>
            )}
          </Vacio>
        </div>
      ) : (
        <div className="space-y-6">

          {/* --- Licencias sin usar --- */}
          {libres.length > 0 && (
            <div>
              <h2 className="font-serif text-base font-bold text-slate-700 mb-3">
                Licencias pendientes de activar ({libres.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {libres.map((l) => {
                  const r = datosRol(l.rol || ROL_POR_DEFECTO)
                  return (
                    <div key={l.codigo} className="card p-4 border-dashed border-2 border-oro/40">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-mono font-bold text-lg text-morado tracking-wider">
                          {l.codigo}
                        </p>
                        <span className={`chip shrink-0 ${r.chip}`}>{r.nombre}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Creada el {fechaLegible(l.creada)}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => copiar(l.codigo)} className="btn-ghost text-xs flex-1">
                          📋 Copiar código
                        </button>
                        {puede(P.LIC_GESTIONAR) && (
                          <button onClick={() => borrar(l)} className="btn-ghost text-xs px-2 text-red-500">
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* --- Cuadrilleros registrados --- */}
          <div>
            <h2 className="font-serif text-base font-bold text-slate-700 mb-3">
              Cuadrilleros registrados ({usadas.length})
            </h2>

            {usadas.length === 0 ? (
              <div className="card p-6 text-center text-sm text-slate-400">
                Todavía no hay ningún cuadrillero registrado.
              </div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <Th>Cuadrillero</Th>
                      <Th>Correo</Th>
                      <Th>Rol</Th>
                      <Th>Licencia</Th>
                      <Th>Activada</Th>
                      <Th centro>Estado</Th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usadas.map((l) => {
                      const c = cuadrilleros.find((x) => x.id === l.uid)
                      const rolObj = c?.rol || l.rol || ROL_POR_DEFECTO
                      const r = datosRol(rolObj)
                      const soyYo = l.uid === perfil?.id
                      const gestionable = !soyYo && puedeGestionarA(rol, rolObj)

                      return (
                        <tr key={l.codigo} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {rolObj === 'superadmin' && '👑 '}
                            {c?.nombre && c?.apellidos
                              ? `${c.nombre}, ${c.apellidos}`
                              : l.nombre_cuadrillero || c?.nombre_completo || '—'}
                            {soyYo && <span className="chip bg-oro/20 text-oro-dark ml-2">Tú</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {l.email_cuadrillero || c?.email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`chip ${r.chip}`}>{r.nombre}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.codigo}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {fechaLegible(l.fecha_activacion)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`chip ${
                              l.activa === false
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {l.activa === false ? 'Desactivado' : 'Activo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {gestionable ? (
                              <div className="flex gap-1.5 justify-end">
                                {puede(P.ROLES_ASIGNAR) && (
                                  <button
                                    onClick={() => setEditandoRol({ uid: l.uid, codigo: l.codigo, rol: rolObj, nombre: l.nombre_cuadrillero })}
                                    className="btn-ghost text-xs"
                                  >
                                    Cambiar rol
                                  </button>
                                )}
                                {puede(P.LIC_GESTIONAR) && (
                                  <button onClick={() => alternarActiva(l)} className="btn-ghost text-xs">
                                    {l.activa === false ? 'Reactivar' : 'Desactivar'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">
                                {soyYo ? '—' : '🔒 Protegido'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Modal: nueva licencia --- */}
      <ModalNuevaLicencia
        abierto={modalNueva}
        onCerrar={() => setModalNueva(false)}
        onCrear={crear}
        generando={generando}
        quedan={quedan}
      />

      {/* --- Modal: cambiar rol --- */}
      <ModalCambiarRol
        datos={editandoRol}
        rolActor={rol}
        onCerrar={() => setEditandoRol(null)}
        onGuardar={guardarRol}
      />

      {/* --- Modal: limite --- */}
      <ModalLimite
        abierto={modalLimite}
        limiteActual={limite}
        ocupadas={ocupadas}
        onCerrar={() => setModalLimite(false)}
        onGuardar={guardarLimite}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// =============================================================
//  SUBCOMPONENTES
// =============================================================

function Th({ children, centro }) {
  return (
    <th className={`px-4 py-3 font-bold text-xs uppercase tracking-wide text-slate-600
                    ${centro ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function ModalNuevaLicencia({ abierto, onCerrar, onCrear, generando, quedan }) {
  const [rolElegido, setRolElegido] = useState(ROL_POR_DEFECTO)

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Generar nueva licencia">
      <p className="text-sm text-slate-500 mb-5">
        Elige qué rol tendrá el cuadrillero que active este código.
        Quedan <b>{quedan}</b> plaza(s) disponible(s).
      </p>

      <div className="space-y-2.5 mb-6">
        {ROLES_ASIGNABLES.map((r) => (
          <label
            key={r.id}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
              rolElegido === r.id
                ? 'border-oro bg-oro/5'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio" name="rol" value={r.id}
              checked={rolElegido === r.id}
              onChange={() => setRolElegido(r.id)}
              className="w-4 h-4 accent-morado mt-0.5"
            />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-800">{r.nombre}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.descripcion}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
        <button onClick={() => onCrear(rolElegido)} disabled={generando} className="btn-oro">
          {generando ? 'Generando…' : 'Generar licencia'}
        </button>
      </div>
    </Modal>
  )
}

function ModalCambiarRol({ datos, rolActor, onCerrar, onGuardar }) {
  const [nuevo, setNuevo] = useState(ROL_POR_DEFECTO)

  useEffect(() => {
    if (datos) setNuevo(datos.rol)
  }, [datos])

  if (!datos) return null

  // Solo puedes asignar roles por debajo del tuyo
  const disponibles = ROLES_ASIGNABLES.filter(
    (r) => datosRol(rolActor).nivel > r.nivel || r.id === datos.rol
  )

  return (
    <Modal abierto={!!datos} onCerrar={onCerrar} titulo="Cambiar rol">
      <p className="text-sm text-slate-500 mb-5">
        Rol de <b className="text-slate-800">{datos.nombre}</b>.
        Solo puedes asignar roles por debajo del tuyo.
      </p>

      <div className="space-y-2.5 mb-6">
        {disponibles.map((r) => (
          <label
            key={r.id}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
              nuevo === r.id ? 'border-oro bg-oro/5' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio" name="nuevorol" value={r.id}
              checked={nuevo === r.id}
              onChange={() => setNuevo(r.id)}
              className="w-4 h-4 accent-morado mt-0.5"
            />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-800">{r.nombre}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.descripcion}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
        <button
          onClick={() => onGuardar(datos.uid, datos.codigo, nuevo)}
          disabled={nuevo === datos.rol}
          className="btn-morado"
        >
          Guardar rol
        </button>
      </div>
    </Modal>
  )
}

function ModalLimite({ abierto, limiteActual, ocupadas, onCerrar, onGuardar }) {
  const [valor, setValor] = useState(limiteActual)
  const [error, setError] = useState('')

  useEffect(() => { setValor(limiteActual); setError('') }, [limiteActual, abierto])

  const enviar = (e) => {
    e.preventDefault()
    const n = Number(valor)
    if (!Number.isInteger(n) || n < 1) return setError('Introduce un número entero mayor que 0.')
    if (n < ocupadas) {
      return setError(`Ya hay ${ocupadas} plazas ocupadas. El límite no puede ser menor.`)
    }
    onGuardar(n)
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Límite de cuadrilleros">
      <p className="text-sm text-slate-500 mb-5">
        Número máximo de cuadrilleros que pueden existir a la vez, contando las
        licencias pendientes de activar. Ahora mismo hay <b>{ocupadas}</b> plazas ocupadas.
      </p>

      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="label">Máximo de cuadrilleros</label>
          <input
            type="number" min={1} max={50} className="input w-32"
            value={valor} onChange={(e) => setValor(e.target.value)}
          />
        </div>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-morado">Guardar límite</button>
        </div>
      </form>
    </Modal>
  )
}
