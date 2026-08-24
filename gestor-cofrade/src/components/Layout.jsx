// =============================================================
//  LAYOUT PRINCIPAL — menu lateral + area de contenido
// =============================================================

import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth, nombreConComa } from '../context/AuthContext'
import { P } from '../lib/roles'

const MENU = [
  { to: '/', label: 'Inicio', icono: '🏠', exact: true },
  { to: '/censo', label: 'Censo', icono: '👥', permiso: P.CENSO_VER },
  { to: '/procesiones', label: 'Procesiones', icono: '✝️', permiso: P.PROC_VER },
  { to: '/ensayos', label: 'Ensayos', icono: '📋', permiso: P.ENSAYOS_VER },
  { to: '/calendario', label: 'Calendario', icono: '📅', permiso: P.CAL_VER },
  { to: '/licencias', label: 'Cuadrilleros', icono: '🔑', permiso: P.LIC_VER },
]

export default function Layout({ children }) {
  const { perfil, infoRol, esSupremo, puede, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const salir = async () => {
    if (confirm('¿Quieres cerrar la sesión?')) {
      await cerrarSesion()
      navigate('/')
    }
  }

  const iniciales = [perfil?.nombre, perfil?.apellidos]
    .filter(Boolean)
    .map((p) => p.trim()[0])
    .join('')
    .toUpperCase() || '?'

  const visibles = MENU.filter((m) => !m.permiso || puede(m.permiso))

  return (
    <div className="min-h-screen flex bg-slate-100">

      {/* ---------- MENU LATERAL ---------- */}
      <aside className="w-64 bg-morado flex flex-col shrink-0">
        <div className="px-6 py-7 border-b border-morado-light/30">
          <h1 className="font-serif text-xl font-bold text-oro leading-tight">
            GESTOR
            <br />
            COFRADE
          </h1>
          <p className="text-oro-light/50 text-[11px] mt-1.5 leading-snug">
            Cristo de la Agonía
          </p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-oro text-morado-dark shadow-sm'
                    : 'text-white/80 hover:bg-morado-light hover:text-white'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icono}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + salir */}
        <div className="p-3 border-t border-morado-light/30">
          <div className="flex items-center gap-3 px-2 py-2.5 mb-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0
                          ${esSupremo ? 'bg-white text-morado ring-2 ring-oro' : 'bg-oro text-morado-dark'}`}
            >
              {iniciales}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {nombreConComa(perfil) || 'Cuadrillero'}
              </p>
              <p className="text-oro-light/60 text-[10px] truncate flex items-center gap-1">
                {esSupremo && <span>👑</span>}
                {infoRol.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={salir}
            className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold
                       text-red-200 hover:bg-red-600 hover:text-white transition-all"
          >
            ❌ Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---------- CONTENIDO ---------- */}
      <main className="flex-1 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  )
}
