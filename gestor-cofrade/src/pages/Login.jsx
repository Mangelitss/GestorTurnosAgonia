// =============================================================
//  PANTALLA DE ACCESO
//  Dos modos:  "login"  (ya registrado)  |  "licencia" -> "registro"
// =============================================================

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Emblema } from '../components/Layout'
import { Icono } from '../components/Iconos'

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
    <div className="min-h-dvh flex items-center justify-center p-6 bg-morado-dark relative overflow-hidden">
      {/* Luz tenue sobre el morado */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(90% 70% at 50% 0%, #4F1243 0%, rgba(79,18,67,0) 70%)' }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[400px]">

        {/* Cabecera */}
        <div className="text-center mb-7 animate-subir">
          <div className="inline-flex mb-4"><Emblema tam={68} /></div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-white">
            Gestor Cofrade
          </h1>
          <p className="text-oro-light/80 text-[13px] mt-1.5 leading-relaxed">
            Tercio del Cristo de la Agonía y María Magdalena
            <br />
            <span className="text-white/45 text-xs">
              M.I. Mayordomía de Ntro. Padre Jesús Nazareno · Orihuela
            </span>
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-hoja p-7 animate-hoja-entra">
          <div key={modo} className="animate-subir">

            {/* ---------- MODO LOGIN ---------- */}
            {modo === 'login' && (
              <>
                <h2 className="font-display text-[20px] font-semibold text-slate-800 mb-1">Iniciar sesión</h2>
                <p className="text-slate-500 text-sm mb-5">Accede con tu cuenta de cuadrillero.</p>

                <form onSubmit={onLogin} className="space-y-3.5">
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

                  <button type="submit" disabled={cargando} className="btn-morado w-full !min-h-[42px] mt-1">
                    {cargando ? 'Comprobando…' : 'Entrar'}
                  </button>
                </form>

                <div className="mt-5 pt-5 border-t border-black/[0.07] text-center">
                  <p className="text-[13px] text-slate-500 mb-2.5">¿Tienes un código de licencia nuevo?</p>
                  <button
                    onClick={() => { setModo('licencia'); limpiar() }}
                    className="btn-ghost w-full !min-h-[42px]"
                  >
                    Activar licencia
                  </button>
                </div>
              </>
            )}

            {/* ---------- MODO LICENCIA ---------- */}
            {modo === 'licencia' && (
              <>
                <h2 className="font-display text-[20px] font-semibold text-slate-800 mb-1">Activar licencia</h2>
                <p className="text-slate-500 text-sm mb-5">
                  Introduce el código que te ha facilitado el administrador.
                </p>

                <form onSubmit={onVerificar} className="space-y-3.5">
                  <div>
                    <label className="label">Código de licencia</label>
                    <input
                      type="text" required className="input text-center text-base font-mono tracking-[0.16em] uppercase"
                      value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                      placeholder="AGON-2026-XXXX" maxLength={30}
                    />
                  </div>

                  {error && <Aviso texto={error} />}

                  <button type="submit" disabled={cargando} className="btn-morado w-full !min-h-[42px]">
                    {cargando ? 'Verificando…' : 'Verificar código'}
                  </button>
                </form>

                <button
                  onClick={() => { setModo('login'); limpiar() }}
                  className="mt-4 w-full text-sm text-morado hover:opacity-70 transition-opacity"
                >
                  ‹ Volver al inicio de sesión
                </button>
              </>
            )}

            {/* ---------- MODO REGISTRO ---------- */}
            {modo === 'registro' && (
              <>
                <div className="bg-emerald-50 rounded-xl px-3.5 py-3 mb-5 flex items-start gap-2.5">
                  <span className="text-emerald-600 mt-0.5"><Icono nombre="visto" tam={16} grosor={2.2} /></span>
                  <div className="text-sm">
                    <p className="font-medium text-emerald-900">Licencia válida</p>
                    <p className="text-emerald-700 text-xs font-mono mt-0.5">{codigo}</p>
                  </div>
                </div>

                <h2 className="font-display text-[20px] font-semibold text-slate-800 mb-1">Crea tu cuenta</h2>
                <p className="text-slate-500 text-sm mb-5">
                  Estos serán tus datos de acceso a partir de ahora.
                </p>

                <form onSubmit={onRegistrar} className="space-y-3.5">
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

                  <button type="submit" disabled={cargando} className="btn-morado w-full !min-h-[42px]">
                    {cargando ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
                  </button>
                </form>

                <button
                  onClick={() => { setModo('licencia'); setLicenciaOk(null); limpiar() }}
                  className="mt-4 w-full text-sm text-morado hover:opacity-70 transition-opacity"
                >
                  ‹ Usar otro código
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Sistema de Gestión de Turnos · v2.0
        </p>
      </div>
    </div>
  )
}

function Aviso({ texto }) {
  return (
    <div className="bg-red-50 text-red-800 text-sm rounded-xl px-3.5 py-2.5 flex items-start gap-2 animate-subir">
      <span className="mt-0.5 text-red-600"><Icono nombre="atencion" tam={15} /></span>
      <span>{texto}</span>
    </div>
  )
}
