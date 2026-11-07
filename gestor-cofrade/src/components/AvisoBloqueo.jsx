// =============================================================
//  AVISOS DE EDICION PROTEGIDA
// =============================================================

import { Alerta } from './ui'

// --- Barra de aviso cuando otro está editando ---
export function AvisoBloqueo({ bloqueo, onForzar, onReintentar }) {
  if (!bloqueo) return null

  return (
    <div className="card border-amber-300 bg-amber-50 p-4 mb-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-lg leading-none">🔒</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Lo está editando {bloqueo.nombre}
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Puedes verlo todo y se te irá actualizando en vivo, pero no
              modificarlo hasta que termine.
              {bloqueo.inactivoMin >= 1 && (
                <> Lleva <b>{bloqueo.inactivoMin} min</b> sin dar señales.</>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={onReintentar} className="btn-ghost text-xs">
            🔄 Reintentar
          </button>
          <button
            onClick={() => {
              if (confirm(
                `¿Tomar el control aunque ${bloqueo.nombre} lo tenga abierto?\n\n` +
                `Si sigue trabajando, sus cambios sin guardar podrían perderse.\n` +
                `Hazlo solo si sabes que ya no está delante.`
              )) onForzar()
            }}
            className="btn-ghost text-xs text-amber-800"
          >
            ⚡ Tomar el control
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Indicador del estado del guardado ---
export function EstadoGuardado({ sinGuardar, guardando, ultimoGuardado, onGuardar }) {
  if (guardando) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="w-3 h-3 border-2 border-slate-300 border-t-morado rounded-full animate-spin" />
        Guardando…
      </span>
    )
  }

  if (sinGuardar) {
    return (
      <button onClick={() => onGuardar()} className="btn-oro text-xs">
        💾 Guardar ahora
      </button>
    )
  }

  if (ultimoGuardado) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600" title={ultimoGuardado.toLocaleTimeString('es-ES')}>
        ✓ Guardado {ultimoGuardado.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }

  return null
}

// --- Aviso de que estamos en solo lectura por permisos ---
export function AvisoSoloLectura({ motivo }) {
  return (
    <div className="mb-5">
      <Alerta tipo="info">{motivo}</Alerta>
    </div>
  )
}
