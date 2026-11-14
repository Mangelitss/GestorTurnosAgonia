// =============================================================
//  LAYOUT PRINCIPAL — menu lateral + area de contenido
//
//  En el ordenador el menu se puede plegar (solo iconos) para dejar
//  mas sitio al contenido. La eleccion se recuerda en el navegador.
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

const CLAVE_PLEGADO = 'menuPlegado'

export default function Layout({ children }) {
  const { perfil, infoRol, esSupremo, puede, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const principal = useRef(null)
  const contenido = useRef(null)
  const menu = useRef(null)
  const [marca, setMarca] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [plegado, setPlegado] = useState(() => {
    try { return localStorage.getItem(CLAVE_PLEGADO) === '1' } catch { return false }
  })

  const alternarPlegado = () => {
    setPlegado((p) => {
      try { localStorage.setItem(CLAVE_PLEGADO, p ? '0' : '1') } catch { /* sin almacenamiento */ }
      return !p
    })
  }

  // Solo se pliega en pantallas medianas o grandes; en el movil es un cajon.
  const soloIconos = plegado ? 'md:hidden' : ''

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
  }, [pathname, visibles.length, menuAbierto, plegado])

  // ---- Al cambiar de pantalla: arriba del todo y entrada suave ----
  useEffect(() => {
    if (principal.current) principal.current.scrollTop = 0
    setMenuAbierto(false)
    contenido.current?.animate?.(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22, 0.75, 0.2, 1)' }
    )
  }, [pathname])

  return (
    <div className="h-dvh flex flex-col md:flex-row bg-slate-100 overflow-hidden">

      {/* ---------- BARRA SUPERIOR EN EL MOVIL ---------- */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 shrink-0 bg-morado text-oro">
        <span className="font-serif font-bold">GESTOR COFRADE</span>
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir el menú"
          className="w-11 h-11 text-2xl leading-none"
        >
          ☰
        </button>
      </div>

      {menuAbierto && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 animate-aparecer"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* ---------- MENU LATERAL ---------- */}
      <aside
        className={`w-64 ${plegado ? 'md:w-[76px]' : ''} bg-gradient-to-b from-morado to-morado-dark flex-col shrink-0
                    md:flex md:static overflow-hidden transition-[width] duration-300 ease-posarse
                    max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 ${menuAbierto ? 'flex animate-subir' : 'hidden'}`}
      >
        <div
          className={`relative border-b border-morado-light/30 py-7 ${plegado ? 'px-6 md:px-0 md:flex md:justify-center' : 'px-6'}`}
        >
          <div className={soloIconos}>
            <h1 className="font-serif text-xl font-bold text-oro leading-tight whitespace-nowrap">
              GESTOR
              <br />
              COFRADE
            </h1>
            <p className="text-oro-light/50 text-[11px] mt-1.5 leading-snug whitespace-nowrap">
              Cristo de la Agonía
            </p>
          </div>

          {/* Plegar / desplegar (solo en ordenador) */}
          <button
            type="button"
            onClick={alternarPlegado}
            aria-label={plegado ? 'Mostrar el menú' : 'Ocultar el menú'}
            title={plegado ? 'Mostrar el menú' : 'Ocultar el menú'}
            className={`hidden md:flex items-center justify-center w-9 h-9 rounded-lg text-oro
                        hover:bg-white/10 transition-colors duration-300 text-xl leading-none
                        ${plegado ? '' : 'absolute top-3 right-3'}`}
          >
            {plegado ? '»' : '«'}
          </button>
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
              title={plegado ? item.label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3 rounded-xl ${plegado ? 'md:justify-center md:px-0' : ''} text-sm font-semibold group
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
              <span className={`whitespace-nowrap transition-transform duration-300 ease-posarse group-hover:translate-x-0.5 ${soloIconos}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Usuario + salir */}
        <div className="p-3 border-t border-morado-light/30">
          <div
            className={`flex items-center gap-3 px-2 py-2.5 mb-2 ${plegado ? 'md:justify-center md:px-0' : ''}`}
            title={plegado ? `${nombreConComa(perfil) || 'Cuadrillero'} · ${infoRol.nombre}` : undefined}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0
                          ${esSupremo ? 'bg-white text-morado ring-2 ring-oro' : 'bg-oro text-morado-dark'}`}
            >
              {iniciales}
            </div>
            <div className={`min-w-0 ${soloIconos}`}>
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
            title={plegado ? 'Cerrar sesión' : undefined}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap
                       text-red-200 hover:bg-red-600 hover:text-white transition-colors duration-300
                       ${plegado ? 'md:text-center md:px-0' : ''}`}
          >
            ❌<span className={soloIconos}> Cerrar sesión</span>
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
