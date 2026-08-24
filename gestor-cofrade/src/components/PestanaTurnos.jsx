// =============================================================
//  PESTAÑA DE TURNOS — trono y cruz guía
// =============================================================

import { useMemo, useState } from 'react'
import {
  generarCuadrante, generarConAvisos, configPorDefecto, configCruz, plazasTotales,
  intercambiar, quitarDe, alternarBloqueo, colocarEn, anadirHueco,
  quitarHueco, anadirTurno, quitarTurno, resumen, ocupantes,
  idsColocados, rellenarConRepetidores, rellenarCruz, varasDe,
  limpiarTurno, contarLimpieza,
} from '../lib/cuadrante'
import ModalOrdenProcesional from './ModalOrdenProcesional'
import {
  candidatosTrono, candidatosCruz, candidatosRellenarCruz, comoOcupante, letrasTurno,
} from '../lib/procesiones'
import { normalizar } from '../lib/censo'
import {
  SECCIONES, CRUZ_MINIMO_SIN_AVISO, PIEZAS,
  ALGORITMOS, ALGORITMO_POR_DEFECTO, etiquetaTurno,
} from '../lib/constantes'
import {
  corregirHombros, mapaHombros, clavesMalColocadas, resumenHombros,
} from '../lib/hombros'
import { estadisticasTurno, FLEXION_VARA_CM } from '../lib/estadisticas'
import Trono from './Trono'
import SelectorAlgoritmo from './SelectorAlgoritmo'
import { LeyendaCalor } from './EstadisticasTurno'
import { Modal, Alerta, Vacio } from './ui'

