// =============================================================
//  PORTAL DEL COSTALERO
//
//  Web del Tercio del Santisimo Cristo de la Agonia y Maria
//  Magdalena. Se entra con el codigo del tercio, sin cuenta.
//  Solo muestra lo que el cuadrillero ha publicado desde el panel
//  (modulo "Web costaleros"), y solo mientras la tenga visible.
//
//  Pensada para el movil: lo primero que se ve son los avisos, las
//  horas y el buscador; los apartados van abajo, al alcance del
//  pulgar; y el cuadrante se ve turno a turno.
// =============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import Toques from './components/Toques'
import { Cargando, Aviso, Vacio, Cruz, Filete } from './components/ui'

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

// Pestaña fija de los toques del llamador
const TOQUES = 'toques'

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
    // Si lo que estaba seleccionado sigue publicado, se mantiene.
    // Los toques siempre estan; sin nada publicado, se abren ellos.
    setSeleccion((actual) => {
      if (actual === TOQUES) return actual
      if (p.publicaciones?.some((x) => x.id === actual)) return actual
      return p.publicaciones?.[0]?.id || TOQUES
    })
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

  const conBarra = estado === 'dentro' && !!pub

  return (
    <div className={`min-h-dvh px-3 pt-[max(1.25rem,env(safe-area-inset-top))]
                     pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]
                     ${conBarra ? 'pb-[calc(76px+env(safe-area-inset-bottom))]' : 'pb-6'}`}>
      <Cabecera />

      <main className="folio animate-subir" style={{ animationDelay: '250ms' }}>
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
            <Pestanas
              publicaciones={publicaciones}
              seleccion={seleccion}
              onSeleccionar={(v) => {
                setSeleccion(v)
                setApartado('mia')
                // Cada pestaña empieza desde arriba del todo
                window.scrollTo(0, 0)
              }}
            />

            {seleccion === TOQUES ? (
              <Toques />
            ) : !pub ? (
              <div className="seccion">
                <Vacio
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
//  La cruz con luz de vela y, debajo, el nombre de la Mayordomia.
//  Queda sobre la imagen, sin recuadro, para que se vea el Cristo.
// =============================================================
function Cabecera() {
  return (
    <header className="mx-auto mb-5 max-w-xl pt-2 text-center">
      <div className="relative mx-auto mb-2 flex h-[54px] w-[54px] animate-aparecer items-center justify-center text-oro-pale">
        <span
          className="absolute -inset-3 animate-vela rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,208,140,0.34), rgba(232,208,140,0) 68%)' }}
          aria-hidden="true"
        />
        <Cruz tam={46} className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
      </div>

      <h1 className="animate-subir font-titulo text-[13.5px] font-semibold uppercase leading-snug
                     tracking-[0.08em] text-oro-pale [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
        Muy Ilustre Mayordomía de<br />Ntro. Padre Jesús Nazareno
      </h1>

      <Filete className="mx-auto my-2.5 max-w-[220px]" />

      <p className="animate-subir font-texto text-[18px] leading-tight text-crema
                    [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]" style={{ animationDelay: '120ms' }}>
        Tercio del Santísimo Cristo de la Agonía
      </p>
      <p className="animate-subir font-texto text-[15px] italic text-oro-light/80
                    [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]" style={{ animationDelay: '200ms' }}>
        y María Magdalena · Orihuela
      </p>
    </header>
  )
}

// =============================================================
//  PESTAÑAS: una por procesion o ensayo publicado
//  En el movil, si no caben, pasan a una segunda fila: asi se
//  ven todas, tambien la de los toques, que va la ultima.
// =============================================================
function etiquetaPestana(p) {
  if (p.clase === 'ensayo') return { texto: 'Ensayo', extra: fechaCorta(p.fecha_iso) }
  return { texto: TIPOS_PROCESION[p.tipo]?.corto || p.nombre, extra: p.anio }
}

function Pestanas({ publicaciones, seleccion, onSeleccionar }) {
  return (
    <nav className="flex flex-wrap justify-center border-b border-oro/30 bg-morado-black/60 px-1">
      {publicaciones.map((p) => {
        const { texto, extra } = etiquetaPestana(p)
        return (
          <button
            key={p.id}
            onClick={() => onSeleccionar(p.id)}
            className={`pestana ${seleccion === p.id ? 'pestana-activa' : ''}`}
          >
            {texto}
            {extra && <span className="ml-1.5 opacity-60">{extra}</span>}
          </button>
        )
      })}
      <button
        onClick={() => onSeleccionar(TOQUES)}
        className={`pestana ${seleccion === TOQUES ? 'pestana-activa' : ''}`}
      >
        Toques
      </button>
    </nav>
  )
}

// =============================================================
//  UNA PROCESION O UN ENSAYO
// =============================================================
const ICONOS_APARTADO = {
  mia: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5v-1a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6v1',
  cuadrante: 'M4 4h16v16H4V4ZM4 12h16M9.5 4v16M14.5 4v16',
  recorrido: 'M6.5 20.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17.5 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6.5 16.5V9a3.5 3.5 0 0 1 3.5-3.5h5.5M17.5 7.5V15a3.5 3.5 0 0 1-3.5 3.5H8.5',
}

function Publicacion({ pub, personas, marcas, yo, apartado, onApartado, onElegir, onOlvidar }) {
  const esEnsayo = pub.clase === 'ensayo'
  // Marca invisible justo encima del contenido de cada apartado
  const marca = useRef(null)
  const primeraVez = useRef(true)

  const apartados = [
    { id: 'mia', texto: yo ? 'Lo mío' : 'Búscate' },
    { id: 'cuadrante', texto: 'Cuadrante' },
    ...(esEnsayo ? [] : [{ id: 'recorrido', texto: 'Recorrido' }]),
  ]
  const indice = Math.max(0, apartados.findIndex((a) => a.id === apartado))

  // Si se cambia de apartado estando abajo, se sube al principio del
  // contenido nuevo en vez de dejarte a media pagina.
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
      <div className="seccion space-y-4 pb-4">
        <div className="animate-subir text-center">
          <h2 className="font-titulo text-[20px] font-semibold uppercase leading-tight tracking-[0.06em] text-crema">
            {pub.nombre}
          </h2>
          {pub.fecha_iso && (
            <p className="mt-1 font-texto text-[17px] italic text-oro-light/80 first-letter:uppercase">
              {fechaLarga(pub.fecha_iso)}
            </p>
          )}
        </div>

        <InfoPublicacion pub={pub} />
        {esEnsayo && <TenerEnCuenta texto={pub.info?.tener_en_cuenta} />}
      </div>

      <div ref={marca} aria-hidden="true" />

      {/* key: cada apartado entra con su propio fundido */}
      <div key={apartado} className="seccion animate-aparecer border-t border-oro/20 pt-5">
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

      {/* ---- Apartados: abajo, al alcance del pulgar ---- */}
      {createPortal(
        <nav className="barra-apartados animate-aparecer" aria-label="Apartados">
          <span
            className="absolute left-0 top-[-1px] h-[2px] bg-oro-pale transition-transform duration-700 ease-solemne"
            style={{
              width: `${100 / apartados.length}%`,
              transform: `translateX(${indice * 100}%)`,
            }}
            aria-hidden="true"
          />
          <div className="flex">
            {apartados.map((a) => (
              <button
                key={a.id}
                onClick={() => onApartado(a.id)}
                aria-current={apartado === a.id ? 'page' : undefined}
                className="apartado"
              >
                <svg
                  width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                >
                  <path d={ICONOS_APARTADO[a.id]} />
                </svg>
                {a.texto}
              </button>
            ))}
          </div>
        </nav>,
        document.body
      )}
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
        titulo="Cuadrante sin generar"
        texto="Todavía no se han repartido los turnos."
      />
    )
  }

  const [piezaSel, turnoSel] = String(elegido).split('-')
  const grupo = grupos.find((g) => g.pieza === piezaSel) || grupos[0]
  const turno = grupo.cuadrante.find((t) => String(t.id) === turnoSel) || grupo.cuadrante[0]

  return (
    <div className="space-y-4">
      {/* ---- Selector de turno ---- */}
      <div className="space-y-2.5">
        {grupos.map(({ pieza, titulo, cuadrante }) => (
          <div key={pieza} className="flex items-center gap-2.5">
            <span className="etiqueta w-12 shrink-0 !text-[9.5px]">
              {titulo}
            </span>
            <div className="sin-barra flex flex-1 gap-2 overflow-x-auto py-1.5 pr-1">
              {cuadrante.map((t) => {
                const clave = `${pieza}-${t.id}`
                const activo = grupo.pieza === pieza && turno.id === t.id
                const mio = mios.has(clave)
                return (
                  <button
                    key={clave}
                    onClick={() => setElegido(clave)}
                    className={`relative h-11 min-w-[44px] shrink-0 rounded-full border px-3 font-titulo text-[14px]
                                font-semibold transition-colors duration-500 ${
                                  activo
                                    ? pieza === 'cruz'
                                      ? 'border-sky-300 bg-sky-500 text-white'
                                      : 'border-oro-pale bg-oro text-morado-black'
                                    : 'border-oro/30 bg-morado-black/40 text-oro-light/75'
                                }`}
                  >
                    {t.id}
                    {mio && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-oro-pale ring-2 ring-morado-deep"
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
        <p className="text-center font-texto text-[15px] italic text-oro-light/55">No apareces en ningún turno.</p>
      )}
    </div>
  )
}

// =============================================================
//  PIE
// =============================================================
function Pie({ onSalir }) {
  return (
    <footer className="mx-auto mt-6 max-w-xl px-2 text-center">
      <p className="font-texto text-[14.5px] leading-snug text-oro-light/55 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
        Cuadrante oficial publicado por el cuadrillero del tercio.
        <br />
        Ante cualquier duda, habla con él antes del día de la procesión.
      </p>
      {onSalir && (
        <button
          onClick={onSalir}
          className="mt-2 min-h-[44px] px-3 font-titulo text-[10.5px] font-semibold uppercase tracking-[0.08em]
                     text-oro-light/55 transition-colors duration-500 hover:text-oro-light"
        >
          Salir de este móvil
        </button>
      )}
    </footer>
  )
}
