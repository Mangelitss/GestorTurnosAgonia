// =============================================================
//  LAYOUT PRINCIPAL — barra lateral + area de contenido
//
//  Ordenador y tablet apaisada: barra lateral completa.
//  Tablet en vertical: se queda en un carril de iconos.
//
//  El cambio de pantalla se anima sobre el contenido ya montado
//  (no se vuelve a crear), asi no se pierde lo que hubiera a medias.
// =============================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, nombreConComa } from '../context/AuthContext'
import { P } from '../lib/roles'
import { Icono } from './Iconos'

const MENU = [
  { to: '/', label: 'Inicio', icono: 'casa', exact: true },
  { to: '/censo', label: 'Censo', icono: 'personas', permiso: P.CENSO_VER },
  { to: '/procesiones', label: 'Procesiones', icono: 'cruz', permiso: P.PROC_VER },
  { to: '/ensayos', label: 'Ensayos', icono: 'portapapeles', permiso: P.ENSAYOS_VER },
  { to: '/calendario', label: 'Calendario', icono: 'calendario', permiso: P.CAL_VER },
  { to: '/publicacion', label: 'Web costaleros', icono: 'globo', permiso: P.PROC_PUBLICAR },
  { to: '/licencias', label: 'Cuadrilleros', icono: 'llave', permiso: P.LIC_VER },
]

const seccionDe = (ruta) =>
  MENU.find((m) => (m.exact ? ruta === m.to : ruta.startsWith(m.to)))

export default function Layout({ children }) {
  const { perfil, infoRol, esSupremo, puede, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const principal = useRef(null)
  const contenido = useRef(null)
  const menu = useRef(null)
  const [marca, setMarca] = useState(null)
  const [plegada, setPlegada] = useState(false)

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

  // ---- La marca del menu se desliza hasta la seccion activa ----
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
    setPlegada(false)
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (quieto || !contenido.current?.animate) return
    contenido.current.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }
    )
  }, [pathname])

  const seccion = seccionDe(pathname)

  return (
    <div className="h-dvh flex bg-slate-50 overflow-hidden">

      {/* ---------- BARRA LATERAL ---------- */}
      <aside className="w-[88px] lg:w-[252px] flex flex-col shrink-0 bg-gradient-to-b from-morado to-morado-dark text-white">
        <div className="px-3 lg:px-5 pt-6 pb-5 flex items-center justify-center lg:justify-start gap-3">
          <Emblema />
          <div className="hidden lg:block min-w-0">
            <p className="font-display text-[15px] font-semibold leading-tight tracking-[-0.01em]">Gestor Cofrade</p>
            <p className="text-[11.5px] text-oro-light/70 mt-0.5 truncate">Cristo de la Agonía</p>
          </div>
        </div>

        <nav ref={menu} className="relative flex-1 px-2.5 lg:px-3 space-y-0.5 overflow-y-auto">
          {marca && (
            <span
              className="absolute left-2.5 right-2.5 lg:left-3 lg:right-3 top-0 rounded-[10px] bg-white/[0.13]
                         transition-[transform,height] duration-[420ms] ease-posarse"
              style={{ height: marca.h, transform: `translateY(${marca.y}px)` }}
              aria-hidden="true"
            />
          )}
          {visibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              title={item.label}
              className={({ isActive }) =>
                `relative flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-3 py-2.5 lg:py-[9px]
                 rounded-[10px] text-[10.5px] lg:text-[14px] font-medium text-center lg:text-left leading-tight
                 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-white/70 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icono
                    nombre={item.icono}
                    tam={20}
                    grosor={1.6}
                    className={`transition-colors duration-200 ${isActive ? 'text-oro' : ''}`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + salir */}
        <div className="px-2.5 lg:px-3 pb-3 pt-2 border-t border-white/10 mt-2">
          <div className="flex items-center justify-center lg:justify-start gap-2.5 px-1 lg:px-2 py-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[11px] shrink-0
                          ${esSupremo ? 'bg-white text-morado ring-[1.5px] ring-oro' : 'bg-oro text-morado-dark'}`}
              title={nombreConComa(perfil) || 'Cuadrillero'}
            >
              {iniciales}
            </div>
            <div className="min-w-0 hidden lg:block">
              <p className="text-[12.5px] font-medium truncate">
                {nombreConComa(perfil) || 'Cuadrillero'}
              </p>
              <p className="text-oro-light/70 text-[11px] truncate flex items-center gap-1">
                {esSupremo && <Icono nombre="corona" tam={11} />}
                {infoRol.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={salir}
            title="Cerrar sesión"
            className="w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-3 py-2 rounded-[10px]
                       text-[10.5px] lg:text-[13.5px] font-medium text-white/70
                       hover:bg-white/10 hover:text-white transition-colors duration-200"
          >
            <Icono nombre="salir" tam={18} grosor={1.6} />
            <span className="hidden lg:inline">Cerrar sesión</span>
            <span className="lg:hidden">Salir</span>
          </button>
        </div>
      </aside>

      {/* ---------- CONTENIDO ---------- */}
      <main
        ref={principal}
        className="flex-1 min-w-0 overflow-y-auto"
        onScroll={(e) => setPlegada(e.currentTarget.scrollTop > 44)}
      >
        {/* Barra superior: el titulo aparece cuando el grande se va */}
        <div
          className={`sticky top-0 z-30 h-[52px] flex items-center justify-center
                      transition-[background-color,box-shadow] duration-300 ${
                        plegada
                          ? 'bg-slate-50/80 backdrop-blur-xl shadow-[0_0.5px_0_rgba(0,0,0,0.14)]'
                          : 'bg-transparent'
                      }`}
        >
          <span
            className={`font-display text-[14px] font-semibold text-slate-800 transition-all duration-300 ease-posarse ${
              plegada ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            {seccion?.label}
          </span>
        </div>

        <div ref={contenido}>{children}</div>
      </main>
    </div>
  )
}

// Emblema de la aplicacion: la cruz en oro sobre morado profundo
export function Emblema({ tam = 40 }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center bg-morado-deep text-oro
                 shadow-[inset_0_0_0_1px_rgba(209,181,20,0.45),0_2px_8px_rgba(0,0,0,0.3)]"
      style={{ width: tam, height: tam, borderRadius: tam * 0.26 }}
      aria-hidden="true"
    >
      <Icono nombre="cruz" tam={tam * 0.58} grosor={2} />
    </div>
  )
}
