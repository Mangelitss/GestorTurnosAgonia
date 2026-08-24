// =============================================================
//  DASHBOARD — pantalla de inicio del cuadrillero
// =============================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth, nombreConComa } from '../context/AuthContext'
import { Page, StatCard, Cargando } from '../components/ui'
import { TIPOS_PROCESION } from '../lib/constantes'
import { fechaBonita } from '../lib/calendario'
import { P } from '../lib/roles'

// Accesos principales del dashboard
const ACCESOS = [
  {
    to: '/censo',
    icono: '👥',
    titulo: 'Censo de Costaleros',
    texto: 'Da de alta, edita y organiza la ficha de cada costalero del tercio.',
    color: 'from-morado to-morado-light',
    permiso: P.CENSO_VER,
  },
  {
    to: '/procesiones',
    icono: '✝️',
    titulo: 'Procesiones y Tramos',
    texto: 'Configura el recorrido, los tramos y genera los cuadrantes de turnos.',
    color: 'from-oro-dark to-oro',
    permiso: P.PROC_VER,
  },
  {
    to: '/ensayos',
    icono: '📋',
    titulo: 'Ensayos',
    texto: 'Organiza los ensayos y las cuadrillas de prueba antes de la salida.',
    color: 'from-sky-800 to-sky-600',
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

  const nombreCompleto = nombreConComa(perfil)
  const hora = new Date().getHours()
  const saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <Page>
      {/* --- Bienvenida --- */}
      <div className="bg-gradient-to-r from-morado-deep to-morado rounded-2xl p-8 mb-8 border-l-4 border-oro overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-oro-light/60 text-sm">{saludo},</p>
            <h1 className="font-serif text-3xl font-bold text-white mt-1">
              {nombreCompleto || 'Cuadrillero'}
            </h1>
          </div>
          <span className={`chip shrink-0 ${infoRol.chip} !bg-white/10 !text-oro-light !border-oro/30`}>
            {infoRol.nombre}
          </span>
        </div>
        <p className="text-oro-light/70 text-xs mt-3 whitespace-nowrap overflow-hidden text-ellipsis">
          Tercio del Cristo de la Agonía y María Magdalena · M.I. Mayordomía de Ntro. Padre Jesús Nazareno de Orihuela
        </p>
      </div>

      {cargando ? (
        <Cargando texto="Cargando datos del tercio…" />
      ) : (
        <>
          {/* --- Estadisticas --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icono="👥" valor={stats.total} etiqueta="Costaleros en el censo" color="morado" />
            <StatCard icono="M" valor={stats.miercoles} etiqueta="Apuntados Miércoles Santo" color="oro" letra />
            <StatCard icono="V" valor={stats.viernes} etiqueta="Apuntados Viernes Santo" color="azul" letra />
            <StatCard icono="📜" valor={stats.procesiones} etiqueta="Procesiones creadas" color="verde" />
          </div>

          {/* --- Accesos principales --- */}
          <h2 className="font-serif text-lg font-bold text-slate-700 mb-4">¿Qué quieres hacer?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {ACCESOS.filter((a) => puede(a.permiso)).map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${a.color}
                              flex items-center justify-center text-2xl mb-4
                              group-hover:scale-105 transition-transform`}
                >
                  {a.icono}
                </div>
                <h3 className="font-serif text-lg font-bold text-morado mb-1.5">{a.titulo}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{a.texto}</p>
                <p className="text-oro-dark text-sm font-semibold mt-4 group-hover:translate-x-1 transition-transform">
                  Entrar →
                </p>
              </Link>
            ))}
          </div>

          {/* --- Dos columnas: procesiones + proximo evento --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Procesiones recientes */}
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-base font-bold text-morado">Procesiones recientes</h3>
                <Link to="/procesiones" className="text-sm text-oro-dark font-semibold hover:underline">
                  Ver todas
                </Link>
              </div>

              {ultimasProcesiones.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">
                  Todavía no has creado ninguna procesión.
                </p>
              ) : (
                <div className="space-y-2">
                  {ultimasProcesiones.map((p) => {
                    const tipo = TIPOS_PROCESION[p.tipo] || TIPOS_PROCESION.extraordinaria
                    return (
                      <Link
                        key={p.id}
                        to={`/procesiones/${p.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200
                                   hover:border-oro hover:bg-oro/5 transition-all"
                      >
                        <span className="text-xl">{tipo.icono}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">
                            {p.nombre || tipo.nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {tipo.nombre} · {p.anio || '—'}
                          </p>
                        </div>
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

            {/* Proximo evento */}
            <div className="card p-6">
              <h3 className="font-serif text-base font-bold text-morado mb-4">Próxima convocatoria</h3>

              {proximoEvento ? (
                <div>
                  <div className="bg-oro/10 border border-oro/30 rounded-lg p-4 mb-3">
                    <p className="text-xs uppercase tracking-wide text-oro-dark font-bold">
                      {proximoEvento.tipo || proximoEvento.motivo}
                    </p>
                    <p className="font-serif text-xl font-bold text-morado mt-1.5">
                      {fechaBonita(proximoEvento.fecha_iso)}
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {proximoEvento.hora} · {proximoEvento.lugar}
                    </p>
                  </div>
                  {proximoEvento.indicaciones && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {proximoEvento.indicaciones}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-sm mb-4">No hay convocatorias próximas.</p>
                  <Link to="/calendario" className="btn-ghost text-xs">
                    Añadir al calendario
                  </Link>
                </div>
              )}

              {stats.ensayosAbiertos > 0 && (
                <Link
                  to="/ensayos"
                  className="mt-4 flex items-center gap-2.5 p-3 rounded-lg border border-emerald-200
                             bg-emerald-50 hover:bg-emerald-100 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm text-emerald-800 font-semibold">
                    {stats.ensayosAbiertos} ensayo{stats.ensayosAbiertos === 1 ? '' : 's'} abierto{stats.ensayosAbiertos === 1 ? '' : 's'}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
