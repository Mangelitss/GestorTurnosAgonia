// =============================================================
//  PORTAL DEL COSTALERO
//
//  Web publica del Tercio del Santisimo Cristo de la Agonia y
//  Maria Magdalena. No pide cuenta ni contraseña: solo muestra
//  lo que el cuadrillero ha publicado desde el panel.
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import { leerProcesionesPublicadas, leerConvocatorias, personasDe } from './lib/datos'
import { TIPOS_PROCESION, PIEZAS } from '@nucleo/constantes'
import { fechaLarga } from './lib/texto'
import Buscador from './components/Buscador'
import FichaCostalero from './components/FichaCostalero'
import CuadranteTurno from './components/CuadranteTurno'
import Recorrido from './components/Recorrido'
import Convocatorias from './components/Convocatorias'
import { Cargando, Aviso, Vacio, Rotulo } from './components/ui'

// Se recuerda a quien eres para no buscarte cada vez que abres la web
const CLAVE_MEMORIA = 'agonia.costalero'

function recordado() {
  try { return localStorage.getItem(CLAVE_MEMORIA) || null } catch { return null }
}
function recordar(id) {
  try { id ? localStorage.setItem(CLAVE_MEMORIA, id) : localStorage.removeItem(CLAVE_MEMORIA) } catch { /* modo privado */ }
}

export default function App() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [procesiones, setProcesiones] = useState([])
  const [citas, setCitas] = useState([])

  const [seleccion, setSeleccion] = useState(null)      // id de procesion, o 'convocatorias'
  const [apartado, setApartado] = useState('mia')       // mia | cuadrante | recorrido
  const [costaleroId, setCostaleroId] = useState(recordado)

  // ---- Carga inicial ----
  useEffect(() => {
    let vivo = true

    ;(async () => {
      try {
        const [procs, cal] = await Promise.all([
          leerProcesionesPublicadas(),
          leerConvocatorias().catch(() => []),   // el calendario no es imprescindible
        ])
        if (!vivo) return
        setProcesiones(procs)
        setCitas(cal)
        setSeleccion(procs.length ? procs[0].id : 'convocatorias')
      } catch (e) {
        if (vivo) setError(e?.message || 'No se ha podido conectar.')
      } finally {
        if (vivo) setCargando(false)
      }
    })()

    return () => { vivo = false }
  }, [])

  const procesion = useMemo(
    () => procesiones.find((p) => p.id === seleccion) || null,
    [procesiones, seleccion]
  )

  const personas = useMemo(
    () => (procesion ? personasDe(procesion) : []),
    [procesion]
  )

  // Puede estar recordado alguien que no sale en ESTA procesion
  const yo = useMemo(
    () => personas.find((p) => p.id === costaleroId) || null,
    [personas, costaleroId]
  )

  function elegir(persona) {
    setCostaleroId(persona.id)
    recordar(persona.id)
  }

  function olvidar() {
    setCostaleroId(null)
    recordar(null)
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <Cabecera />

      <main className="folio">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <div className="seccion">
            <Aviso tipo="error">
              No se ha podido conectar con la Mayordomía. Comprueba que tienes
              conexión y vuelve a intentarlo.
            </Aviso>
          </div>
        ) : (
          <>
            <Pestanas
              procesiones={procesiones}
              citas={citas}
              seleccion={seleccion}
              onSeleccionar={(v) => { setSeleccion(v); setApartado('mia') }}
            />

            <div className="seccion">
              {seleccion === 'convocatorias' ? (
                <Convocatorias citas={citas} />
              ) : !procesion ? (
                <Vacio
                  icono="—"
                  titulo="Todavía no hay cuadrante"
                  texto="El cuadrillero aún no ha publicado ninguna procesión."
                />
              ) : (
                <Procesion
                  procesion={procesion}
                  personas={personas}
                  yo={yo}
                  apartado={apartado}
                  onApartado={setApartado}
                  onElegir={elegir}
                  onOlvidar={olvidar}
                />
              )}
            </div>
          </>
        )}
      </main>

      <Pie />
    </div>
  )
}

// =============================================================
//  CABECERA
// =============================================================
function Cabecera() {
  return (
    <header className="mx-auto mb-6 max-w-3xl text-center">
      <h1 className="font-titulo text-base font-bold uppercase leading-snug
                     tracking-[0.08em] text-oro sm:text-lg">
        Muy Ilustre Mayordomía de<br className="sm:hidden" /> Ntro. Padre Jesús Nazareno
      </h1>
      <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.15em] text-oro-light/60">
        Tercio del Cristo de la Agonía
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-oro-light/35">
        y María Magdalena · Orihuela
      </p>
    </header>
  )
}

