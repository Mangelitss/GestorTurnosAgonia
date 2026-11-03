// =============================================================
//  PORTAL DEL COSTALERO
//
//  Web del Tercio del Santisimo Cristo de la Agonia y Maria
//  Magdalena. Se entra con el codigo del tercio, sin cuenta.
//  Solo muestra lo que el cuadrillero ha publicado desde el panel
//  (modulo "Web costaleros"), y solo mientras la tenga visible.
//
//  Pensada sobre todo para el movil: lo primero que se ve son los
//  avisos, las horas y el buscador; la barra de apartados se queda
//  fija arriba al bajar; y el cuadrante se ve turno a turno.
// =============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  leerPortal, claveRecordada, recordarClave, personasDe,
} from './lib/datos'
import { TIPOS_PROCESION, PIEZAS } from '@nucleo/constantes'
import { marcasDe } from '@nucleo/portal'
import { ocupantes } from '@nucleo/cuadrante'
import { fechaLarga, fechaCorta, normalizar } from './lib/texto'
import PantallaCodigo from './components/PantallaCodigo'
import Buscador from './components/Buscador'
import FichaCostalero from './components/FichaCostalero'
import FichaEnsayo from './components/FichaEnsayo'
import CuadranteTurno from './components/CuadranteTurno'
import Recorrido from './components/Recorrido'
import InfoPublicacion, { TenerEnCuenta } from './components/InfoPublicacion'
import Leyenda from './components/Leyenda'
import { Cargando, Aviso, Vacio } from './components/ui'

// Se recuerda el NOMBRE, no el id: los ids cambian de una
// publicacion a otra (son seudonimos), el nombre no.
const CLAVE_NOMBRE = 'agonia.costalero'

function nombreRecordado() {
  try { return localStorage.getItem(CLAVE_NOMBRE) || null } catch { return null }
}
function recordarNombre(nombre) {
  try {
    nombre ? localStorage.setItem(CLAVE_NOMBRE, nombre) : localStorage.removeItem(CLAVE_NOMBRE)
  } catch { /* modo privado */ }
}

// Al volver a la web (desbloquear el movil, cambiar de app...) se
// vuelve a leer si han pasado mas de estos minutos. Es una lectura.
const REFRESCO_MS = 2 * 60 * 1000