export default function PestanaTurnos({
  procesion,
  censo,
  censoPorId,
  conflictos,
  soloLectura,
  onCambiar,
  avisar,
}) {
  const [pieza, setPieza] = useState('trono')   // trono | cruz
  const [modalGenerar, setModalGenerar] = useState(null)
  const [hueco, setHueco] = useState(null)      // { pieza, ref }
  const [infoPersona, setInfoPersona] = useState(null)
  const [mapaCalor, setMapaCalor] = useState(false)

  const llevaCruz = procesion.lleva_cruz !== false

  const cuadrante = pieza === 'cruz' ? procesion.cuadrante_cruz : procesion.cuadrante_trono
  const campoCuadrante = pieza === 'cruz' ? 'cuadrante_cruz' : 'cuadrante_trono'
  const marcas = pieza === 'cruz' ? conflictos?.marcasCruz : conflictos?.marcasTrono

  // --- Candidatos del censo ---
  const aptosTrono = useMemo(
    () => candidatosTrono(censo, procesion.tipo),
    [censo, procesion.tipo]
  )
  const aptosCruz = useMemo(
    () => candidatosCruz(censo, procesion.tipo),
    [censo, procesion.tipo]
  )
  // Para el botón de rellenar cruz: titulares sin colocar + los que
  // se han quedado fuera de todos los turnos del trono
  const paraRellenarCruz = useMemo(() => {
    const yaEnCruz = procesion.cuadrante_cruz
      ? idsColocados(procesion.cuadrante_cruz)
      : new Set()
    const enTrono = procesion.cuadrante_trono
      ? idsColocados(procesion.cuadrante_trono)
      : new Set()
    return candidatosRellenarCruz(censo, procesion.tipo, { yaEnCruz, enTrono })
  }, [censo, procesion.tipo, procesion.cuadrante_cruz, procesion.cuadrante_trono])

  const candidatos = pieza === 'cruz' ? aptosCruz : aptosTrono
  const stats = cuadrante ? resumen(cuadrante) : null

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

  // Marcas de conflicto: se juntan las del detector con las de hombro
  const marcasConHombro = useMemo(() => {
    const m = new Map(marcas || [])
    malHombro.forEach((clave) => m.set(clave, 'DUPLICADO'))   // rojo bloqueante
    return m
  }, [marcas, malHombro])

  // Turnos de cruz por debajo del mínimo
  const avisosCruz = useMemo(() => {
    if (pieza !== 'cruz' || !cuadrante) return []
    return cuadrante.map((t, i) => {
      const ocup = ocupantes(cuadrante).filter((x) => x.ref.t === i).length
      return { turno: t.id, ocupadas: ocup }
    }).filter((x) => x.ocupadas < CRUZ_MINIMO_SIN_AVISO)
  }, [pieza, cuadrante])

  // =============================================================
  //  OPERACIONES
  // =============================================================

  const setCuadrante = (nuevo) => onCambiar({ [campoCuadrante]: nuevo })

  const aplicar = (resultado) => {
    if (resultado.error) return avisar(resultado.error, 'error')
    setCuadrante(resultado.cuadrante)
  }

  const generar = ({ numTurnos, config, algoritmo }) => {
    const lista = candidatos.map(comoOcupante)
    const { cuadrante: generado, avisos } = generarConAvisos(lista, {
      numTurnos,
      config,
      algoritmo,
      cuadranteAnterior: cuadrante,
      modo: pieza === 'cruz' ? 'parejas' : 'u',
      pieza,
      censoPorId,
      // La cruz no usa repetidores automáticos
      rellenarConAnterior: pieza !== 'cruz',
    })

    // Corrección de hombros justo después de generar
    const rh = corregirHombros(generado, censoPorId)
    const nuevo = rh.cuadrante

    const cambios = { [campoCuadrante]: nuevo }
    if (pieza === 'cruz') {
      cambios.config_cruz = config
      cambios.turnos_cruz = numTurnos
    } else {
      cambios.config_trono = config
      cambios.turnos_trono = numTurnos
      cambios.algoritmo = algoritmo    // recordamos el último usado
    }

    onCambiar(cambios)
    setModalGenerar(null)

    // Mensaje final
    const partes = []
    if (avisos.length) {
      const faltan = avisos.reduce((n, a) => n + a.faltan, 0)
      partes.push(`faltan ${faltan} costalero(s) en ${avisos.map((a) => `Turno ${a.turno}`).join(', ')}`)
    }
    if (rh.corregidos) partes.push(`${rh.corregidos} hombro(s) corregidos`)
    if (rh.sinResolver.length) partes.push(`${rh.sinResolver.length} hombro(s) sin resolver`)

    const base = pieza === 'cruz'
      ? 'Cruz Guía: cuadrante generado'
      : `Trono: cuadrante generado con el ${ALGORITMOS[algoritmo].nombre}`

    avisar(
      partes.length ? `${base} · ${partes.join(' · ')}.` : `${base}.`,
      avisos.length || rh.sinResolver.length ? 'error' : 'exito'
    )
  }

  // --- Limpiar un turno ---
  const limpiar = (t) => {
    if (!cuadrante) return
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
    setCuadrante(r.cuadrante)
    avisar(`Turno ${cuadrante[t].id} vaciado: ${r.quitados} quitado(s)${r.conservados ? `, ${r.conservados} bloqueado(s) conservado(s)` : ''}.`)
  }

  // --- Rellenar con repetidores (solo trono) ---
  const meterRepetidores = () => {
    if (!cuadrante) return
    const r = rellenarConRepetidores(cuadrante, censoPorId)
    if (!r.metidos) return avisar('No hay repetidores disponibles para los huecos.', 'error')
    setCuadrante(r.cuadrante)
    avisar(`${r.metidos} repetidor(es) colocados.`)
  }

  // --- Comprobar y corregir hombros a mano ---
  const revisarHombros = () => {
    if (!cuadrante) return
    const r = corregirHombros(cuadrante, censoPorId)

    if (!r.corregidos && !r.sinResolver.length) {
      return avisar('Todos los costaleros llevan el hombro correcto.')
    }

    if (r.corregidos) setCuadrante(r.cuadrante)

    const partes = []
    if (r.corregidos) partes.push(`${r.corregidos} corregido(s)`)
    if (r.sinResolver.length) partes.push(`${r.sinResolver.length} sin resolver`)

    avisar(
      `Hombros: ${partes.join(' · ')}.`,
      r.sinResolver.length ? 'error' : 'exito'
    )
  }

  // --- Rellenar cruz con los más parejos en altura ---
  const completarCruz = () => {
    if (!cuadrante) return

    const pool = paraRellenarCruz.todos.map(comoOcupante)
    if (!pool.length) {
      return avisar(
        'No hay candidatos: todos los de cruz están colocados y no queda nadie fuera del trono.',
        'error'
      )
    }

    const r = rellenarCruz(cuadrante, pool)
    if (r.error) return avisar(r.error, 'error')
    setCuadrante(r.cuadrante)
    avisar(`${r.metidos} costalero(s) añadidos a la cruz.`)
  }

  // =============================================================
  //  RENDER
  // =============================================================

  return (
    <div className="space-y-5">

      {/* ---- Selector de pieza ---- */}
      {llevaCruz && (
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {['trono', 'cruz'].map((p) => {
            const info = PIEZAS[p]
            const cuad = p === 'cruz' ? procesion.cuadrante_cruz : procesion.cuadrante_trono
            const n = cuad ? ocupantes(cuad).length : 0
            return (
              <button
                key={p}
                onClick={() => setPieza(p)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition flex items-center gap-2 ${
                  pieza === p ? 'bg-white text-morado shadow-sm' : 'text-slate-600 hover:text-morado'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${info.punto}`} />
                {info.nombre}
                <span className="text-xs text-slate-400">({n})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ---- Barra de control ---- */}
      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className={`chip ${PIEZAS[pieza].chip}`}>
            {candidatos.length} disponible(s) en el censo
          </span>
          {stats && (
            <>
              <span className="text-slate-500">
                {stats.turnos} turno(s) · {stats.ocupadas}/{stats.plazas} plazas
              </span>
              {stats.libres > 0 && (
                <span className="chip bg-amber-100 text-amber-800">
                  {stats.libres} hueco(s)
                </span>
              )}
              {stats.bloqueadas > 0 && (
                <span className="chip bg-morado/10 text-morado">🔒 {stats.bloqueadas}</span>
              )}
              {statsHombro?.mal > 0 && (
                <span className="chip bg-red-100 text-red-700 animate-pulse-fast">
                  ⚠️ {statsHombro.mal} hombro(s) mal
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {cuadrante && (
            <button
              onClick={() => setMapaCalor((m) => !m)}
              className={mapaCalor ? 'btn-oro text-xs' : 'btn-ghost text-xs'}
              title="Colorea a cada costalero según los kilos que soporta"
            >
              {mapaCalor ? '🔥 Mapa de peso: ON' : '🧊 Mapa de peso'}
            </button>
          )}

          {!soloLectura && (
            <>
            {cuadrante && (
              <button
                onClick={revisarHombros}
                className="btn-ghost text-xs"
                title="Comprueba que cada costalero lleve el hombro que le corresponde"
              >
                💪 Comprobar hombros
              </button>
            )}
            {cuadrante && pieza === 'trono' && stats.libres > 0 && (
              <button onClick={meterRepetidores} className="btn-ghost text-xs">
                🔁 Rellenar con repetidores
              </button>
            )}
            {cuadrante && pieza === 'cruz' && stats.libres > 0 && (
              <button
                onClick={completarCruz}
                className="btn-ghost text-xs"
                title={`${paraRellenarCruz.titulares.length} de cruz sin colocar · ${paraRellenarCruz.sueltos.length} fuera del trono`}
              >
                ✚ Rellenar cruz ({paraRellenarCruz.todos.length})
              </button>
            )}
            {cuadrante && (
              <>
                <button
                  onClick={() => setCuadrante(anadirTurno(
                    cuadrante,
                    pieza === 'cruz' ? configCruz() : configPorDefecto(),
                    pieza
                  ))}
                  className="btn-ghost text-xs"
                >
                  + Turno
                </button>
                <button
                  onClick={() => aplicar(quitarTurno(cuadrante))}
                  className="btn-ghost text-xs"
                >
                  − Turno
                </button>
              </>
            )}
            <button
              onClick={() => setModalGenerar(pieza)}
              className="btn-morado text-xs"
            >
              {cuadrante ? '🔄 Regenerar' : '⚙️ Generar turnos'}
            </button>
            </>
          )}
        </div>
      </div>

      {/* ---- Leyenda del mapa de calor ---- */}
      {mapaCalor && cuadrante && (
        <div className="card p-3">
          <LeyendaCalor stats={estadisticasTurno(cuadrante[0], pieza)} />
          <p className="text-[11px] text-slate-500 mt-2">
            La vara flexiona unos {FLEXION_VARA_CM} cm. Quien esté por debajo de esa
            diferencia respecto al más alto de su vara no llega a tocarla.
          </p>
        </div>
      )}

      {/* ---- Avisos ---- */}
      {pieza === 'cruz' && avisosCruz.length > 0 && (
        <Alerta tipo="aviso">
          Estos turnos de cruz tienen menos de {CRUZ_MINIMO_SIN_AVISO} costaleros:{' '}
          <b>{avisosCruz.map((a) => `${a.turno} (${a.ocupadas})`).join(', ')}</b>.
          Con {CRUZ_MINIMO_SIN_AVISO} o más no hay problema para portarla.
        </Alerta>
      )}

      {pieza === 'cruz' && aptosCruz.length === 0 && (
        <Alerta tipo="aviso">
          No hay nadie marcado como <b>Cruz {procesion.tipo === 'viernes' ? 'Viernes' : 'Miércoles'}</b> en
          el censo. Márcalos desde el módulo de Censo, o usa «Rellenar cruz» para
          completarla con gente del trono.
        </Alerta>
      )}

      {/* ---- Cuadrante ---- */}
      {!cuadrante ? (
        <div className="card">
          <Vacio
            icono="⚙️"
            titulo={`Sin turnos de ${PIEZAS[pieza].nombre.toLowerCase()}`}
            texto={
              candidatos.length === 0
                ? 'No hay costaleros disponibles en el censo para esta procesión.'
                : `Genera los turnos y se repartirán los ${candidatos.length} costaleros disponibles.`
            }
          >
            {!soloLectura && candidatos.length > 0 && (
              <button onClick={() => setModalGenerar(pieza)} className="btn-oro">
                ⚙️ Generar turnos
              </button>
            )}
          </Vacio>
        </div>
      ) : (
        <Trono
          cuadrante={cuadrante}
          conflictivas={marcasConHombro}
          hombros={hombros}
          censoPorId={censoPorId}
          soloLectura={soloLectura}
          mapaCalor={mapaCalor}
          pieza={pieza}
          etiquetaTurno={(turno) => {
            const tramos = (procesion.tramos || []).filter((t) =>
              String(pieza === 'cruz' ? t.turno_cruz : t.turno_trono) === String(turno.id)
            )
            if (!tramos.length) {
              return (
                <span className="chip bg-red-500/20 text-red-100 border border-red-400/40">
                  Sin tramo asignado
                </span>
              )
            }
            return (
              <span className="chip bg-white/10 text-oro-light border border-oro/30">
                {tramos.length} tramo{tramos.length === 1 ? '' : 's'}: {tramos.map((t) => t.nombre).join(', ')}
              </span>
            )
          }}
          onIntercambiar={(a, b) => aplicar(intercambiar(cuadrante, a, b))}
          onQuitar={(ref) => aplicar(quitarDe(cuadrante, ref))}
          onBloquear={(ref) => aplicar(alternarBloqueo(cuadrante, ref))}
          onPedirCostalero={(ref) => setHueco({ pieza, ref })}
          onAnadirHueco={(t, vara, sec) => setCuadrante(anadirHueco(cuadrante, t, vara, sec))}
          onQuitarHueco={(t, vara, sec) => aplicar(quitarHueco(cuadrante, t, vara, sec))}
          onLimpiarTurno={limpiar}
          onInfoCostalero={setInfoPersona}
        />
      )}

      {/* ---- Modales ---- */}
      <ModalGenerar
        pieza={modalGenerar}
        numCandidatos={candidatos.length}
        configActual={modalGenerar === 'cruz' ? procesion.config_cruz : procesion.config_trono}
        turnosActuales={modalGenerar === 'cruz' ? procesion.turnos_cruz : procesion.turnos_trono}
        algoritmoActual={procesion.algoritmo || ALGORITMO_POR_DEFECTO}
        hayBloqueos={stats?.bloqueadas > 0}
        onCerrar={() => setModalGenerar(null)}
        onGenerar={generar}
      />

      <ModalRellenarHueco
        hueco={hueco}
        censo={pieza === 'cruz' ? [...aptosCruz, ...paraRellenarCruz.sueltos] : aptosTrono}
        yaColocados={cuadrante ? idsColocados(cuadrante) : new Set()}
        onCerrar={() => setHueco(null)}
        onElegir={(persona) => {
          aplicar(colocarEn(cuadrante, hueco.ref, persona))
          setHueco(null)
        }}
      />

      <ModalOrdenProcesional
        persona={infoPersona}
        procesion={procesion}
        conflictos={conflictos}
        soloLectura={soloLectura}
        onCerrar={() => setInfoPersona(null)}
        onCambiar={onCambiar}
      />
    </div>
  )
}

// =============================================================
//  MODAL: GENERAR
// =============================================================

function ModalGenerar({
  pieza, numCandidatos, configActual, turnosActuales, algoritmoActual,
  hayBloqueos, onCerrar, onGenerar,
}) {
  const [numTurnos, setNumTurnos] = useState(3)
  const [config, setConfig] = useState(configPorDefecto())
  const [algoritmo, setAlgoritmo] = useState(ALGORITMO_POR_DEFECTO)

  // Sincronizamos al abrir
  const [ultimaPieza, setUltimaPieza] = useState(null)
  if (pieza && pieza !== ultimaPieza) {
    setUltimaPieza(pieza)
    const base = configActual || (pieza === 'cruz' ? configCruz() : configPorDefecto())
    setConfig(JSON.parse(JSON.stringify(base)))
    setNumTurnos(turnosActuales || 3)
    setAlgoritmo(algoritmoActual || ALGORITMO_POR_DEFECTO)
  }
  if (!pieza) {
    if (ultimaPieza) setUltimaPieza(null)
    return null
  }

  const info = PIEZAS[pieza]
  const varas = varasDe(config)
  const plazas = plazasTotales(config)
  const capacidad = plazas * numTurnos

  const setVara = (vara, seccion, valor) => {
    const n = Math.max(0, Math.min(20, Number(valor) || 0))
    setConfig((c) => ({ ...c, [vara]: { ...c[vara], [seccion]: n } }))
  }

  return (
    <Modal abierto={!!pieza} onCerrar={onCerrar} titulo={`Generar turnos · ${info.nombre}`} ancho="max-w-2xl">
      <div className="space-y-5">
        <Alerta tipo="info">
          {pieza === 'cruz' ? (
            <>Se repartirán buscando que los <b>4 de delante</b> tengan alturas parecidas
            entre sí, y lo mismo los <b>4 de detrás</b>.</>
          ) : (
            <>
              Reparto por bloques de altura: el <b>Turno A</b> se lleva a los {plazas} más
              altos, y los siguientes turnos van cogiendo bloques del mismo tamaño.
              Si al último turno le faltan costaleros, se completan con los <b>más bajos
              del turno anterior</b>, marcados con <b>(R)</b> en amarillo.
            </>
          )}
        </Alerta>

        {/* La cruz tiene su propia lógica de parejas: aquí no aplica */}
        {pieza !== 'cruz' && (
          <SelectorAlgoritmo valor={algoritmo} onCambiar={setAlgoritmo} />
        )}

        {hayBloqueos && (
          <Alerta tipo="aviso">
            Hay posiciones <b>bloqueadas</b>. Se mantendrán tal cual al regenerar.
          </Alerta>
        )}

        <div>
          <label className="label">Número de turnos</label>
          <input
            type="number" min={1} max={12} className="input w-24"
            value={numTurnos}
            onChange={(e) => setNumTurnos(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>

        <div>
          <label className="label">Costaleros por vara</label>
          <div className={`grid gap-3 ${varas.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {varas.map((v) => (
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
            onClick={() => setConfig(pieza === 'cruz' ? configCruz() : configPorDefecto())}
            className="btn-ghost text-xs mt-2"
          >
            Restaurar estándar
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-morado">{numCandidatos}</p>
            <p className="text-xs text-slate-500 mt-0.5">Disponibles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-morado">{plazas}</p>
            <p className="text-xs text-slate-500 mt-0.5">Plazas por turno</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${capacidad > numCandidatos ? 'text-amber-600' : 'text-emerald-600'}`}>
              {capacidad}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Capacidad total</p>
          </div>
        </div>

        {capacidad > numCandidatos && (
          <Alerta tipo="aviso">
            Faltan <b>{capacidad - numCandidatos}</b> costalero(s) para llenar todos los turnos.
            {pieza === 'trono'
              ? ' Se completarán con los más bajos del turno anterior, marcados con (R).'
              : ' Quedarán huecos libres que podrás rellenar a mano.'}
          </Alerta>
        )}

        <div className="flex gap-2 justify-end">
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
//  MODAL: RELLENAR UN HUECO
// =============================================================

function ModalRellenarHueco({ hueco, censo, yaColocados, onCerrar, onElegir }) {
  const [texto, setTexto] = useState('')

  if (!hueco) return null

  const q = normalizar(texto)
  const lista = censo
    .filter((c) => !q || normalizar(c.nombre).includes(q))
    .slice(0, 40)

  const ref = hueco.ref
  const seccion = ref.seccion === 'Detras' ? 'Detrás' : 'Delante'
  const etiqueta = etiquetaTurno(ref.t, hueco.pieza)

  return (
    <Modal
      abierto={!!hueco}
      onCerrar={onCerrar}
      titulo={`Turno ${etiqueta} · ${ref.vara} · ${seccion} #${ref.i + 1}`}
    >
      <input
        className="input mb-4" autoFocus
        value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar costalero…"
      />

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {lista.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin resultados.</p>
        ) : (
          lista.map((c) => {
            const puesto = yaColocados.has(c.id)
            return (
              <button
                key={c.id}
                onClick={() => onElegir(comoOcupante(c))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border
                           border-slate-200 hover:border-oro hover:bg-oro/5 transition text-left"
              >
                <span className="flex-1 min-w-0 truncate font-medium text-sm">{c.nombre}</span>
                {puesto && (
                  <span className="chip bg-amber-100 text-amber-800 shrink-0">Ya colocado</span>
                )}
                <span className="text-xs text-slate-400 shrink-0">{c.altura} cm</span>
              </button>
            )
          })
        )}
      </div>
    </Modal>
  )
}
