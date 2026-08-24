// =============================================================
//  ENRUTADO PRINCIPAL
// =============================================================

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { P } from './lib/roles'
import Layout from './components/Layout'
import Protegida from './components/Protegida'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Censo from './pages/Censo'
import Licencias from './pages/Licencias'
import Calendario from './pages/Calendario'
import Ensayos from './pages/Ensayos'
import EnsayoDetalle from './pages/EnsayoDetalle'
import Procesiones from './pages/Procesiones'
import ProcesionDetalle from './pages/ProcesionDetalle'

export default function App() {
  const { autenticado, cargando } = useAuth()

  // Pantalla de arranque mientras Firebase comprueba la sesion
  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-morado-black gap-4">
        <div className="w-10 h-10 border-[3px] border-morado-light border-t-oro rounded-full animate-spin" />
        <p className="text-oro-light/60 text-sm">Comprobando sesión…</p>
      </div>
    )
  }

  if (!autenticado) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/censo"
          element={<Protegida permiso={P.CENSO_VER}><Censo /></Protegida>}
        />

        <Route
          path="/licencias"
          element={<Protegida permiso={P.LIC_VER}><Licencias /></Protegida>}
        />

        <Route
          path="/procesiones"
          element={<Protegida permiso={P.PROC_VER}><Procesiones /></Protegida>}
        />

        <Route
          path="/procesiones/:id"
          element={<Protegida permiso={P.PROC_VER}><ProcesionDetalle /></Protegida>}
        />

        <Route
          path="/ensayos"
          element={<Protegida permiso={P.ENSAYOS_VER}><Ensayos /></Protegida>}
        />

        <Route
          path="/ensayos/:id"
          element={<Protegida permiso={P.ENSAYOS_VER}><EnsayoDetalle /></Protegida>}
        />

        <Route
          path="/calendario"
          element={<Protegida permiso={P.CAL_VER}><Calendario /></Protegida>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
