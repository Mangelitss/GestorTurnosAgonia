// =============================================================
//  EDITOR DE UN ENSAYO
//  Lista de asistencia + generacion y edicion del cuadrante
// =============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  leerEnsayo, archivarEnsayo, reabrirEnsayo, ESTADOS,
  comoAsistente, anadirAsistente, quitarAsistente, ordenarAsistentes,
} from '../lib/ensayos'
import { guardarEnsayoSincronizado } from '../lib/sincro'
import {
  generarCuadrante, generarConAvisos, turnosRecomendados, plazasTotales, configPorDefecto,
  detectarDuplicados, idsColocados, intercambiar, quitarDe, alternarBloqueo,
  colocarEn, meterEnPrimerHueco, anadirHueco, quitarHueco, anadirTurno,
  quitarTurno, resumen, huecos, limpiarTurno, contarLimpieza, ocupantes,
} from '../lib/cuadrante'
import { leerCenso, crearCostalero, costaleroVacio, normalizar } from '../lib/censo'
import { fechaBonita, diaSemana, leerOpciones } from '../lib/calendario'
import { pdfCuadrante, pdfAsistentes } from '../lib/pdf'
import {
  VARAS, SECCIONES, OPCIONES_HOMBRO, ALGORITMOS, ALGORITMO_POR_DEFECTO, letraTurno,
} from '../lib/constantes'
import {
  corregirHombros, mapaHombros, clavesMalColocadas, resumenHombros,
} from '../lib/hombros'
import { COL } from '../lib/firebase'
import { useEdicionProtegida } from '../lib/useEdicionProtegida'
import { P } from '../lib/roles'
import { useAuth, nombreConComa } from '../context/AuthContext'
import { estadisticasTurno, FLEXION_VARA_CM } from '../lib/estadisticas'
import Trono from '../components/Trono'
import SelectorAlgoritmo from '../components/SelectorAlgoritmo'
import { LeyendaCalor } from '../components/EstadisticasTurno'
import { AvisoBloqueo, EstadoGuardado } from '../components/AvisoBloqueo'
import { Page, Cargando, Vacio, Modal, Alerta, Toast } from '../components/ui'

