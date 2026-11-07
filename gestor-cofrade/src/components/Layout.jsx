// =============================================================
//  LAYOUT PRINCIPAL — menu lateral + area de contenido
//
//  El cambio de pantalla se anima sobre el contenido ya montado
//  (no se vuelve a crear), asi no se pierde lo que hubiera a medias.
// =============================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, nombreConComa } from '../context/AuthContext'
import { P } from '../lib/roles'

const MENU = [
  { to: '/', label: 'Inicio', icono: '🏠', exact: true },
  { to: '/censo', label: 'Censo', icono: '👥', permiso: P.CENSO_VER },
  { to: '/procesiones', label: 'Procesiones', icono: '✝️', permiso: P.PROC_VER },
  { to: '/ensayos', label: 'Ensayos', icono: '📋', permiso: P.ENSAYOS_VER },
  { to: '/calendario', label: 'Calendario', icono: '📅', permiso: P.CAL_VER },
  { to: '/publicacion', label: 'Web costaleros', icono: '🌐', permiso: P.PROC_PUBLICAR },
  { to: '/licencias', label: 'Cuadrilleros', icono: '🔑', permiso: P.LIC_VER },
]

export default function Layout({ children }) {
  const { perfil, infoRol, esSupremo, puede, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const principal = useRef(null)
  const contenido = useRef(null)
  const menu = useRef(null)
  const [marca, setMarca] = useState(null)

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

  // ---- La marca dorada del menu se desliza hasta la seccion activa ----
  useLayoutEffect(() => {
    const medir = () => {
      const el = menu.current?.querySelector('[aria-current="page"]')
      setMarca(el ? { y: el.offsetTop, h: el.offsetHeight } : null)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [pathname, visibles.length])

  // ---- Al cambiar de pantalla: arriba del todo y entrada suave ----
  useEffect(() => {
    if (principal.current) principal.current.scrollTop = 0
    contenido.current?.animate?.(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22, 0.75, 0.2, 1)' }
    )
  }, [pathname])

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">

      {/* ---------- MENU LATERAL ---------- */}
      <aside className="w-64 bg-gradient-to-b from-morado to-morado-dark flex flex-col shrink-0">
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

        <nav ref={menu} className="relative flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {marca && (
            <span
              className="absolute left-3 right-3 top-0 rounded-xl bg-oro shadow-md
                         transition-[transform,height] duration-500 ease-posarse"
              style={{ height: marca.h, transform: `translateY(${marca.y}px)` }}
              aria-hidden="true"
            />
          )}
          {visibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold group
                 transition-[color,background-color] duration-300 ${
                  isActive
                    ? 'text-morado-dark'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg leading-none transition-transform duration-300 ease-posarse group-hover:scale-125">
                {item.icono}
              </span>
              <span className="transition-transform duration-300 ease-posarse group-hover:translate-x-0.5">
                {item.label}
              </span>
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
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold
                       text-red-200 hover:bg-red-600 hover:text-white transition-colors duration-300"
          >
            ❌ Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---------- CONTENIDO ---------- */}
      <main ref={principal} className="flex-1 min-w-0 overflow-y-auto">
        <div ref={contenido}>{children}</div>
      </main>
    </div>
  )
}