// =============================================================
//  PESTAÑAS SUPERIORES
// =============================================================
function Pestanas({ procesiones, citas, seleccion, onSeleccionar }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-oro/25 bg-morado-black/50 p-3">
      {procesiones.map((p) => {
        const tipo = TIPOS_PROCESION[p.tipo]
        return (
          <button
            key={p.id}
            onClick={() => onSeleccionar(p.id)}
            className={`pestana ${seleccion === p.id ? 'pestana-activa' : ''}`}
          >
            {tipo?.corto || p.nombre}
            {p.anio && <span className="ml-1 opacity-60">{p.anio}</span>}
          </button>
        )
      })}

      <button
        onClick={() => onSeleccionar('convocatorias')}
        className={`pestana ${seleccion === 'convocatorias' ? 'pestana-activa' : ''}`}
      >
        Ensayos
        {citas.length > 0 && <span className="ml-1 opacity-60">{citas.length}</span>}
      </button>
    </nav>
  )
}

// =============================================================
//  UNA PROCESION
// =============================================================
function Procesion({ procesion, personas, yo, apartado, onApartado, onElegir, onOlvidar }) {
  const apartados = [
    { id: 'mia', texto: yo ? 'Lo mío' : 'Quién soy' },
    { id: 'cuadrante', texto: 'Cuadrante' },
    { id: 'recorrido', texto: 'Recorrido' },
  ]

  return (
    <div className="space-y-5">

      {/* ---- Titulo de la procesion ---- */}
      <div className="text-center">
        <h2 className="font-titulo text-xl font-bold uppercase tracking-wide text-crema">
          {procesion.nombre}
        </h2>
        {procesion.fecha_iso && (
          <p className="mt-1 text-sm text-oro-light/60">
            {fechaLarga(procesion.fecha_iso)}
          </p>
        )}
      </div>

      {/* ---- Apartados ---- */}
      <div className="flex gap-1.5 rounded-lg bg-morado-black/50 p-1.5">
        {apartados.map((a) => (
          <button
            key={a.id}
            onClick={() => onApartado(a.id)}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-bold uppercase
                        tracking-wide transition-colors ${
                          apartado === a.id
                            ? 'bg-morado text-oro-light'
                            : 'text-oro-light/45 hover:text-oro-light/80'
                        }`}
          >
            {a.texto}
          </button>
        ))}
      </div>

      {apartado === 'mia' && (
        yo
          ? <FichaCostalero procesion={procesion} persona={yo} onCambiar={onOlvidar} />
          : <Buscador personas={personas} onElegir={onElegir} />
      )}

      {apartado === 'cuadrante' && (
        <CuadranteCompleto procesion={procesion} resaltarId={yo?.id || null} />
      )}

      {apartado === 'recorrido' && <Recorrido procesion={procesion} />}
    </div>
  )
}

// =============================================================
//  CUADRANTE ENTERO: TRONO Y CRUZ
// =============================================================
function CuadranteCompleto({ procesion, resaltarId }) {
  const bloques = [
    { pieza: 'trono', cuadrante: procesion.cuadrante_trono },
    { pieza: 'cruz', cuadrante: procesion.lleva_cruz ? procesion.cuadrante_cruz : null },
  ].filter((b) => Array.isArray(b.cuadrante) && b.cuadrante.length > 0)

  if (!bloques.length) {
    return (
      <Vacio
        icono="—"
        titulo="Cuadrante sin generar"
        texto="Todavía no se han repartido los turnos de esta procesión."
      />
    )
  }

  return (
    <div className="animate-subir space-y-8">
      {resaltarId && (
        <Aviso tipo="quieto">
          Tu nombre aparece resaltado en dorado dentro de tu turno.
        </Aviso>
      )}

      {bloques.map(({ pieza, cuadrante }) => (
        <div key={pieza}>
          <Rotulo>{PIEZAS[pieza].nombre}</Rotulo>
          <div className="space-y-4">
            {cuadrante.map((turno) => (
              <CuadranteTurno
                key={turno.id}
                turno={turno}
                pieza={pieza}
                resaltarId={resaltarId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================
//  PIE
// =============================================================
function Pie() {
  return (
    <footer className="mx-auto mt-8 max-w-3xl px-2 text-center">
      <p className="text-[11px] leading-relaxed text-oro-light/30">
        Cuadrante oficial publicado por el cuadrillero del tercio.
        <br />
        Ante cualquier duda, habla con él antes del día de la procesión.
      </p>
    </footer>
  )
}