export default function EnsayoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { puede, perfil } = useAuth()

  const [ensayo, setEnsayo] = useState(null)
  const [censo, setCenso] = useState([])
  const [lugares, setLugares] = useState([])
  const [cargando, setCargando] = useState(true)
  const [toast, setToast] = useState(null)

  // Modales
  const [modalGenerar, setModalGenerar] = useState(false)
  const [modalDatos, setModalDatos] = useState(false)
  const [huecoDestino, setHuecoDestino] = useState(null)   // ref del hueco a rellenar
  const [altaRapida, setAltaRapida] = useState(null)       // nombre tecleado que no existe
  const [tardon, setTardon] = useState(null)               // asistente añadido con cuadrante ya hecho
  const [mapaCalor, setMapaCalor] = useState(false)

  const avisar = (mensaje, tipo = 'exito') => setToast({ mensaje, tipo })

  // --- Carga ---
  useEffect(() => {
    let vivo = true
    async function cargar() {
      setCargando(true)
      try {
        const [e, c, ops] = await Promise.all([leerEnsayo(id), leerCenso(), leerOpciones()])
        if (!vivo) return
        if (!e) { avisar('Ese ensayo no existe.', 'error'); navigate('/ensayos'); return }
        setEnsayo(e)
        setCenso(c)
        setLugares(ops.lugares)
      } catch (err) {
        console.error(err)
        avisar('No se ha podido cargar el ensayo.', 'error')
      } finally {
        if (vivo) setCargando(false)
      }
    }
    cargar()
    return () => { vivo = false }
  }, [id, navigate])

  // --- Edición protegida: bloqueo, guardado automático y aviso al salir ---
  // Al guardar propagamos fecha/hora/lugar/notas a la cita del calendario
  const guardarEnServidor = useCallback(
    (cambios) => guardarEnsayoSincronizado(id, cambios, ensayo?.evento_id),
    [id, ensayo?.evento_id]
  )

  const {
    soloLectura: bloqueado, bloqueo, comprobando,
    sinGuardar, guardando, ultimoGuardado,
    cambiar, guardarAhora, forzarEntrada, reintentar,
  } = useEdicionProtegida({
    tipo: 'ensayo',
    id,
    coleccion: COL.ENSAYOS,
    usuario: { uid: perfil?.id, nombre: nombreConComa(perfil) },
    puedeEditar: puede(P.ENSAYOS_EDITAR),
    datos: ensayo,
    setDatos: setEnsayo,
    guardarEnServidor,
    activo: !!ensayo && ensayo.estado !== 'archivado',
  })

  const archivado = ensayo?.estado === 'archivado'
  const soloLectura = archivado || bloqueado

  const guardar = useCallback(async (cambios, mensaje) => {
    if (cambios) cambiar(cambios)
    const r = await guardarAhora()
    if (r?.ok && mensaje) avisar(mensaje)
    else if (r && !r.ok) avisar('No se ha podido guardar.', 'error')
  }, [cambiar, guardarAhora])

  // Cambios del cuadrante: se guardan solos a los pocos segundos
  const setCuadranteLocal = (nuevo) => cambiar({ cuadrante: nuevo })

  // --- Datos derivados ---
  const asistentes = ensayo?.asistentes || []
  const cuadrante = ensayo?.cuadrante || null
  const config = ensayo?.config || configPorDefecto()

  const { conflictivas, detalle: duplicados } = useMemo(
    () => (cuadrante ? detectarDuplicados(cuadrante) : { conflictivas: new Set(), detalle: [] }),
    [cuadrante]
  )

  // Índice del censo, para consultar preferencias de hombro
  const censoPorId = useMemo(() => {
    const m = {}
    censo.forEach((c) => { m[c.id] = c })
    return m
  }, [censo])

  // --- Hombros ---
  const hombros = useMemo(
    () => (cuadrante ? mapaHombros(cuadrante, censoPorId) : {}),
    [cuadrante, censoPorId]
  )
  const malHombro = useMemo(
    () => (cuadrante ? clavesMalColocadas(cuadrante, censoPorId) : new Set()),
    [cuadrante, censoPorId]
  )
  const statsHombro = useMemo(
    () => (cuadrante ? resumenHombros(cuadrante, censoPorId) : null),
    [cuadrante, censoPorId]
  )

  // Duplicados y hombros mal, ambos en rojo
  const marcasTodas = useMemo(() => {
    const m = new Map()
    conflictivas.forEach((clave) => m.set(clave, 'DUPLICADO'))
    malHombro.forEach((clave) => m.set(clave, 'DUPLICADO'))
    return m
  }, [conflictivas, malHombro])

  const colocados = useMemo(
    () => (cuadrante ? idsColocados(cuadrante) : new Set()),
    [cuadrante]
  )

  const stats = useMemo(() => (cuadrante ? resumen(cuadrante) : null), [cuadrante])

  const sinColocar = useMemo(
    () => asistentes.filter((a) => !colocados.has(a.costalero_id)),
    [asistentes, colocados]
  )

  // =============================================================
  //  ASISTENCIA
  // =============================================================

  const apuntar = async (costalero) => {
    const nuevo = comoAsistente(costalero)
    const lista = anadirAsistente(asistentes, nuevo)
    if (lista === asistentes) { avisar('Ese costalero ya está apuntado.', 'error'); return }

    await guardar({ asistentes: lista })

    // Si ya hay cuadrante, preguntamos qué hacer con el que llega tarde
    if (cuadrante) setTardon(nuevo)
    else avisar(`${costalero.nombre} apuntado.`)
  }

  const desapuntar = async (a) => {
    if (!confirm(`¿Quitar a ${a.nombre} de la lista de asistencia?`)) return

    const lista = quitarAsistente(asistentes, a.costalero_id)
    const cambios = { asistentes: lista }

    // Si estaba colocado, lo sacamos también del cuadrante
    if (cuadrante && colocados.has(a.costalero_id)) {
      const c = JSON.parse(JSON.stringify(cuadrante))
      c.forEach((turno) =>
        VARAS.forEach((v) =>
          SECCIONES.forEach((s) => {
            const arr = turno.varas[v][s]
            arr.forEach((p, i) => {
              if (p?.costalero_id === a.costalero_id) arr[i] = null
            })
          })
        )
      )
      cambios.cuadrante = c
    }

    await guardar(cambios, `${a.nombre} quitado de la lista.`)
  }

  // El que llega tarde: hueco libre o regenerar
  const resolverTardon = async (accion) => {
    const persona = tardon
    setTardon(null)
    if (!persona) return

    if (accion === 'hueco') {
      const r = meterEnPrimerHueco(cuadrante, persona)
      if (r.error) { avisar(r.error, 'error'); return }
      await guardar({ cuadrante: r.cuadrante }, `${persona.nombre} colocado en el primer hueco libre.`)
    } else if (accion === 'regenerar') {
      const nuevo = generarCuadrante([...asistentes], {
        numTurnos: cuadrante.length,
        config,
        algoritmo: ensayo?.algoritmo || ALGORITMO_POR_DEFECTO,
        cuadranteAnterior: cuadrante,
        censoPorId,
        rellenarConAnterior: true,    // si falta gente, entran repetidores
      })
      await guardar({ cuadrante: nuevo }, 'Cuadrante regenerado con el nuevo asistente.')
    } else {
      avisar(`${persona.nombre} apuntado, pendiente de colocar.`)
    }
  }

  // =============================================================
  //  CUADRANTE
  // =============================================================

  const generar = async ({ numTurnos, config: cfg, algoritmo }) => {
    const { cuadrante: generado, avisos } = generarConAvisos(asistentes, {
      numTurnos,
      config: cfg,
      algoritmo,
      cuadranteAnterior: cuadrante,   // respeta los bloqueos
      censoPorId,
      rellenarConAnterior: true,      // si falta gente, entran repetidores
    })

    // Corrección de hombros justo después de generar
    const rh = corregirHombros(generado, censoPorId)

    setModalGenerar(false)

    const partes = []
    const repetidores = ocupantes(rh.cuadrante).filter((x) => x.p.repetidor).length
    if (repetidores) partes.push(`${repetidores} repetidor(es)`)
    if (avisos.length) {
      const faltan = avisos.reduce((n, a) => n + a.faltan, 0)
      partes.push(`faltan ${faltan} por cubrir`)
    }
    if (rh.corregidos) partes.push(`${rh.corregidos} hombro(s) corregidos`)
    if (rh.sinResolver.length) partes.push(`${rh.sinResolver.length} hombro(s) sin resolver`)

    await guardar(
      { cuadrante: rh.cuadrante, config: cfg, algoritmo },
      partes.length
        ? `Cuadrante generado con el ${ALGORITMOS[algoritmo].nombre} · ${partes.join(' · ')}.`
        : `Cuadrante generado con el ${ALGORITMOS[algoritmo].nombre}.`
    )
  }

  const opIntercambiar = (a, b) => {
    const r = intercambiar(cuadrante, a, b)
    if (r.error) return avisar(r.error, 'error')
    setCuadranteLocal(r.cuadrante)
  }

  const opQuitar = (ref) => {
    const r = quitarDe(cuadrante, ref)
    if (r.error) return avisar(r.error, 'error')
    setCuadranteLocal(r.cuadrante)
  }

  const opBloquear = (ref) => {
    const r = alternarBloqueo(cuadrante, ref)
    if (r.error) return avisar(r.error, 'error')
    setCuadranteLocal(r.cuadrante)
  }

  const opColocar = (persona) => {
    if (!huecoDestino) return
    const r = colocarEn(cuadrante, huecoDestino, persona)
    setHuecoDestino(null)
    if (r.error) return avisar(r.error, 'error')
    setCuadranteLocal(r.cuadrante)
  }

  const opAnadirHueco = (t, vara, seccion) => {
    setCuadranteLocal(anadirHueco(cuadrante, t, vara, seccion))
  }

  const opQuitarHueco = (t, vara, seccion) => {
    const r = quitarHueco(cuadrante, t, vara, seccion)
    if (r.error) return avisar(r.error, 'error')
    setCuadranteLocal(r.cuadrante)
  }

  const opRevisarHombros = () => {
    if (!cuadrante) return
    const r = corregirHombros(cuadrante, censoPorId)

    if (!r.corregidos && !r.sinResolver.length) {
      return avisar('Todos los costaleros llevan el hombro correcto.')
    }
    if (r.corregidos) setCuadranteLocal(r.cuadrante)

    const partes = []
    if (r.corregidos) partes.push(`${r.corregidos} corregido(s)`)
    if (r.sinResolver.length) partes.push(`${r.sinResolver.length} sin resolver`)
    avisar(`Hombros: ${partes.join(' · ')}.`, r.sinResolver.length ? 'error' : 'exito')
  }

  const opLimpiarTurno = (t) => {
    const { quitables, bloqueados } = contarLimpieza(cuadrante, t)

    if (!quitables) {
      return avisar(
        bloqueados
          ? 'Todas las posiciones ocupadas de ese turno están bloqueadas.'
          : 'Ese turno ya está vacío.',
        'error'
      )
    }

    const texto = bloqueados
      ? `¿Vaciar el Turno ${cuadrante[t].id}?\n\nSe quitarán ${quitables} costalero(s).\n🔒 ${bloqueados} bloqueado(s) se mantendrán.`
      : `¿Vaciar el Turno ${cuadrante[t].id}?\n\nSe quitarán ${quitables} costalero(s).`

    if (!confirm(texto)) return

    const r = limpiarTurno(cuadrante, t)
    setCuadranteLocal(r.cuadrante)
    avisar(`Turno ${cuadrante[t].id} vaciado: ${r.quitados} quitado(s)${r.conservados ? `, ${r.conservados} conservado(s)` : ''}.`)
  }

  const opAnadirTurno = () => setCuadranteLocal(anadirTurno(cuadrante, config))

  const opQuitarTurno = () => {
    const r = quitarTurno(cuadrante)
    if (r.error) return avisar(r.error, 'error')
    setCuadranteLocal(r.cuadrante)
  }

  // =============================================================
  //  ALTA RAPIDA AL CENSO
  // =============================================================

  const crearYApuntar = async (datos) => {
    try {
      const nuevoId = await crearCostalero(datos)
      const costalero = { id: nuevoId, ...datos }
      setCenso((c) => [...c, costalero].sort((a, b) =>
        normalizar(a.nombre).localeCompare(normalizar(b.nombre))
      ))
      setAltaRapida(null)
      await apuntar(costalero)
      avisar(`${datos.nombre} añadido al censo y apuntado.`)
    } catch (e) {
      console.error(e)
      avisar('No se ha podido crear el costalero.', 'error')
    }
  }

  // =============================================================
  //  ESTADO
  // =============================================================

  const cambiarEstado = async () => {
    if (archivado) {
      if (!confirm('¿Reabrir este ensayo para seguir editándolo?')) return
      await reabrirEnsayo(id)
      setEnsayo((e) => ({ ...e, estado: 'abierto' }))
      avisar('Ensayo reabierto.')
    } else {
      if (sinGuardar && !confirm('Tienes cambios sin guardar que se perderán.\n\n¿Archivar de todas formas?')) return
      if (!confirm('¿Archivar este ensayo?\n\nQuedará guardado y podrás reabrirlo cuando quieras.')) return
      await archivarEnsayo(id)
      setEnsayo((e) => ({ ...e, estado: 'archivado' }))
      avisar('Ensayo archivado.')
    }
  }

  // =============================================================
  //  RENDER
  // =============================================================

  if (cargando) return <Page><Cargando texto="Cargando ensayo…" /></Page>
  if (!ensayo) return null

  const est = ESTADOS[ensayo.estado] || ESTADOS.abierto
  const plazas = plazasTotales(config)
  const faltan = cuadrante ? stats.libres : 0

  return (
    <Page>
      {/* ---------- CABECERA ---------- */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Link to="/ensayos" className="text-sm text-slate-500 hover:text-morado mb-1 inline-block">
            ← Volver a ensayos
          </Link>
          <h1 className="font-serif text-2xl font-bold text-morado flex items-center gap-3">
            📋 Ensayo del {fechaBonita(ensayo.fecha_iso)}
            <span className={`chip ${est.chip}`}>{est.nombre}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {diaSemana(ensayo.fecha_iso)} · {ensayo.hora} · {ensayo.lugar}
            {!soloLectura && (
              <button
                onClick={() => setModalDatos(true)}
                className="ml-2 text-oro-dark hover:underline text-xs"
              >
                editar datos
              </button>
            )}
          </p>
          {ensayo.evento_id && (
            <Link
              to="/calendario"
              className="text-xs text-slate-400 hover:text-morado mt-1 inline-flex items-center gap-1"
            >
              🔗 Unido a una convocatoria del calendario
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <EstadoGuardado
            sinGuardar={sinGuardar}
            guardando={guardando}
            ultimoGuardado={ultimoGuardado}
            onGuardar={() => guardar(null, 'Cambios guardados.')}
          />
          <button onClick={() => pdfAsistentes(ensayo, asistentes)} className="btn-ghost text-xs">
            📋 PDF asistentes
          </button>
          <button onClick={() => pdfCuadrante(ensayo, cuadrante)} className="btn-ghost text-xs">
            📄 PDF cuadrante
          </button>
          {puede(P.ENSAYOS_EDITAR) && (
            <button onClick={cambiarEstado} className="btn-ghost text-xs">
              {archivado ? '🔓 Reabrir' : '📦 Archivar'}
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
          if (r.ok) avisar('Ya puedes editarlo.')
        }}
      />

      {ensayo.notas && (
        <div className="mb-5">
          <Alerta tipo="info">{ensayo.notas}</Alerta>
        </div>
      )}

      {archivado && (
        <div className="mb-5">
          <Alerta tipo="aviso">
            Este ensayo está <b>archivado</b> y no se puede modificar.
            Púlsalo en «Reabrir» si necesitas seguir trabajando en él.
          </Alerta>
        </div>
      )}

      {/* ---------- AVISOS ---------- */}
      {duplicados.length > 0 && (
        <div className="mb-5">
          <Alerta tipo="error">
            <b>Hay {duplicados.length} costalero(s) duplicados en el mismo turno:</b>
            <ul className="mt-1.5 space-y-0.5">
              {duplicados.map((d, i) => (
                <li key={i}>
                  • {d.nombre} aparece {d.veces} veces en el Turno {d.turno}
                </li>
              ))}
            </ul>
          </Alerta>
        </div>
      )}

      {cuadrante && faltan > 0 && (
        <div className="mb-5">
          <Alerta tipo="aviso">
            Faltan <b>{faltan} costalero(s)</b> para completar todas las posiciones
            {sinColocar.length > 0 && ` · Tienes ${sinColocar.length} asistente(s) sin colocar`}.
          </Alerta>
        </div>
      )}

      {/* ---------- CUERPO ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">

        {/* ---- Columna de asistencia ---- */}
        <div className="card p-5 xl:sticky xl:top-6">
          <h2 className="font-serif text-base font-bold text-morado mb-1">
            Lista de asistencia
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {asistentes.length} apuntado(s)
            {cuadrante && ` · ${sinColocar.length} sin colocar`}
          </p>

          {!soloLectura && (
            <BuscadorCostaleros
              censo={censo}
              yaApuntados={new Set(asistentes.map((a) => a.costalero_id))}
              onElegir={apuntar}
              onNoExiste={(nombre) => setAltaRapida(nombre)}
            />
          )}

          <div className="mt-4 space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {asistentes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Todavía no hay nadie apuntado.
              </p>
            ) : (
              ordenarAsistentes(asistentes).map((a) => {
                const colocado = colocados.has(a.costalero_id)
                return (
                  <div
                    key={a.costalero_id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-sm group
                                ${colocado ? 'bg-slate-50' : 'bg-amber-50 border border-amber-200'}`}
                  >
                    <span className="flex-1 min-w-0 truncate font-medium text-slate-700">
                      {a.nombre}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">
                      {a.altura} cm
                    </span>
                    {!colocado && cuadrante && (
                      <span className="text-[10px] text-amber-600 shrink-0" title="Sin colocar">●</span>
                    )}
                    {!soloLectura && (
                      <button
                        onClick={() => desapuntar(a)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="Quitar de la lista"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Generar */}
          {!soloLectura && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <button
                onClick={() => setModalGenerar(true)}
                disabled={asistentes.length === 0}
                className="btn-morado w-full"
              >
                {cuadrante ? '🔄 Regenerar turnos' : '⚙️ Generar turnos'}
              </button>
              {asistentes.length > 0 && (
                <p className="text-xs text-slate-400 mt-2 text-center">
                  {asistentes.length} asistentes · {plazas} plazas por turno
                  <br />
                  Recomendado: {turnosRecomendados(asistentes.length, config)} turno(s)
                </p>
              )}
              {cuadrante && (
                <p className="text-[11px] text-slate-400 mt-2 text-center leading-relaxed">
                  Las posiciones 🔒 bloqueadas se mantienen al regenerar.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ---- Columna del trono ---- */}
        <div>
          {!cuadrante ? (
            <div className="card">
              <Vacio
                icono="⚙️"
                titulo="Todavía no hay turnos generados"
                texto={
                  asistentes.length === 0
                    ? 'Apunta primero a los costaleros que han venido al ensayo.'
                    : 'Pulsa «Generar turnos» para repartir a los asistentes por altura de hombro.'
                }
              >
                {!soloLectura && asistentes.length > 0 && (
                  <button onClick={() => setModalGenerar(true)} className="btn-oro">
                    ⚙️ Generar turnos
                  </button>
                )}
              </Vacio>
            </div>
          ) : (
            <>
              {/* Barra de control del cuadrante */}
              <div className="card p-3 mb-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="chip bg-morado/10 text-morado">
                    {stats.turnos} turno{stats.turnos === 1 ? '' : 's'}
                  </span>
                  <span className="text-slate-500">
                    {stats.ocupadas}/{stats.plazas} plazas
                  </span>
                  {stats.bloqueadas > 0 && (
                    <span className="chip bg-morado/10 text-morado">
                      🔒 {stats.bloqueadas}
                    </span>
                  )}
                  {duplicados.length > 0 && (
                    <span className="chip bg-red-100 text-red-700 animate-pulse-fast">
                      ⚠️ {duplicados.length} duplicado(s)
                    </span>
                  )}
                  {statsHombro?.mal > 0 && (
                    <span className="chip bg-red-100 text-red-700 animate-pulse-fast">
                      ⚠️ {statsHombro.mal} hombro(s) mal
                    </span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setMapaCalor((m) => !m)}
                    className={mapaCalor ? 'btn-oro text-xs' : 'btn-ghost text-xs'}
                    title="Colorea a cada costalero según los kilos que soporta"
                  >
                    {mapaCalor ? '🔥 Mapa de peso: ON' : '🧊 Mapa de peso'}
                  </button>

                  {!soloLectura && (
                  <>
                    <button onClick={opRevisarHombros} className="btn-ghost text-xs">
                      💪 Comprobar hombros
                    </button>
                    <button onClick={opAnadirTurno} className="btn-ghost text-xs">
                      + Turno
                    </button>
                    <button onClick={opQuitarTurno} className="btn-ghost text-xs">
                      − Turno
                    </button>
                  </>
                  )}
                </div>
              </div>

              {mapaCalor && (
                <div className="card p-3 mb-4">
                  <LeyendaCalor stats={estadisticasTurno(cuadrante[0], 'trono')} />
                  <p className="text-[11px] text-slate-500 mt-2">
                    La vara flexiona unos {FLEXION_VARA_CM} cm. Quien esté por debajo de esa
                    diferencia respecto al más alto de su vara no llega a tocarla.
                  </p>
                </div>
              )}

              <Trono
                cuadrante={cuadrante}
                conflictivas={marcasTodas}
                hombros={hombros}
                censoPorId={censoPorId}
                soloLectura={soloLectura}
                mapaCalor={mapaCalor}
                onIntercambiar={opIntercambiar}
                onQuitar={opQuitar}
                onBloquear={opBloquear}
                onPedirCostalero={setHuecoDestino}
                onAnadirHueco={opAnadirHueco}
                onQuitarHueco={opQuitarHueco}
                onLimpiarTurno={opLimpiarTurno}
              />
            </>
          )}
        </div>
      </div>

      {/* ---------- MODALES ---------- */}

      <ModalGenerar
        abierto={modalGenerar}
        numAsistentes={asistentes.length}
        configActual={config}
        turnosActuales={cuadrante?.length}
        algoritmoActual={ensayo.algoritmo || ALGORITMO_POR_DEFECTO}
        hayBloqueos={stats?.bloqueadas > 0}
        onCerrar={() => setModalGenerar(false)}
        onGenerar={generar}
      />

      <ModalDatos
        abierto={modalDatos}
        ensayo={ensayo}
        lugares={lugares}
        onCerrar={() => setModalDatos(false)}
        onGuardar={async (d) => { await guardar(d, 'Datos actualizados.'); setModalDatos(false) }}
      />

      <ModalRellenarHueco
        hueco={huecoDestino}
        candidatos={sinColocar}
        censo={censo}
        onCerrar={() => setHuecoDestino(null)}
        onElegir={opColocar}
      />

      <ModalTardon
        persona={tardon}
        hayHuecos={cuadrante ? huecos(cuadrante).length > 0 : false}
        onResolver={resolverTardon}
      />

      <ModalAltaRapida
        nombre={altaRapida}
        onCerrar={() => setAltaRapida(null)}
        onCrear={crearYApuntar}
      />

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={() => setToast(null)} />
    </Page>
  )
}

// =============================================================
//  BUSCADOR DE COSTALEROS (lista de asistencia)
// =============================================================

function BuscadorCostaleros({ censo, yaApuntados, onElegir, onNoExiste }) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const cajaRef = useRef(null)

  const q = normalizar(texto)
  const resultados = useMemo(() => {
    if (q.length < 2) return []
    return censo
      .filter((c) => normalizar(c.nombre).includes(q))
      .slice(0, 8)
  }, [censo, q])

  const elegir = (c) => {
    onElegir(c)
    setTexto('')
    setAbierto(false)
  }

  const enviar = (e) => {
    e.preventDefault()
    if (resultados.length === 1) return elegir(resultados[0])
    if (texto.trim().length >= 3 && resultados.length === 0) {
      onNoExiste(texto.trim())
      setTexto('')
      setAbierto(false)
    }
  }

  return (
    <div className="relative" ref={cajaRef}>
      <form onSubmit={enviar}>
        <input
          className="input"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          placeholder="Escribe un nombre para apuntar…"
        />
      </form>

      {abierto && q.length >= 2 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200
                        rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {resultados.length === 0 ? (
            <div className="p-3">
              <p className="text-sm text-slate-500 mb-2">
                No hay nadie con ese nombre en el censo.
              </p>
              <button
                onClick={() => { onNoExiste(texto.trim()); setTexto(''); setAbierto(false) }}
                className="btn-oro text-xs w-full"
              >
                ➕ Crear «{texto.trim()}» en el censo
              </button>
            </div>
          ) : (
            resultados.map((c) => {
              const apuntado = yaApuntados.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => !apuntado && elegir(c)}
                  disabled={apuntado}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-slate-100 last:border-0
                              flex items-center gap-2 transition
                              ${apuntado ? 'opacity-40 cursor-not-allowed' : 'hover:bg-oro/10'}`}
                >
                  <span className="flex-1 min-w-0 truncate font-medium">{c.nombre}</span>
                  <span className="text-xs text-slate-400 shrink-0">{c.altura} cm</span>
                  {apuntado && <span className="text-xs text-emerald-600 shrink-0">✓</span>}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================
//  MODAL: GENERAR TURNOS
// =============================================================

function ModalGenerar({
  abierto, numAsistentes, configActual, turnosActuales, algoritmoActual,
  hayBloqueos, onCerrar, onGenerar,
}) {
  const [numTurnos, setNumTurnos] = useState(1)
  const [config, setConfig] = useState(configPorDefecto())
  const [algoritmo, setAlgoritmo] = useState(ALGORITMO_POR_DEFECTO)

  useEffect(() => {
    if (!abierto) return
    const cfg = configActual || configPorDefecto()
    setConfig(JSON.parse(JSON.stringify(cfg)))
    setNumTurnos(turnosActuales || turnosRecomendados(numAsistentes, cfg))
    setAlgoritmo(algoritmoActual || ALGORITMO_POR_DEFECTO)
  }, [abierto, configActual, turnosActuales, numAsistentes, algoritmoActual])

  const plazas = plazasTotales(config)
  const capacidad = plazas * numTurnos
  const recomendado = turnosRecomendados(numAsistentes, config)

  const setVara = (vara, seccion, valor) => {
    const n = Math.max(0, Math.min(20, Number(valor) || 0))
    setConfig((c) => ({ ...c, [vara]: { ...c[vara], [seccion]: n } }))
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Generar turnos" ancho="max-w-2xl">
      <div className="space-y-5">
        <Alerta tipo="info">
          Los asistentes se repartirán <b>por altura de hombro</b>, de mayor a menor.
          El Turno A se lleva a los más altos, y dentro de cada turno los más altos van delante.
        </Alerta>

        {hayBloqueos && (
          <Alerta tipo="aviso">
            Hay posiciones <b>bloqueadas</b>. Se mantendrán tal cual están al regenerar.
          </Alerta>
        )}

        <SelectorAlgoritmo valor={algoritmo} onCambiar={setAlgoritmo} />

        {/* Turnos */}
        <div>
          <label className="label">Número de turnos</label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={1} max={12} className="input w-24"
              value={numTurnos}
              onChange={(e) => setNumTurnos(Math.max(1, Number(e.target.value) || 1))}
            />
            {numTurnos !== recomendado && (
              <button
                onClick={() => setNumTurnos(recomendado)}
                className="btn-ghost text-xs"
              >
                Usar recomendado ({recomendado})
              </button>
            )}
          </div>
        </div>

        {/* Estructura */}
        <div>
          <label className="label">Costaleros por vara</label>
          <div className="grid grid-cols-3 gap-3">
            {VARAS.map((v) => (
              <div key={v} className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-bold text-morado text-center mb-2.5 uppercase tracking-wide">
                  {v}
                </p>
                {SECCIONES.map((s) => (
                  <div key={s} className="flex items-center justify-between gap-2 mb-2 last:mb-0">
                    <span className="text-xs text-slate-500">
                      {s === 'Detras' ? 'Detrás' : s}
                    </span>
                    <input
                      type="number" min={0} max={20}
                      className="input w-16 text-center py-1"
                      value={config[v]?.[s] ?? 0}
                      onChange={(e) => setVara(v, s, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={() => setConfig(configPorDefecto())}
            className="btn-ghost text-xs mt-2"
          >
            Restaurar 6 + 6 estándar
          </button>
        </div>

        {/* Resumen */}
        <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-morado">{numAsistentes}</p>
            <p className="text-xs text-slate-500 mt-0.5">Asistentes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-morado">{plazas}</p>
            <p className="text-xs text-slate-500 mt-0.5">Plazas por turno</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${capacidad < numAsistentes ? 'text-red-600' : 'text-emerald-600'}`}>
              {capacidad}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Capacidad total</p>
          </div>
        </div>

        {capacidad < numAsistentes && (
          <Alerta tipo="aviso">
            La capacidad ({capacidad}) es menor que los asistentes ({numAsistentes}).
            Quedarán <b>{numAsistentes - capacidad}</b> sin colocar.
          </Alerta>
        )}
        {capacidad > numAsistentes && (
          <Alerta tipo="aviso">
            Faltan <b>{capacidad - numAsistentes}</b> asistente(s) para llenar todos los turnos.
            Se completarán con los <b>más bajos del turno anterior</b>, marcados con <b>(R)</b>.
          </Alerta>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => onGenerar({ numTurnos, config, algoritmo })}
            className="btn-morado"
          >
            Generar cuadrante
          </button>
        </div>
      </div>
    </Modal>
  )
}

// =============================================================
//  MODAL: EL QUE LLEGA TARDE
// =============================================================

function ModalTardon({ persona, hayHuecos, onResolver }) {
  if (!persona) return null

  return (
    <Modal
      abierto={!!persona}
      onCerrar={() => onResolver('nada')}
      titulo="Ya hay un cuadrante generado"
    >
      <p className="text-sm text-slate-600 mb-5">
        Has apuntado a <b className="text-morado">{persona.nombre}</b> y el cuadrante
        ya estaba hecho. ¿Qué quieres hacer?
      </p>

      <div className="space-y-2.5">
        <button
          onClick={() => onResolver('hueco')}
          disabled={!hayHuecos}
          className="w-full text-left p-4 rounded-lg border-2 border-slate-200
                     hover:border-oro hover:bg-oro/5 transition disabled:opacity-40
                     disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent"
        >
          <p className="font-semibold text-sm text-slate-800">
            📍 Colocarlo en el primer hueco libre
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {hayHuecos
              ? 'No toca nada de lo ya colocado, solo rellena un hueco.'
              : 'No queda ningún hueco libre en el cuadrante.'}
          </p>
        </button>

        <button
          onClick={() => onResolver('regenerar')}
          className="w-full text-left p-4 rounded-lg border-2 border-slate-200
                     hover:border-oro hover:bg-oro/5 transition"
        >
          <p className="font-semibold text-sm text-slate-800">
            🔄 Regenerar el cuadrante entero
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Recalcula todo por altura con la lista completa. Las posiciones bloqueadas se respetan.
          </p>
        </button>

        <button
          onClick={() => onResolver('nada')}
          className="w-full text-left p-4 rounded-lg border-2 border-slate-200
                     hover:border-slate-300 transition"
        >
          <p className="font-semibold text-sm text-slate-800">
            ⏸️ Dejarlo pendiente de colocar
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Se queda en la lista de asistencia y lo colocas tú a mano cuando quieras.
          </p>
        </button>
      </div>
    </Modal>
  )
}

// =============================================================
//  MODAL: RELLENAR UN HUECO
// =============================================================

function ModalRellenarHueco({ hueco, candidatos, censo, onCerrar, onElegir }) {
  const [texto, setTexto] = useState('')

  useEffect(() => { if (hueco) setTexto('') }, [hueco])

  if (!hueco) return null

  const q = normalizar(texto)

  // Primero los asistentes sin colocar, luego el resto del censo
  const lista = q.length >= 2
    ? censo
        .filter((c) => normalizar(c.nombre).includes(q))
        .slice(0, 10)
        .map((c) => ({ costalero_id: c.id, nombre: c.nombre, altura: c.altura }))
    : candidatos

  return (
    <Modal
      abierto={!!hueco}
      onCerrar={onCerrar}
      titulo={`Turno ${letraTurno(hueco.t)} · ${hueco.vara} · ${hueco.seccion === 'Detras' ? 'Detrás' : hueco.seccion} #${hueco.i + 1}`}
    >
      <input
        className="input mb-4"
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar en todo el censo…"
      />

      {q.length < 2 && (
        <p className="text-xs text-slate-500 mb-3">
          Asistentes que todavía no están colocados:
        </p>
      )}

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {lista.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {q.length >= 2 ? 'Sin resultados.' : 'Todos los asistentes están colocados.'}
          </p>
        ) : (
          lista.map((p) => (
            <button
              key={p.costalero_id}
              onClick={() => onElegir(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200
                         hover:border-oro hover:bg-oro/5 transition text-left"
            >
              <span className="flex-1 min-w-0 truncate font-medium text-sm">{p.nombre}</span>
              <span className="text-xs text-slate-400 shrink-0">{p.altura} cm</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}

// =============================================================
//  MODAL: ALTA RAPIDA EN EL CENSO
// =============================================================

function ModalAltaRapida({ nombre, onCerrar, onCrear }) {
  const [f, setF] = useState(costaleroVacio())
  const [error, setError] = useState('')

  useEffect(() => {
    if (nombre) { setF({ ...costaleroVacio(), nombre }); setError('') }
  }, [nombre])

  if (!nombre) return null

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('El nombre es obligatorio.')
    const altura = Number(f.altura)
    if (!altura || altura < 80 || altura > 220) {
      return setError('La altura de hombro es obligatoria y debe estar entre 80 y 220 cm.')
    }
    onCrear({ ...f, nombre: f.nombre.trim(), altura })
  }

  return (
    <Modal abierto={!!nombre} onCerrar={onCerrar} titulo="Añadir al censo">
      <p className="text-sm text-slate-500 mb-5">
        Esta persona no está en el censo. Rellena sus datos para darla de alta
        y apuntarla al ensayo. Los campos con * son obligatorios.
      </p>

      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="label">Nombre y apellidos *</label>
          <input
            className="input" autoFocus value={f.nombre}
            onChange={(e) => set('nombre', e.target.value)}
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

        <div className="bg-slate-50 rounded-lg p-4 space-y-2.5">
          <p className="label mb-1">Participación</p>
          {[
            ['miercoles_santo', '🕯️  Sale en Miércoles Santo'],
            ['viernes_santo', '✝️  Sale en Viernes Santo'],
            ['puede_repetir', '🔁  Puede repetir turno'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox" checked={!!f[k]}
                onChange={(e) => set(k, e.target.checked)}
                className="w-4 h-4 accent-morado cursor-pointer"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>

        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-oro">Crear y apuntar</button>
        </div>
      </form>
    </Modal>
  )
}

// =============================================================
//  MODAL: DATOS DEL ENSAYO
// =============================================================

function ModalDatos({ abierto, ensayo, lugares, onCerrar, onGuardar }) {
  const [f, setF] = useState({})
  const vinculado = !!ensayo?.evento_id

  useEffect(() => {
    if (abierto && ensayo) {
      setF({
        fecha_iso: ensayo.fecha_iso,
        hora: ensayo.hora,
        lugar: ensayo.lugar,
        notas: ensayo.notas || '',
      })
    }
  }, [abierto, ensayo])

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Datos del ensayo">
      <form
        onSubmit={(e) => { e.preventDefault(); onGuardar(f) }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Día</label>
            <input
              type="date" className="input"
              value={f.fecha_iso || ''} onChange={(e) => set('fecha_iso', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hora</label>
            <input
              type="time" className="input"
              value={f.hora || ''} onChange={(e) => set('hora', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Lugar</label>
          <select className="input" value={f.lugar || ''} onChange={(e) => set('lugar', e.target.value)}>
            {lugares.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea
            className="input min-h-[90px] resize-y"
            value={f.notas || ''} onChange={(e) => set('notas', e.target.value)}
          />
        </div>

        {vinculado && (
          <Alerta tipo="info">
            Este ensayo está unido a una convocatoria del calendario.
            Los cambios se aplicarán también allí.
          </Alerta>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onCerrar} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-morado">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