export default function App() {
  const [estado, setEstado] = useState('comprobando')   // comprobando | codigo | dentro | error
  const [portal, setPortal] = useState(null)

  const [seleccion, setSeleccion] = useState(null)
  const [apartado, setApartado] = useState('mia')       // mia | cuadrante | recorrido
  const [miNombre, setMiNombre] = useState(nombreRecordado)

  const leidoEn = useRef(0)

  const entrar = useCallback((p) => {
    leidoEn.current = Date.now()
    setPortal(p)
    // Si lo que estaba seleccionado sigue publicado, se mantiene
    setSeleccion((actual) =>
      p.publicaciones?.some((x) => x.id === actual) ? actual : p.publicaciones?.[0]?.id || null
    )
    setEstado('dentro')
  }, [])

  // ---- Si este movil ya entro antes, se prueba la clave guardada ----
  const cargarRecordado = useCallback(async () => {
    const clave = claveRecordada()
    if (!clave) { setEstado('codigo'); return }
    try {
      const p = await leerPortal(clave)
      if (p) entrar(p)
      else { recordarClave(null); setPortal(null); setEstado('codigo') }   // codigo cambiado o web oculta
    } catch {
      setEstado((e) => (e === 'dentro' ? e : 'error'))   // sin red: se queda lo que habia
    }
  }, [entrar])

  useEffect(() => { cargarRecordado() }, [cargarRecordado])

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return
      if (estado !== 'dentro') return
      if (Date.now() - leidoEn.current < REFRESCO_MS) return
      cargarRecordado()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [estado, cargarRecordado])

  function salir() {
    recordarClave(null)
    setPortal(null)
    setEstado('codigo')
  }

  const publicaciones = portal?.publicaciones || []
  const pub = publicaciones.find((p) => p.id === seleccion) || null

  const personas = useMemo(() => personasDe(pub), [pub])
  const marcas = useMemo(() => marcasDe(pub), [pub])

  const yo = useMemo(() => {
    if (!miNombre) return null
    const n = normalizar(miNombre)
    return personas.find((p) => normalizar(p.nombre) === n) || null
  }, [personas, miNombre])

  function elegir(persona) {
    setMiNombre(persona.nombre)
    recordarNombre(persona.nombre)
  }

  function olvidar() {
    setMiNombre(null)
    recordarNombre(null)
  }

  return (
    <div className="min-h-screen px-3 pb-6 pt-[max(1rem,env(safe-area-inset-top))]
                    pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]
                    sm:px-4 sm:py-10">
      <Cabecera />

      <main className="folio">
        {estado === 'comprobando' ? (
          <Cargando />
        ) : estado === 'error' ? (
          <div className="seccion space-y-4">
            <Aviso tipo="error">
              No se ha podido conectar con la Mayordomía. Comprueba que tienes
              conexión y vuelve a intentarlo.
            </Aviso>
            <button onClick={() => { setEstado('comprobando'); cargarRecordado() }} className="btn-linea w-full">
              Reintentar
            </button>
          </div>
        ) : estado === 'codigo' ? (
          <PantallaCodigo
            onEntrar={({ clave, portal: p }) => { recordarClave(clave); entrar(p) }}
          />
        ) : (
          <>
            {publicaciones.length > 1 && (
              <Pestanas
                publicaciones={publicaciones}
                seleccion={seleccion}
                onSeleccionar={(v) => { setSeleccion(v); setApartado('mia') }}
              />
            )}

            {!pub ? (
              <div className="seccion">
                <Vacio
                  icono="—"
                  titulo="Todavía no hay nada publicado"
                  texto="Cuando el cuadrillero publique los turnos, aparecerán aquí."
                />
              </div>
            ) : (
              <Publicacion
                key={pub.id}
                pub={pub}
                personas={personas}
                marcas={marcas}
                yo={yo}
                apartado={apartado}
                onApartado={setApartado}
                onElegir={elegir}
                onOlvidar={olvidar}
              />
            )}
          </>
        )}
      </main>

      <Pie onSalir={estado === 'dentro' ? salir : null} />
    </div>
  )
}

// =============================================================
//  CABECERA
// =============================================================
function Cabecera() {
  return (
    <header className="mx-auto mb-4 max-w-3xl text-center sm:mb-6">
      <h1 className="font-titulo text-[13px] font-bold uppercase leading-snug
                     tracking-[0.06em] text-oro sm:text-lg sm:tracking-[0.08em]">
        Muy Ilustre Mayordomía de<br className="sm:hidden" /> Ntro. Padre Jesús Nazareno
      </h1>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-oro-light/60 sm:mt-2 sm:text-[13px]">
        Tercio del Cristo de la Agonía
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-oro-light/35 sm:text-[11px]">
        y María Magdalena · Orihuela
      </p>
    </header>
  )
}

// =============================================================
//  PESTAÑAS: una por procesion o ensayo publicado
//  En el movil se deslizan en horizontal si no caben.
// =============================================================
function etiquetaPestana(p) {
  if (p.clase === 'ensayo') return { texto: 'Ensayo', extra: fechaCorta(p.fecha_iso) }
  return { texto: TIPOS_PROCESION[p.tipo]?.corto || p.nombre, extra: p.anio }
}

function Pestanas({ publicaciones, seleccion, onSeleccionar }) {
  return (
    <nav className="sin-barra flex gap-2 overflow-x-auto border-b border-oro/25 bg-morado-black/50 p-2.5 sm:flex-wrap sm:p-3">
      {publicaciones.map((p) => {
        const { texto, extra } = etiquetaPestana(p)
        return (
          <button
            key={p.id}
            onClick={() => onSeleccionar(p.id)}
            className={`pestana shrink-0 ${seleccion === p.id ? 'pestana-activa' : ''}`}
          >
            {texto}
            {extra && <span className="ml-1 opacity-60">{extra}</span>}
          </button>
        )
      })}
    </nav>
  )
}

