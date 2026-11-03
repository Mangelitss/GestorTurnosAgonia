// =============================================================
//  PANTALLA DE ACCESO
//  Se pide el codigo del tercio. Si falla varias veces seguidas,
//  se hace esperar cada vez mas antes de dejar probar otra.
// =============================================================

import { useEffect, useState } from 'react'
import { entrarConCodigo } from '../lib/datos'
import { Aviso } from './ui'

const CLAVE_FALLOS = 'agonia.fallos'

function leerFallos() {
  try { return JSON.parse(localStorage.getItem(CLAVE_FALLOS)) || { n: 0, hasta: 0 } }
  catch { return { n: 0, hasta: 0 } }
}
function guardarFallos(f) {
  try { localStorage.setItem(CLAVE_FALLOS, JSON.stringify(f)) } catch { /* modo privado */ }
}

// 3 fallos gratis; despues 15 s, 30 s, 60 s... hasta 10 minutos
function espera(n) {
  if (n < 3) return 0
  return Math.min(15000 * 2 ** (n - 3), 10 * 60 * 1000)
}

export default function PantallaCodigo({ onEntrar }) {
  const [codigo, setCodigo] = useState('')
  const [ver, setVer] = useState(false)
  const [comprobando, setComprobando] = useState(false)
  const [error, setError] = useState(null)
  const [fallos, setFallos] = useState(leerFallos)
  const [ahora, setAhora] = useState(Date.now())

  const restante = Math.max(0, fallos.hasta - ahora)

  // Cuenta atras mientras esta bloqueado
  useEffect(() => {
    if (restante <= 0) return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [restante])

  async function enviar(e) {
    e.preventDefault()
    if (!codigo.trim() || comprobando || restante > 0) return

    setComprobando(true)
    setError(null)
    try {
      const r = await entrarConCodigo(codigo)
      if (r) {
        guardarFallos({ n: 0, hasta: 0 })
        onEntrar(r)
        return
      }
      const n = fallos.n + 1
      const nuevo = { n, hasta: Date.now() + espera(n) }
      guardarFallos(nuevo)
      setFallos(nuevo)
      setAhora(Date.now())
      setError('Código incorrecto, o la web no está disponible ahora mismo.')
    } catch (err) {
      console.error(err)
      setError('No se ha podido conectar. Comprueba tu conexión.')
    } finally {
      setComprobando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="seccion animate-aparecer">
      <div className="mx-auto max-w-sm space-y-5 py-6 text-center">
        <img
          src="/cristo_agonia.jpg"
          alt=""
          className="mx-auto h-28 w-28 rounded-full border-2 border-oro/50 object-cover shadow-lg"
        />

        <div>
          <h2 className="titulo text-lg">Acceso del tercio</h2>
          <p className="mt-1.5 text-sm text-oro-light/55">
            Escribe el código que te ha dado el cuadrillero.
          </p>
        </div>

        <div className="relative">
          <input
            className="campo pr-16 text-center tracking-wider"
            type={ver ? 'text' : 'password'}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código de acceso"
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setVer(!ver)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1
                       text-[11px] font-bold uppercase text-oro-light/50 hover:text-oro-light"
          >
            {ver ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <button
          type="submit"
          disabled={comprobando || !codigo.trim() || restante > 0}
          className="btn-oro w-full"
        >
          {comprobando
            ? 'Comprobando…'
            : restante > 0
              ? `Espera ${Math.ceil(restante / 1000)} s`
              : 'Entrar'}
        </button>

        <p className="text-[11px] text-oro-light/30">
          Da igual mayúsculas, tildes o espacios.
        </p>
      </div>
    </form>
  )
}
