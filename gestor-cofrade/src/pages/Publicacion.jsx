// =============================================================
//  MODULO DE PUBLICACION — WEB DE COSTALEROS
//
//  Desde aqui el cuadrillero decide:
//    - si la web se ve o no (interruptor general)
//    - con que codigo se entra
//    - que procesiones y ensayos salen, y su informacion
//
//  La web no lee nunca /procesiones ni /ensayos: lee una copia
//  limpia que se regenera con cada cambio (ver lib/publicacion.js).
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  leerConfigPortal, regenerarPortal, mostrarWeb, ocultarWeb, cambiarCodigo,
  marcarProcesion, marcarEnsayo, guardarInfoWeb, guardarUrlWeb, tieneCambiosSinSubir,
  TIPOS_UNICOS,
} from '../lib/publicacion'
import {
  infoWeb, problemaCodigo, normalizarCodigo, CODIGO_MINIMO, CODIGO_MAXIMO,
} from '../lib/portal'
import { leerProcesiones, indexarCenso, tramosSinTurno, esArchivada } from '../lib/procesiones'
import { leerEnsayos } from '../lib/ensayos'
import { leerCenso } from '../lib/censo'
import { detectarConflictos } from '../lib/conflictos'
import { fechaBonitaConAnio } from '../lib/calendario'
import { TIPOS_PROCESION } from '../lib/constantes'
import { COL } from '../lib/firebase'
import { P } from '../lib/roles'
import { useAuth, nombreConComa } from '../context/AuthContext'
import { Page, PageHeader, Cargando, Modal, Alerta, Toast } from '../components/ui'