// =============================================================
//  UNA PROCESION O UN ENSAYO
// =============================================================
function Publicacion({ pub, personas, marcas, yo, apartado, onApartado, onElegir, onOlvidar }) {
  const esEnsayo = pub.clase === 'ensayo'
  // Marca invisible justo encima de la barra. La barra pegada siempre
  // dice top = 0; la marca dice donde estaria si no lo estuviera.
  const marca = useRef(null)
  const primeraVez = useRef(true)

  const apartados = [
    { id: 'mia', texto: yo ? 'Lo mío' : 'Búscate' },
    { id: 'cuadrante', texto: 'Cuadrante' },
    ...(esEnsayo ? [] : [{ id: 'recorrido', texto: 'Recorrido' }]),
  ]

  // Si se cambia de apartado con la barra ya pegada arriba, se sube
  // al principio del contenido nuevo en vez de dejarte a media pagina.
  // Va despues de pintar: el contenido nuevo puede ser mas corto.
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return }
    const el = marca.current
    if (!el) return
    const arriba = el.getBoundingClientRect().top + window.scrollY
    if (window.scrollY > arriba) window.scrollTo({ top: arriba })
  }, [apartado])

  return (
    <>
      <div className="seccion space-y-3.5 pb-3.5 sm:pb-4">
        <div className="text-center">
          <h2 className="font-titulo text-lg font-bold uppercase leading-tight tracking-wide text-crema sm:text-xl">
            {pub.nombre}
          </h2>
          {pub.fecha_iso && (
            <p className="mt-1 text-[13px] text-oro-light/60 sm:text-sm">{fechaLarga(pub.fecha_iso)}</p>
          )}
        </div>

        <InfoPublicacion pub={pub} />
        {esEnsayo && <TenerEnCuenta texto={pub.info?.tener_en_cuenta} />}
      </div>

      {/* ---- Apartados: se quedan fijos arriba al bajar ---- */}
      <div ref={marca} aria-hidden="true" />
      <div
        className="sticky top-0 z-20 border-y border-oro/20 bg-morado-deep/95 px-3 py-2
                   pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur sm:px-7"
      >
        <div className="flex gap-1.5 rounded-lg bg-morado-black/60 p-1">
          {apartados.map((a) => (
            <button
              key={a.id}
              onClick={() => onApartado(a.id)}
              className={`min-h-[42px] flex-1 whitespace-nowrap rounded-md px-1 text-[12px] font-bold
                          uppercase tracking-wide transition-colors min-[360px]:px-2 min-[360px]:text-[13px] ${
                            apartado === a.id
                              ? 'bg-morado text-oro-light shadow'
                              : 'text-oro-light/50 active:bg-morado/40'
                          }`}
            >
              {a.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="seccion pt-4 sm:pt-5">
        {apartado === 'mia' && (
          !yo ? (
            <Buscador personas={personas} onElegir={onElegir} />
          ) : esEnsayo ? (
            <FichaEnsayo ensayo={pub} persona={yo} marcas={marcas} onCambiar={onOlvidar} />
          ) : (
            <FichaCostalero procesion={pub} persona={yo} marcas={marcas} onCambiar={onOlvidar} />
          )
        )}

        {apartado === 'cuadrante' && (
          <CuadranteCompleto pub={pub} marcas={marcas} resaltarId={yo?.id || null} />
        )}

        {apartado === 'recorrido' && !esEnsayo && <Recorrido procesion={pub} />}
      </div>
    </>
  )
}

// =============================================================
//  CUADRANTE: UN TURNO CADA VEZ
//
//  Entero, en el movil, eran diez pantallas de scroll. Se elige el
//  turno arriba; de entrada se abre el tuyo si ya te has buscado.
// =============================================================
function CuadranteCompleto({ pub, marcas, resaltarId }) {
  const grupos = useMemo(() => (pub.clase === 'ensayo'
    ? [{ pieza: 'trono', titulo: 'Turno', cuadrante: pub.cuadrante }]
    : [
        { pieza: 'trono', titulo: PIEZAS.trono.nombre, cuadrante: pub.cuadrante_trono },
        { pieza: 'cruz', titulo: 'Cruz', cuadrante: pub.lleva_cruz ? pub.cuadrante_cruz : null },
      ]
  ).filter((g) => Array.isArray(g.cuadrante) && g.cuadrante.length > 0), [pub])

  // Turnos en los que voy yo:  "trono-A", "cruz-1"...
  const mios = useMemo(() => {
    const s = new Set()
    if (!resaltarId) return s
    grupos.forEach(({ pieza, cuadrante }) => {
      ocupantes(cuadrante).forEach(({ ref, p }) => {
        if (p.costalero_id === resaltarId) s.add(`${pieza}-${cuadrante[ref.t].id}`)
      })
    })
    return s
  }, [grupos, resaltarId])

  const primero = grupos[0] ? `${grupos[0].pieza}-${grupos[0].cuadrante[0].id}` : null
  const [elegido, setElegido] = useState(() => [...mios][0] || primero)

  if (!grupos.length) {
    return (
      <Vacio
        icono="—"
        titulo="Cuadrante sin generar"
        texto="Todavía no se han repartido los turnos."
      />
    )
  }

  const [piezaSel, turnoSel] = String(elegido).split('-')
  const grupo = grupos.find((g) => g.pieza === piezaSel) || grupos[0]
  const turno = grupo.cuadrante.find((t) => String(t.id) === turnoSel) || grupo.cuadrante[0]

  return (
    <div className="animate-subir space-y-4">
      {/* ---- Selector de turno ---- */}
      <div className="space-y-2">
        {grupos.map(({ pieza, titulo, cuadrante }) => (
          <div key={pieza} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wide text-oro-light/50">
              {titulo}
            </span>
            <div className="sin-barra flex flex-1 gap-1.5 overflow-x-auto">
              {cuadrante.map((t) => {
                const clave = `${pieza}-${t.id}`
                const activo = grupo.pieza === pieza && turno.id === t.id
                const mio = mios.has(clave)
                return (
                  <button
                    key={clave}
                    onClick={() => setElegido(clave)}
                    className={`relative h-10 min-w-[44px] shrink-0 rounded-lg border px-3 text-sm font-bold
                                transition-colors ${
                                  activo
                                    ? pieza === 'cruz'
                                      ? 'border-sky-400 bg-sky-500 text-white'
                                      : 'border-oro bg-oro text-morado-black'
                                    : 'border-morado-light/40 text-oro-light/70 active:bg-morado/40'
                                }`}
                  >
                    {t.id}
                    {mio && (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-oro ring-2 ring-morado-deep"
                            title="Vas en este turno" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Leyenda marcas={marcas} conYo={!!resaltarId} />

      <CuadranteTurno
        key={`${grupo.pieza}-${turno.id}`}
        turno={turno}
        pieza={grupo.pieza}
        resaltarId={resaltarId}
        marcas={marcas}
      />

      {resaltarId && mios.size === 0 && (
        <p className="text-center text-xs text-oro-light/40">No apareces en ningún turno.</p>
      )}
    </div>
  )
}

// =============================================================
//  PIE
// =============================================================
function Pie({ onSalir }) {
  return (
    <footer className="mx-auto mt-6 max-w-3xl px-2 pb-[env(safe-area-inset-bottom)] text-center sm:mt-8">
      <p className="text-[11px] leading-relaxed text-oro-light/30">
        Cuadrante oficial publicado por el cuadrillero del tercio.
        <br />
        Ante cualquier duda, habla con él antes del día de la procesión.
      </p>
      {onSalir && (
        <button
          onClick={onSalir}
          className="mt-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-oro-light/40
                     underline-offset-4 hover:text-oro-light hover:underline"
        >
          Salir de este móvil
        </button>
      )}
    </footer>
  )
}
