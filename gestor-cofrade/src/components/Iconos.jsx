// =============================================================
//  ICONOS DEL PANEL
//  Trazo fino y uniforme, en el color del texto que los rodea.
//  Se piden por nombre, o por el emoji que sustituyen (asi las
//  pantallas que pasan  icono="👥"  siguen funcionando).
// =============================================================

const TRAZOS = {
  casa: 'M3.5 10.5 12 3.5l8.5 7M5.5 9v10.5h13V9M9.75 19.5v-6h4.5v6',
  personas: 'M16 20v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20M9.25 11a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM21.5 20v-1.5a4 4 0 0 0-3-3.87M15.5 3.63a3.75 3.75 0 0 1 0 7.24',
  cruz: 'M12 2.5v19M6.5 8h11',
  portapapeles: 'M9 4.5H6.5A1.5 1.5 0 0 0 5 6v14a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V6a1.5 1.5 0 0 0-1.5-1.5H15M9.5 2.75h5a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-.75.75h-5a.75.75 0 0 1-.75-.75V3.5a.75.75 0 0 1 .75-.75ZM8.5 11h7M8.5 15h7',
  calendario: 'M6.5 4.5h11A2.5 2.5 0 0 1 20 7v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5V7a2.5 2.5 0 0 1 2.5-2.5ZM8 2.5v4M16 2.5v4M4 10h16',
  globo: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM2.5 12h19M12 2.5c2.6 2.7 4 6 4 9.5s-1.4 6.8-4 9.5c-2.6-2.7-4-6-4-9.5s1.4-6.8 4-9.5Z',
  llave: 'M15.5 14a5.5 5.5 0 1 0-5.2-3.7L3 17.6V21h3.4v-2.2h2.2v-2.2h2.1l1.1-1.1a5.5 5.5 0 0 0 3.7-1.5ZM17 7.5h.01',
  corona: 'M4 18.5h16M4.5 15.5 3 7l5 3.5L12 4.5l4 6L21 7l-1.5 8.5h-15Z',
  salir: 'M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5M16 16.5 20.5 12 16 7.5M20.5 12H9.5',
  mas: 'M12 5v14M5 12h14',
  lapiz: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4 12-12Z',
  papelera: 'M4 6.5h16M9.5 6.5V4.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75V6.5M6 6.5l.9 13a1.5 1.5 0 0 0 1.5 1.5h7.2a1.5 1.5 0 0 0 1.5-1.5l.9-13M10 11v5.5M14 11v5.5',
  ojo: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ojoTachado: 'M3.5 3.5l17 17M10 5.7a9 9 0 0 1 2-.2c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7M6.3 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.3-1.1M10 10a3 3 0 0 0 4.1 4.1',
  ajustes: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  documento: 'M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5l-5-5ZM14 2.5v5h5M8.5 13h7M8.5 17h7',
  enlace: 'M10 14a4.5 4.5 0 0 0 6.4.1l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4-.1l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2',
  deshacer: 'M8.5 5 4 9.5 8.5 14M4 9.5h10.5a5.5 5.5 0 0 1 0 11H10',
  importar: 'M12 3v11.5M7.5 10l4.5 4.5 4.5-4.5M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5',
  exportar: 'M12 14.5V3M7.5 7.5 12 3l4.5 4.5M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5',
  lupa: 'M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM21 21l-4.6-4.6',
  repetir: 'M17 2.5l4 4-4 4M3 11.5v-1a4 4 0 0 1 4-4h14M7 21.5l-4-4 4-4M21 12.5v1a4 4 0 0 1-4 4H3',
  candado: 'M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V12a1.5 1.5 0 0 1 1.5-1.5ZM8 10.5V7a4 4 0 1 1 8 0v3.5',
  abierto: 'M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V12a1.5 1.5 0 0 1 1.5-1.5ZM8 10.5V7a4 4 0 0 1 7.7-1.5',
  archivo: 'M3.5 4h17v4.5h-17V4ZM5 8.5V20h14V8.5M10 12.5h4',
  refrescar: 'M20.5 11.5A8.5 8.5 0 0 0 6 6.3L3.5 8.5M3.5 3.5v5h5M3.5 12.5A8.5 8.5 0 0 0 18 17.7l2.5-2.2M20.5 20.5v-5h-5',
  chincheta: 'M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  pausa: 'M9 5v14M15 5v14',
  mapa: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4ZM9 4v14M15 6v14',
  carpeta: 'M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z',
  copiar: 'M9.5 8.5h9A1.5 1.5 0 0 1 20 10v9.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 19.5V10a1.5 1.5 0 0 1 1.5-1.5ZM16 8.5v-4A1.5 1.5 0 0 0 14.5 3h-9A1.5 1.5 0 0 0 4 4.5V14a1.5 1.5 0 0 0 1.5 1.5H8',
  subir: 'M12 20V5M6 11l6-6 6 6',
  atencion: 'M12 4 2.5 20.5h19L12 4ZM12 10v5M12 18h.01',
  prohibido: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM5.5 5.5l13 13',
  info: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM12 11v6M12 7.5h.01',
  visto: 'm4.5 12.5 5 5 10-11',
  altavoz: 'M3.5 10v4l13 5V5l-13 5ZM7.5 15.5V19a1.5 1.5 0 0 0 3 0v-2M19.5 9.5a3.5 3.5 0 0 1 0 5',
  rayo: 'M13 2.5 4.5 14H12l-1 7.5L19.5 10H12l1-7.5Z',
  grafica: 'M4 20.5h16M7 17v-5M12 17V6M17 17V9',
  cerrar: 'M6 6l12 12M18 6 6 18',
  externo: 'M8 16 18.5 5.5M9.5 5.5h9v9',
  limpiar: 'M15 4l5 5-9.5 9.5H6L3.5 16 15 4ZM6 18.5h14',
  bandeja: 'M3 13.5 5.5 5h13L21 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-5.5ZM3 13.5h5.5l1.5 2.5h4l1.5-2.5H21',
}

