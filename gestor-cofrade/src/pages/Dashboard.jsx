// =============================================================
//  DASHBOARD — pantalla de inicio del cuadrillero
// =============================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Page, Cargando } from '../components/ui'
import { Icono } from '../components/Iconos'
import { TIPOS_PROCESION } from '../lib/constantes'
import { fechaBonita } from '../lib/calendario'
import { P } from '../lib/roles'

// Accesos principales del dashboard
const ACCESOS = [
  {
    to: '/censo',
    icono: 'personas',
    titulo: 'Censo de costaleros',
    texto: 'Da de alta, edita y organiza la ficha de cada costalero del tercio.',
    permiso: P.CENSO_VER,
  },
  {
    to: '/procesiones',
    icono: 'cruz',
    titulo: 'Procesiones y tramos',
    texto: 'Configura el recorrido, los tramos y genera los cuadrantes de turnos.',
    permiso: P.PROC_VER,
  },
  {
    to: '/ensayos',
    icono: 'portapapeles',
    titulo: 'Ensayos',
    texto: 'Organiza los ensayos y las cuadrillas de prueba antes de la salida.',
    permiso: P.ENSAYOS_VER,
  },
]

export default function Dashboard() {
  const { perfil, infoRol, puede } = useAuth()
  const [cargando, setCargando] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    miercoles: 0,
    viernes: 0,
    procesiones: 0,
    ensayosAbiertos: 0,
  })
  const [ultimasProcesiones, setUltimasProcesiones] = useState([])
  const [proximoEvento, setProximoEvento] = useState(null)

  useEffect(() => {
    let vivo = true

    async function cargar() {
      try {
        // --- Censo ---
        const censoSnap = await getDocs(collection(db, COL.COSTALEROS))
        const censo = censoSnap.docs.map((d) => d.data())

        // --- Procesiones ---
        let procs = []
        try {
          const q = query(collection(db, COL.PROCESIONES), orderBy('actualizado', 'desc'), limit(5))
          const snap = await getDocs(q)
          procs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch {
          // Si aun no existe el indice o la coleccion, seguimos sin romper
          const snap = await getDocs(collection(db, COL.PROCESIONES))
          procs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 5)
        }

        // --- Proximo evento del calendario ---
        let evento = null
        try {
          const snap = await getDocs(collection(db, COL.CALENDARIO))
          const eventos = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((e) => e.fecha_iso && e.fecha_iso >= new Date().toISOString().slice(0, 10))
            .sort((a, b) => a.fecha_iso.localeCompare(b.fecha_iso))
          evento = eventos[0] || null
        } catch { /* coleccion aun vacia */ }

        // --- Ensayos abiertos ---
        let ensayosAbiertos = 0
        try {
          const snap = await getDocs(collection(db, COL.ENSAYOS))
          ensayosAbiertos = snap.docs.filter((d) => d.data().estado !== 'archivado').length
        } catch { /* coleccion aun vacia */ }

        if (!vivo) return

        setStats({
          total: censo.length,
          miercoles: censo.filter((c) => c.miercoles_santo).length,
          viernes: censo.filter((c) => c.viernes_santo).length,
          procesiones: procs.length,
          ensayosAbiertos,
        })
        setUltimasProcesiones(procs)
        setProximoEvento(evento)
      } catch (e) {
        console.error('Error cargando el dashboard:', e)
      } finally {
        if (vivo) setCargando(false)
      }
    }

    cargar()
    return () => { vivo = false }
  }, [])

  const hora = new Date().getHours()
  const saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'
  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const accesos = ACCESOS.filter((a) => puede(a.permiso))

  return (
    <Page>
      {/* --- Bienvenida --- */}
      <header className="mb-8">
        <p className="text-[13px] font-medium text-slate-500 first-letter:uppercase">{hoy}</p>
        <div className="flex items-end justify-between gap-4 mt-1">
          <h1 className="font-display text-[34px] leading-[1.1] font-bold tracking-[-0.024em] text-slate-800 min-w-0">
            {saludo}, <span className="text-morado">{perfil?.nombre || 'cuadrillero'}</span>
          </h1>
          <span className={`chip shrink-0 mb-1 ${infoRol.chip}`}>{infoRol.nombre}</span>
        </div>
        <p className="text-slate-500 text-[15px] mt-1.5">
          Tercio del Cristo de la Agonía y María Magdalena
        </p>
      </header>

      {cargando ? (
        <Cargando texto="Cargando datos del tercio…" />
      ) : (
        <div className="escalonar space-y-6">
          {/* --- Cifras del tercio --- */}
          <section className="card grid grid-cols-4 divide-x divide-black/[0.06]" aria-label="Cifras del tercio">
            <Cifra valor={stats.total} etiqueta="Costaleros en el censo" />
            <Cifra valor={stats.miercoles} etiqueta="Miércoles Santo" />
            <Cifra valor={stats.viernes} etiqueta="Viernes Santo" />
            <Cifra valor={stats.procesiones} etiqueta="Procesiones" />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-6">
              {/* --- Accesos principales --- */}
              {accesos.length > 0 && (
                <section>
                  <h2 className="font-display text-[17px] font-semibold text-slate-800 mb-2.5 px-1">Accesos</h2>
                  <div className="card overflow-hidden divide-y divide-black/[0.06]">
                    {accesos.map((a) => (
                      <Link
                        key={a.to}
                        to={a.to}
                        className="flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150
                                   hover:bg-[rgba(120,120,128,0.06)] active:bg-[rgba(120,120,128,0.12)]"
                      >
                        <span className="w-9 h-9 rounded-[10px] bg-morado text-oro-light flex items-center justify-center shrink-0">
                          <Icono nombre={a.icono} tam={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium text-slate-800">{a.titulo}</span>
                          <span className="block text-[13px] text-slate-500 truncate">{a.texto}</span>
                        </span>
                        <span className="text-slate-300 text-xl leading-none" aria-hidden="true">›</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* --- Procesiones recientes --- */}
              <section>
                <div className="flex items-baseline justify-between mb-2.5 px-1">
                  <h2 className="font-display text-[17px] font-semibold text-slate-800">Procesiones recientes</h2>
                  <Link to="/procesiones" className="text-[13px] font-medium text-morado hover:opacity-70 transition-opacity">
                    Ver todas
                  </Link>
                </div>

                <div className="card overflow-hidden">
                  {ultimasProcesiones.length === 0 ? (
                    <p className="text-slate-500 text-sm py-10 text-center">
                      Todavía no has creado ninguna procesión.
                    </p>
                  ) : (
                    <div className="divide-y divide-black/[0.06]">
                      {ultimasProcesiones.map((p) => {
                        const tipo = TIPOS_PROCESION[p.tipo] || TIPOS_PROCESION.extraordinaria
                        return (
                          <Link
                            key={p.id}
                            to={`/procesiones/${p.id}`}
                            className="flex items-center gap-3.5 px-4 py-3 transition-colors duration-150
                                       hover:bg-[rgba(120,120,128,0.06)] active:bg-[rgba(120,120,128,0.12)]"
                          >
                            <span className="w-9 h-9 rounded-full bg-morado/[0.08] text-morado flex items-center
                                             justify-center font-display font-semibold shrink-0">
                              {tipo.icono}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-medium text-[14px] text-slate-800 truncate">
                                {p.nombre || tipo.nombre}
                              </span>
                              <span className="block text-[13px] text-slate-500">
                                {tipo.nombre} · {p.anio || '—'}
                              </span>
                            </span>
                            <span
                              className={`chip ${
                                p.publicado
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.publicado ? 'Publicada' : 'Borrador'}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* --- Proxima convocatoria --- */}
            <section>
              <h2 className="font-display text-[17px] font-semibold text-slate-800 mb-2.5 px-1">Próxima convocatoria</h2>

              {proximoEvento ? (
                <div className="rounded-2xl bg-gradient-to-br from-morado to-morado-dark text-white p-5 shadow-elevada">
                  <p className="text-[12px] font-semibold text-oro-light">
                    {proximoEvento.tipo || proximoEvento.motivo}
                  </p>
                  <p className="font-display text-[22px] leading-tight font-semibold mt-2 tracking-[-0.015em]">
                    {fechaBonita(proximoEvento.fecha_iso)}
                  </p>
                  <p className="text-sm text-white/75 mt-1.5">
                    {proximoEvento.hora} · {proximoEvento.lugar}
                  </p>
                  {proximoEvento.indicaciones && (
                    <p className="text-[13px] text-white/60 leading-relaxed mt-3 pt-3 border-t border-white/15">
                      {proximoEvento.indicaciones}
                    </p>
                  )}
                </div>
              ) : (
                <div className="card text-center py-8 px-5">
                  <p className="text-slate-500 text-sm mb-4">No hay convocatorias próximas.</p>
                  <Link to="/calendario" className="btn-ghost">
                    Añadir al calendario
                  </Link>
                </div>
              )}

              {stats.ensayosAbiertos > 0 && (
                <Link
                  to="/ensayos"
                  className="card card-viva mt-3 flex items-center gap-2.5 px-4 py-3"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-800">
                    {stats.ensayosAbiertos} ensayo{stats.ensayosAbiertos === 1 ? '' : 's'} abierto{stats.ensayosAbiertos === 1 ? '' : 's'}
                  </span>
                  <span className="text-slate-300 text-xl leading-none" aria-hidden="true">›</span>
                </Link>
              )}
            </section>
          </div>
        </div>
      )}
    </Page>
  )
}

function Cifra({ valor, etiqueta }) {
  return (
    <div className="px-5 py-4 min-w-0">
      <p className="font-display text-[28px] leading-none font-semibold tracking-[-0.02em] text-slate-800 tabular-nums">
        {valor}
      </p>
      <p className="text-slate-500 text-[13px] mt-1.5 truncate">{etiqueta}</p>
    </div>
  )
}
