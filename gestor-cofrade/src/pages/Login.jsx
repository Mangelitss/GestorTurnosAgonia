// =============================================================
//  PANTALLA DE ACCESO
//  Dos modos:  "login"  (ya registrado)  |  "licencia" -> "registro"
// =============================================================

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { iniciarSesion, verificarLicencia, registrarConLicencia } = useAuth()

  const [modo, setModo] = useState('login') // login | licencia | registro
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // Campos
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [licenciaOk, setLicenciaOk] = useState(null)

  const limpiar = () => {
    setError('')
    setPassword('')
    setPassword2('')
  }

  // --- Login normal ---
  const onLogin = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const res = await iniciarSesion(email, password)
    setCargando(false)
    if (!res.ok) setError(res.error)
  }

  // --- Paso 1: comprobar el codigo ---
  const onVerificar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const res = await verificarLicencia(codigo)
    setCargando(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setLicenciaOk(res.licencia)
    setModo('registro')
  }

  // --- Paso 2: crear la cuenta ---
  const onRegistrar = async (e) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) return setError('Escribe tu nombre.')
    if (!apellidos.trim()) return setError('Escribe tus apellidos.')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== password2) return setError('Las dos contraseñas no coinciden.')

    setCargando(true)
    const res = await registrarConLicencia({ codigo, nombre, apellidos, email, password })
    setCargando(false)
    if (!res.ok) setError(res.error)
    // Si va bien, AuthContext detecta la sesion y App redirige solo
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-morado-deep via-morado-dark to-morado-black p-4">
      <div className="w-full max-w-md">

        {/* Cabecera */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✝️</div>
          <h1 className="font-serif text-3xl font-bold text-oro tracking-wide">
            GESTOR COFRADE
          </h1>
          <p className="text-oro-light/70 text-sm mt-2 leading-relaxed">
            Tercio del Cristo de la Agonía y María Magdalena
            <br />
            <span className="text-oro-light/50 text-xs">
              M.I. Mayordomía de Ntro. Padre Jesús Nazareno · Orihuela
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border-t-4 border-oro">

          {/* ---------- MODO LOGIN ---------- */}
          {modo === 'login' && (
            <>
              <h2 className="font-serif text-xl font-bold text-morado mb-1">Iniciar sesión</h2>
              <p className="text-slate-500 text-sm mb-6">Accede con tu cuenta de cuadrillero.</p>

              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <label className="label">Correo electrónico</label>
                  <input
                    type="email" required autoComplete="email" className="input"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="cuadrillero@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <input
                    type="password" required autoComplete="current-password" className="input"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {error && <Aviso texto={error} />}

                <button type="submit" disabled={cargando} className="btn-morado w-full">
                  {cargando ? 'Comprobando…' : 'ENTRAR'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-500 mb-3">¿Tienes un código de licencia nuevo?</p>
                <button
                  onClick={() => { setModo('licencia'); limpiar() }}
                  className="btn-oro w-full"
                >
                  ACTIVAR LICENCIA
                </button>
              </div>
            </>
          )}

          {/* ---------- MODO LICENCIA ---------- */}
          {modo === 'licencia' && (
            <>
              <h2 className="font-serif text-xl font-bold text-morado mb-1">Activar licencia</h2>
              <p className="text-slate-500 text-sm mb-6">
                Introduce el código que te ha facilitado el administrador.
              </p>

              <form onSubmit={onVerificar} className="space-y-4">
                <div>
                  <label className="label">Código de licencia</label>
                  <input
                    type="text" required className="input text-center text-lg font-mono tracking-[0.2em] uppercase"
                    value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="AGON-2026-XXXX" maxLength={30}
                  />
                </div>

                {error && <Aviso texto={error} />}

                <button type="submit" disabled={cargando} className="btn-oro w-full">
                  {cargando ? 'Verificando…' : 'VERIFICAR CÓDIGO'}
                </button>
              </form>

              <button
                onClick={() => { setModo('login'); limpiar() }}
                className="mt-5 w-full text-sm text-slate-500 hover:text-morado transition"
              >
                ← Volver al inicio de sesión
              </button>
            </>
          )}

          {/* ---------- MODO REGISTRO ---------- */}
          {modo === 'registro' && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                <span className="text-emerald-600 text-lg leading-none">✓</span>
                <div className="text-sm">
                  <p className="font-semibold text-emerald-800">Licencia válida</p>
                  <p className="text-emerald-700 text-xs font-mono">{codigo}</p>
                </div>
              </div>

              <h2 className="font-serif text-xl font-bold text-morado mb-1">Crea tu cuenta</h2>
              <p className="text-slate-500 text-sm mb-6">
                Estos serán tus datos de acceso a partir de ahora.
              </p>

              <form onSubmit={onRegistrar} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      type="text" required className="input"
                      value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Miguel Ángel"
                    />
                  </div>
                  <div>
                    <label className="label">Apellidos</label>
                    <input
                      type="text" required className="input"
                      value={apellidos} onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Martínez Rodríguez"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Correo electrónico</label>
                  <input
                    type="email" required autoComplete="email" className="input"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="cuadrillero@ejemplo.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Contraseña</label>
                    <input
                      type="password" required autoComplete="new-password" className="input"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                    />
                  </div>
                  <div>
                    <label className="label">Repetir</label>
                    <input
                      type="password" required autoComplete="new-password" className="input"
                      value={password2} onChange={(e) => setPassword2(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && <Aviso texto={error} />}

                <button type="submit" disabled={cargando} className="btn-morado w-full">
                  {cargando ? 'Creando cuenta…' : 'CREAR CUENTA Y ENTRAR'}
                </button>
              </form>

              <button
                onClick={() => { setModo('licencia'); setLicenciaOk(null); limpiar() }}
                className="mt-5 w-full text-sm text-slate-500 hover:text-morado transition"
              >
                ← Usar otro código
              </button>
            </>
          )}
        </div>

        <p className="text-center text-oro-light/30 text-xs mt-6">
          Sistema de Gestión de Turnos · v2.0
        </p>
      </div>
    </div>
  )
}

function Aviso({ texto }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 flex items-start gap-2">
      <span className="leading-none">⚠️</span>
      <span>{texto}</span>
    </div>
  )
}