const POR_EMOJI = {
  '🏠': 'casa', '👥': 'personas', '✝️': 'cruz', '✝': 'cruz', '📋': 'portapapeles', '📅': 'calendario',
  '🌐': 'globo', '🔑': 'llave', '👑': 'corona', '➕': 'mas', '✏️': 'lapiz', '🗑️': 'papelera',
  '👁️': 'ojo', '🙈': 'ojoTachado', '⚙️': 'ajustes', '📄': 'documento', '📜': 'documento',
  '🔗': 'enlace', '↩️': 'deshacer', '📥': 'importar', '💾': 'exportar', '🔍': 'lupa', '🔎': 'lupa',
  '🔁': 'repetir', '🔒': 'candado', '🔓': 'abierto', '📦': 'archivo', '🔄': 'refrescar',
  '📍': 'chincheta', '⏸️': 'pausa', '🗺️': 'mapa', '📁': 'carpeta', '📑': 'copiar', '⬆️': 'subir',
  '⚠️': 'atencion', '⛔': 'prohibido', 'ℹ️': 'info', '✓': 'visto', '✅': 'visto', '📢': 'altavoz',
  '⚡': 'rayo', '📊': 'grafica', '❌': 'cerrar', '↗': 'externo', '🧹': 'limpiar', '📭': 'bandeja',
  '🚧': 'atencion', '💪': 'visto',
}

export function Icono({ nombre, e, tam = 16, grosor = 1.7, className = '' }) {
  const d = TRAZOS[nombre] || TRAZOS[POR_EMOJI[e]]
  if (!d) return null
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
    >
      <path d={d} />
    </svg>
  )
}

// Las procesiones llevan una letra (M, V, E) en vez de un dibujo
export function esLetra(icono) {
  return typeof icono === 'string' && /^[A-Z]$/.test(icono)
}