import { Icono } from '../components/Iconos'
export default function Publicacion() {
  const { puede, perfil } = useAuth()
  const puedePublicar = puede(P.PROC_PUBLICAR)
  const usuario = nombreConComa(perfil) || null

  const [cfg, setCfg] = useState(null)
  const [procesiones, setProcesiones] = useState([])
  const [ensayos, setEnsayos] = useState([])
  const [censo, setCenso] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [toast, setToast] = useState(null)

  const [modalCodigo, setModalCodigo] = useState(false)
  const [editandoInfo, setEditandoInfo] = useState(null)   // { clase, item }
  const [verArchivo, setVerArchivo] = useState(false)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  async function recargar() {
    const [c, p, e, cen] = await Promise.all([
      leerConfigPortal(), leerProcesiones(), leerEnsayos(), leerCenso(),
    ])
    setCfg(c)
    setProcesiones(p)
    setEnsayos(e)
    setCenso(cen)
  }

  useEffect(() => {
    let vivo = true
    recargar()
      .catch((e) => { console.error(e); if (vivo) avisar('No se ha podido cargar.', 'error') })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  // Ejecuta una accion, regenera si toca y recarga
  async function hacer(accion, mensaje) {
    setOcupado(true)
    try {
      await accion()
      await recargar()
      if (mensaje) avisar(mensaje)
    } catch (e) {
      console.error(e)
      avisar(e?.message || 'No se ha podido completar.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  // --- Estado de cada procesion ---
  const censoPorId = useMemo(() => indexarCenso(censo), [censo])

  const filasProc = useMemo(() => procesiones.map((p) => {
    const conf = detectarConflictos(p, censoPorId)
    const problemas = []
    if (!p.cuadrante_trono) problemas.push('Faltan los turnos del trono')
    if (p.lleva_cruz && !p.cuadrante_cruz) problemas.push('Faltan los turnos de la cruz')
    if (!(p.tramos || []).length) problemas.push('No tiene tramos')
    else if (tramosSinTurno(p.tramos, p.cuadrante_trono?.length || 0).length) {
      problemas.push('Hay tramos sin turno de trono')
    }
    if (!conf.puedePublicar) problemas.push(`${conf.bloqueantes} conflicto(s) rojo(s)`)
    return { item: p, problemas, pendiente: tieneCambiosSinSubir(p, cfg?.generado_en) }
  }), [procesiones, censoPorId, cfg])

  const filasEns = useMemo(() => ensayos.map((e) => {
    const problemas = []
    if (!e.cuadrante) problemas.push('El cuadrante no está generado')
    return { item: e, problemas, pendiente: tieneCambiosSinSubir(e, cfg?.generado_en) }
  }), [ensayos, cfg])

  const anio = new Date().getFullYear()
  const procActuales = filasProc.filter((f) => !esArchivada(f.item, anio) || f.item.publicado)
  const procArchivo = filasProc.filter((f) => esArchivada(f.item, anio) && !f.item.publicado)
  const ensVisibles = filasEns.filter((f) => f.item.estado !== 'archivado' || f.item.publicado)

  const publicadas = [...filasProc, ...filasEns].filter((f) => f.item.publicado)
  const hayPendientes = publicadas.some((f) => f.pendiente)

  if (cargando) return <Page><Cargando texto="Cargando la web de costaleros…" /></Page>

  return (
    <Page>
      <PageHeader
        titulo="Web de costaleros"
        subtitulo="Lo que ven los costaleros con el código de acceso. Sin cuenta ni contraseña."
      >
        <a href={cfg?.url_web} target="_blank" rel="noopener noreferrer" className="btn-oro">
          <Icono e="↗" /> Abrir la web
        </a>
      </PageHeader>

      <TarjetaEnlace
        cfg={cfg}
        puedePublicar={puedePublicar}
        avisar={avisar}
        onGuardar={(url) => hacer(() => guardarUrlWeb(url, usuario), 'Enlace guardado.')}
      />

      <div className="grid gap-5 lg:grid-cols-2 mb-6">
        <TarjetaEstado
          cfg={cfg}
          publicadas={publicadas.length}
          hayPendientes={hayPendientes}
          puedePublicar={puedePublicar}
          ocupado={ocupado}
          onMostrar={() => hacer(() => mostrarWeb(usuario), 'La web ya está visible.')}
          onOcultar={() => {
            if (!confirm('¿Ocultar la web?\n\nNadie podrá ver nada, aunque tenga el código, hasta que la vuelvas a mostrar.')) return
            hacer(() => ocultarWeb(usuario), 'Web oculta.')
          }}
          onSubir={() => hacer(() => regenerarPortal(usuario), 'Web actualizada con los últimos cambios.')}
        />

        <TarjetaCodigo
          cfg={cfg}
          puedePublicar={puedePublicar}
          onCambiar={() => setModalCodigo(true)}
          avisar={avisar}
        />
      </div>

      {/* ---- Procesiones ---- */}
      <Seccion
        titulo="Procesiones"
        ayuda="Solo puede haber publicada una de Miércoles y una de Viernes. Las extraordinarias, las que quieras."
      >
        {procActuales.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No hay procesiones este año.</p>
        ) : procActuales.map((f) => (
          <FilaPublicable
            key={f.item.id}
            fila={f}
            titulo={f.item.nombre}
            subtitulo={[
              TIPOS_PROCESION[f.item.tipo]?.nombre,
              f.item.fecha_iso ? fechaBonitaConAnio(f.item.fecha_iso) : 'sin fecha',
            ].filter(Boolean).join(' · ')}
            enlace={`/procesiones/${f.item.id}`}
            reemplaza={reemplazada(f.item, procesiones)}
            puedePublicar={puedePublicar}
            ocupado={ocupado}
            onInfo={() => setEditandoInfo({ clase: 'procesion', item: f.item })}
            onMarcar={(si) => hacer(async () => {
              await marcarProcesion(f.item, si, procesiones)
              await regenerarPortal(usuario)
            }, si ? 'Procesión publicada.' : 'Procesión retirada de la web.')}
          />
        ))}

        {procArchivo.length > 0 && (
          <div className="px-5 py-3 bg-slate-50">
            <button
              onClick={() => setVerArchivo(!verArchivo)}
              className="text-xs font-semibold text-slate-500 hover:text-morado"
            >
              {verArchivo ? '▾' : '▸'} Años anteriores ({procArchivo.length})
            </button>
          </div>
        )}
        {verArchivo && procArchivo.map((f) => (
          <FilaPublicable
            key={f.item.id}
            fila={f}
            titulo={f.item.nombre}
            subtitulo={TIPOS_PROCESION[f.item.tipo]?.nombre}
            enlace={`/procesiones/${f.item.id}`}
            reemplaza={reemplazada(f.item, procesiones)}
            puedePublicar={puedePublicar}
            ocupado={ocupado}
            onInfo={() => setEditandoInfo({ clase: 'procesion', item: f.item })}
            onMarcar={(si) => hacer(async () => {
              await marcarProcesion(f.item, si, procesiones)
              await regenerarPortal(usuario)
            }, si ? 'Procesión publicada.' : 'Procesión retirada de la web.')}
          />
        ))}
      </Seccion>

      {/* ---- Ensayos ---- */}
      <Seccion
        titulo="Ensayos"
        ayuda="La hora, el lugar y las indicaciones se cogen del propio ensayo."
      >
        {ensVisibles.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No hay ensayos abiertos.</p>
        ) : ensVisibles.map((f) => (
          <FilaPublicable
            key={f.item.id}
            fila={f}
            titulo={`Ensayo · ${fechaBonitaConAnio(f.item.fecha_iso)}`}
            subtitulo={[f.item.hora, f.item.lugar].filter(Boolean).join(' · ')}
            enlace={`/ensayos/${f.item.id}`}
            puedePublicar={puedePublicar}
            ocupado={ocupado}
            onInfo={() => setEditandoInfo({ clase: 'ensayo', item: f.item })}
            onMarcar={(si) => hacer(async () => {
              await marcarEnsayo(f.item, si)
              await regenerarPortal(usuario)
            }, si ? 'Ensayo publicado.' : 'Ensayo retirado de la web.')}
          />
        ))}
      </Seccion>

      <ModalCodigo
        abierto={modalCodigo}
        cfg={cfg}
        onCerrar={() => setModalCodigo(false)}
        onGuardar={(codigo) => hacer(async () => {
          await cambiarCodigo(codigo, usuario)
          setModalCodigo(false)
        }, 'Código cambiado. El anterior ya no funciona.')}
      />

      <ModalInfo
        datos={editandoInfo}
        soloLectura={!puedePublicar}
        onCerrar={() => setEditandoInfo(null)}
        onGuardar={(info) => {
          const { clase, item } = editandoInfo
          hacer(async () => {
            await guardarInfoWeb(clase === 'ensayo' ? COL.ENSAYOS : COL.PROCESIONES, item.id, info)
            if (item.publicado) await regenerarPortal(usuario)
            setEditandoInfo(null)
          }, item.publicado ? 'Información guardada y subida a la web.' : 'Información guardada.')
        }}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// Si publico esta, ¿cual se retira? (solo Miercoles y Viernes)
function reemplazada(p, todas) {
  if (p.publicado || !TIPOS_UNICOS.includes(p.tipo)) return null
  return todas.find((x) => x.id !== p.id && x.tipo === p.tipo && x.publicado) || null
}

// =============================================================
//  TARJETA: ESTADO DE LA WEB
// =============================================================
function TarjetaEstado({ cfg, publicadas, hayPendientes, puedePublicar, ocupado, onMostrar, onOcultar, onSubir }) {
  const visible = cfg?.visible
  const generado = cfg?.generado_en?.toDate?.()

  return (
    <div className={`card p-5 ${visible ? 'border-emerald-300' : ''}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label">Estado de la web</p>
          <p className={`font-display text-xl font-semibold flex items-center gap-2 ${visible ? 'text-emerald-700' : 'text-slate-500'}`}>
            <span className={`w-3 h-3 rounded-full ${visible ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {visible ? 'Visible' : 'Oculta'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {visible
              ? `${publicadas} publicación(es) a la vista con el código.`
              : 'Nadie puede ver nada, aunque tenga el código.'}
          </p>
          {visible && generado && (
            <p className="text-xs text-slate-400 mt-1">
              Última actualización: {generado.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
              {cfg.actualizado_por && ` · ${cfg.actualizado_por}`}
            </p>
          )}
        </div>

        {puedePublicar && (
          visible ? (
            <button onClick={onOcultar} disabled={ocupado} className="btn-ghost">
              <Icono e="🙈" /> Ocultar web
            </button>
          ) : (
            <button onClick={onMostrar} disabled={ocupado || !cfg?.clave} className="btn-oro">
              <Icono e="👁️" /> Mostrar web
            </button>
          )
        )}
      </div>

      {!cfg?.clave && (
        <div className="mt-4">
          <Alerta tipo="aviso">Antes de mostrar la web pon un código de acceso.</Alerta>
        </div>
      )}

      {visible && hayPendientes && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap
                        rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Has cambiado algo publicado y la web todavía no lo muestra.
          </p>
          {puedePublicar && (
            <button onClick={onSubir} disabled={ocupado} className="btn-morado text-xs py-2">
              <Icono e="⬆️" /> Subir cambios
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================
//  FRANJA: ENLACE DE LA WEB
//  Para abrirla, o copiarla y mandarla al grupo del tercio.
// =============================================================
function TarjetaEnlace({ cfg, puedePublicar, avisar, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [url, setUrl] = useState('')
  const actual = cfg?.url_web || ''

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(actual)
      avisar('Enlace copiado.')
    } catch {
      avisar('No se ha podido copiar.', 'error')
    }
  }

  return (
    <div className="card px-5 py-3.5 mb-5 flex items-center gap-3 flex-wrap">
      <span className="label mb-0 shrink-0">Enlace</span>

      {editando ? (
        <form
          className="flex-1 flex items-center gap-2 min-w-[260px]"
          onSubmit={(e) => { e.preventDefault(); onGuardar(url); setEditando(false) }}
        >
          <input
            className="input py-1.5"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
          />
          <button type="submit" className="btn-morado text-xs py-2">Guardar</button>
          <button type="button" onClick={() => setEditando(false)} className="btn-ghost text-xs py-2">
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <a
            href={actual}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 truncate font-mono text-sm text-morado hover:underline"
          >
            {actual}
          </a>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copiar} className="btn-ghost text-xs py-1.5">Copiar</button>
            {puedePublicar && (
              <button
                onClick={() => { setUrl(actual); setEditando(true) }}
                className="btn-ghost text-xs py-1.5"
              >
                Cambiar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================
//  TARJETA: CODIGO DE ACCESO
// =============================================================
function TarjetaCodigo({ cfg, puedePublicar, onCambiar, avisar }) {
  const [ver, setVer] = useState(false)
  const codigo = cfg?.codigo || ''

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      avisar('Código copiado.')
    } catch {
      avisar('No se ha podido copiar.', 'error')
    }
  }

  return (
    <div className="card p-5">
      <p className="label">Código de acceso</p>

      {codigo ? (
        <div className="flex items-center gap-2 flex-wrap">
          <code className="font-mono text-lg font-bold text-morado bg-slate-100 rounded-lg px-3 py-1.5 tracking-wider">
            {ver ? codigo : '•'.repeat(Math.min(codigo.length, 14))}
          </code>
          <button onClick={() => setVer(!ver)} className="btn-ghost text-xs py-1.5">
            {ver ? 'Ocultar' : 'Ver'}
          </button>
          <button onClick={copiar} className="btn-ghost text-xs py-1.5">Copiar</button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Todavía no hay código.</p>
      )}

      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
        Es el mismo para todo el tercio. Al entrar da igual mayúsculas, tildes o espacios.
        Si lo cambias, el anterior deja de funcionar en el acto.
      </p>

      {puedePublicar && (
        <button onClick={onCambiar} className="btn-morado mt-4 text-sm">
          <Icono e="🔑" /> {codigo ? 'Cambiar código' : 'Poner código'}
        </button>
      )}
    </div>
  )
}

// =============================================================
//  BLOQUES DEL LISTADO
// =============================================================
function Seccion({ titulo, ayuda, children }) {
  return (
    <div className="card overflow-hidden mb-6">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
        <h3 className="font-display text-base font-semibold text-morado">{titulo}</h3>
        {ayuda && <p className="text-xs text-slate-500 mt-0.5">{ayuda}</p>}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function FilaPublicable({
  fila, titulo, subtitulo, enlace, reemplaza, puedePublicar, ocupado, onInfo, onMarcar,
}) {
  const { item, problemas, pendiente } = fila
  const publicada = !!item.publicado
  const bloqueada = !publicada && problemas.length > 0

  const publicar = () => {
    if (reemplaza && !confirm(`Solo puede haber una de este día en la web.\n\nSe retirará "${reemplaza.nombre}" y se publicará "${item.nombre}". ¿Seguir?`)) return
    onMarcar(true)
  }

  return (
    <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={enlace} className="font-semibold text-sm text-slate-800 hover:text-morado">
            {titulo}
          </Link>
          {publicada ? (
            <span className="chip bg-emerald-100 text-emerald-700 border border-emerald-300">En la web</span>
          ) : (
            <span className="chip bg-slate-100 text-slate-500 border border-slate-300">No publicada</span>
          )}
          {pendiente && (
            <span className="chip bg-amber-100 text-amber-800 border border-amber-300">Cambios sin subir</span>
          )}
        </div>
        {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
        {problemas.length > 0 && (
          <p className={`text-xs mt-1 ${publicada ? 'text-amber-700' : 'text-red-600'}`}>
            <Icono e={publicada ? '⚠️' : '⛔'} tam={13} className="mr-1" />{problemas.join(' · ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onInfo} className="btn-ghost text-xs py-2">
          <Icono e="ℹ️" /> Información
        </button>
        {puedePublicar && (
          publicada ? (
            <button onClick={() => onMarcar(false)} disabled={ocupado} className="btn-ghost text-xs py-2">
              Retirar
            </button>
          ) : (
            <button
              onClick={publicar}
              disabled={ocupado || bloqueada}
              title={bloqueada ? problemas.join(' · ') : ''}
              className="btn-oro text-xs py-2"
            >
              Publicar
            </button>
          )
        )}
      </div>
    </div>
  )
}

// =============================================================
//  MODAL: CAMBIAR CODIGO
// =============================================================
function ModalCodigo({ abierto, cfg, onCerrar, onGuardar }) {
  const [codigo, setCodigo] = useState('')
  const [repetir, setRepetir] = useState('')
  const [ver, setVer] = useState(false)

  useEffect(() => {
    if (abierto) { setCodigo(''); setRepetir(''); setVer(false) }
  }, [abierto])

  const problema = codigo ? problemaCodigo(codigo) : null
  const distintos = repetir && normalizarCodigo(codigo) !== normalizarCodigo(repetir)
  const valido = codigo && !problema && repetir && !distintos

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={cfg?.codigo ? 'Cambiar código' : 'Poner código'}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (valido) onGuardar(codigo) }}
        className="space-y-4"
      >
        <Alerta tipo="info">
          Entre {CODIGO_MINIMO} y {CODIGO_MAXIMO} caracteres. Cuanto más largo y menos
          previsible, más difícil de adivinar.
        </Alerta>

        <div>
          <label className="label">Código nuevo</label>
          <input
            className="input font-mono"
            type={ver ? 'text' : 'password'}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
          {problema && <p className="text-xs text-red-600 mt-1">{problema}</p>}
        </div>

        <div>
          <label className="label">Repítelo</label>
          <input
            className="input font-mono"
            type={ver ? 'text' : 'password'}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            autoComplete="new-password"
          />
          {distintos && <p className="text-xs text-red-600 mt-1">No coinciden.</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
          Ver lo que escribo
        </label>

        {cfg?.codigo && (
          <Alerta tipo="aviso">
            El código actual dejará de funcionar en cuanto guardes. Avisa al tercio del nuevo.
          </Alerta>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={!valido} className="btn-morado">Guardar código</button>
        </div>
      </form>
    </Modal>
  )
}

// =============================================================
//  MODAL: INFORMACION PARA LA WEB
// =============================================================
function ModalInfo({ datos, soloLectura, onCerrar, onGuardar }) {
  const [f, setF] = useState(infoWeb(null))
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (datos) { setF(infoWeb(datos.item)); setAviso('') }
  }, [datos])

  if (!datos) return null
  const esEnsayo = datos.clase === 'ensayo'
  const item = datos.item
  const cambiar = (c) => setF((x) => ({ ...x, ...c }))

  const anadirAviso = () => {
    const t = aviso.trim()
    if (!t) return
    cambiar({ avisos: [...(f.avisos || []), t] })
    setAviso('')
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={esEnsayo ? 'Información del ensayo' : `Información · ${item.nombre}`}
      ancho="max-w-2xl"
    >
      <div className="space-y-5">
        {esEnsayo ? (
          <Alerta tipo="info">
            Hora: <b>{item.hora || '—'}</b> · Lugar: <b>{item.lugar || '—'}</b>
            {item.notas && <> · Indicaciones: {item.notas}</>}
            <br />
            Esto se cambia en el propio ensayo o en el calendario. Aquí solo añades avisos.
          </Alerta>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Hora de citación">
                <input type="time" className="input" disabled={soloLectura}
                  value={f.citacion_hora} onChange={(e) => cambiar({ citacion_hora: e.target.value })} />
              </Campo>
              <Campo label="Lugar de citación">
                <input className="input" disabled={soloLectura} placeholder="Ej. Casa de Hermandad"
                  value={f.citacion_lugar} onChange={(e) => cambiar({ citacion_lugar: e.target.value })} />
              </Campo>
              <Campo label="Hora de salida">
                <input type="time" className="input" disabled={soloLectura}
                  value={f.salida_hora} onChange={(e) => cambiar({ salida_hora: e.target.value })} />
              </Campo>
              <Campo label="Hora de recogida (opcional)">
                <input type="time" className="input" disabled={soloLectura}
                  value={f.recogida_hora} onChange={(e) => cambiar({ recogida_hora: e.target.value })} />
              </Campo>
            </div>

            <Campo label="A tener en cuenta">
              <textarea className="input min-h-[90px] resize-y" disabled={soloLectura}
                placeholder="Vestimenta, qué traer, dónde dejar las cosas…"
                value={f.tener_en_cuenta} onChange={(e) => cambiar({ tener_en_cuenta: e.target.value })} />
            </Campo>

            <p className="text-xs text-slate-500">
              Los tramos (de dónde a dónde y qué turno carga cada uno) y la normativa salen
              solos de la procesión.
            </p>
          </>
        )}

        <div>
          <label className="label">Avisos</label>
          {(f.avisos || []).length > 0 && (
            <ul className="space-y-1.5 mb-2">
              {f.avisos.map((a, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="shrink-0"><Icono e="📢" /></span>
                  <span className="flex-1 text-amber-900">{a}</span>
                  {!soloLectura && (
                    <button
                      onClick={() => cambiar({ avisos: f.avisos.filter((_, k) => k !== i) })}
                      className="text-amber-700 hover:text-red-600 text-xs font-bold"
                    >
                      Quitar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!soloLectura && (
            <div className="flex gap-2">
              <input
                className="input"
                value={aviso}
                onChange={(e) => setAviso(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); anadirAviso() } }}
                placeholder="Escribe un aviso y pulsa Añadir…"
              />
              <button onClick={anadirAviso} className="btn-ghost shrink-0">Añadir</button>
            </div>
          )}
        </div>

        {!soloLectura && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
            <button onClick={() => onGuardar(f)} className="btn-morado">
              {item.publicado ? 'Guardar y subir a la web' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
