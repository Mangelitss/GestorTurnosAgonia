// =============================================================
//  PIEZAS SUELTAS DE INTERFAZ
// =============================================================

export function Cargando({ texto = 'Conectando con la Mayordomía…' }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 animate-aparecer">
      <div className="h-9 w-9 rounded-full border-[3px] border-morado-light border-t-oro animate-spin" />
      <p className="text-sm font-semibold text-oro-light/70">{texto}</p>
    </div>
  )
}

export function Aviso({ tipo = 'info', children }) {
  const estilos = {
    info: 'border-oro/30 bg-oro/5 text-crema',
    error: 'border-red-500/40 bg-red-950/40 text-red-200',
    quieto: 'border-morado-light/40 bg-morado-dark/50 text-oro-light/70',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${estilos[tipo]}`}>
      {children}
    </div>
  )
}

export function Vacio({ icono = '·', titulo, texto }) {
  return (
    <div className="py-14 text-center">
      <p className="mb-3 text-3xl opacity-60">{icono}</p>
      <p className="titulo mb-1.5 text-base">{titulo}</p>
      {texto && <p className="mx-auto max-w-md text-sm text-oro-light/50">{texto}</p>}
    </div>
  )
}

// Separador con titulo centrado, al estilo de los encabezados del folio
export function Rotulo({ children }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-oro/25" />
      <h2 className="titulo text-sm">{children}</h2>
      <span className="h-px flex-1 bg-oro/25" />
    </div>
  )
}
