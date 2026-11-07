// =============================================================
//  CONSTANTES DEL DOMINIO COFRADE
// =============================================================

// --- TRONO ---
export const VARAS = ['Izquierda', 'Centro', 'Derecha']
export const SECCIONES = ['Delante', 'Detras']
export const COSTALEROS_POR_SECCION = 6 // 6 delante + 6 detras por vara
export const COSTALEROS_TRONO_TURNO = VARAS.length * SECCIONES.length * COSTALEROS_POR_SECCION // 36

// --- CRUZ GUIA ---
// 2 varas (Izquierda y Derecha), cada una con 2 delante y 2 detras = 8
export const VARAS_CRUZ = ['Izquierda', 'Derecha']
export const COSTALEROS_POR_SECCION_CRUZ = 2
export const COSTALEROS_CRUZ_TURNO =
  VARAS_CRUZ.length * SECCIONES.length * COSTALEROS_POR_SECCION_CRUZ // 8
// Por debajo de este numero de ocupantes se avisa; entre 4 y 8 no se dice nada
export const CRUZ_MINIMO_SIN_AVISO = 4

// --- PESOS (para el mapa de calor) ---
export const PESO_TRONO_KG = 1200
export const PESO_CRUZ_KG = 200
export const LIMITE_PESO_PERSONA = 90

// --- PIEZAS QUE SE PORTAN ---
export const PIEZAS = {
  trono: {
    id: 'trono',
    nombre: 'Trono',
    icono: '✝️',
    varas: VARAS,
    porSeccion: COSTALEROS_POR_SECCION,
    peso: PESO_TRONO_KG,
    // Color del costalero cuando carga esta pieza
    color: 'bg-morado text-white border-morado-light',
    chip: 'bg-morado/10 text-morado border border-morado/30',
    punto: 'bg-morado',
  },
  cruz: {
    id: 'cruz',
    nombre: 'Cruz Guía',
    icono: '✚',
    varas: VARAS_CRUZ,
    porSeccion: COSTALEROS_POR_SECCION_CRUZ,
    peso: PESO_CRUZ_KG,
    color: 'bg-sky-600 text-white border-sky-500',
    chip: 'bg-sky-100 text-sky-800 border border-sky-300',
    punto: 'bg-sky-500',
  },
}

// --- TIPOS DE PROCESION ---
export const TIPOS_PROCESION = {
  miercoles: {
    id: 'miercoles',
    nombre: 'Miércoles Santo',
    corto: 'Miércoles',
    icono: 'M',
    campoCenso: 'miercoles_santo',
    campoCruz: 'cruz_miercoles',
  },
  viernes: {
    id: 'viernes',
    nombre: 'Viernes Santo',
    corto: 'Viernes',
    icono: 'V',
    campoCenso: 'viernes_santo',
    campoCruz: 'cruz_viernes',
  },
  extraordinaria: {
    id: 'extraordinaria',
    nombre: 'Procesión Extraordinaria',
    corto: 'Extraordinaria',
    icono: '⚙️',
    campoCenso: null,   // entra todo el censo
    campoCruz: null,
  },
}

// --- FASES DEL RECORRIDO ---
export const FASES = {
  ida: { id: 'ida', nombre: 'Ida', icono: '→' },
  regreso: { id: 'regreso', nombre: 'Regreso', icono: '←' },
}

// --- HOMBRO PREFERIDO ---
export const OPCIONES_HOMBRO = ['', 'Izquierdo', 'Derecho']

// =============================================================
//  ALGORITMOS DE COLOCACION
// =============================================================
export const ALGORITMOS = {
  V: {
    id: 'V',
    nombre: 'Algoritmo V',
    resumen: 'Zigzag empezando por el Centro',
    descripcion:
      'Reparte en zigzag: Centro, Izquierda, Derecha, Centro, Derecha, Izquierda… ' +
      'Los más altos caen en la vara del Centro. Dentro de cada vara se llena desde ' +
      'la punta hacia el trono.',
    detalle: [
      'Los primeros van delante y el resto detrás.',
      'Cada mitad se reparte en tríos que alternan Izquierda y Derecha.',
      'Los huecos que sobren quedan pegados al trono.',
    ],
  },
  U: {
    id: 'U',
    nombre: 'Algoritmo U',
    resumen: 'Las tres varas se llenan a la vez',
    descripcion:
      'Reparte llenando las puntas de las tres varas al mismo tiempo y va bajando ' +
      'hacia el trono. Forma una U simétrica entre las dos mitades.',
    detalle: [
      'Los seis más altos ocupan las puntas delantera y trasera de las tres varas.',
      'Se avanza fila a fila hacia el trono.',
      'Reparto muy homogéneo entre varas, sin priorizar el Centro.',
    ],
  },
}

export const ALGORITMO_POR_DEFECTO = 'V'
export const LISTA_ALGORITMOS = [ALGORITMOS.V, ALGORITMOS.U]

// --- VALORES POR DEFECTO SEGUN EL TIPO ---
//  Miercoles: 3 turnos de trono, 3 de cruz, 3 tramos (sin regreso)
//  Viernes:   3 turnos de trono, 4 de cruz, 4 tramos de ida + 3 de regreso
//             (la cruz NO hace el regreso)
export const PRESETS_PROCESION = {
  miercoles: {
    turnos_trono: 3,
    turnos_cruz: 3,
    tramos_ida: 3,
    tramos_regreso: 0,
    lleva_cruz: true,
    cruz_en_regreso: false,
  },
  viernes: {
    turnos_trono: 3,
    turnos_cruz: 4,
    tramos_ida: 4,
    tramos_regreso: 3,
    lleva_cruz: true,
    cruz_en_regreso: false,
  },
  extraordinaria: {
    turnos_trono: 2,
    turnos_cruz: 2,
    tramos_ida: 2,
    tramos_regreso: 0,
    lleva_cruz: false,
    cruz_en_regreso: false,
  },
}

// =============================================================
//  CONFLICTOS
//  Solo el ROJO impide publicar.
// =============================================================
export const CONFLICTOS = {
  DUPLICADO: {
    id: 'DUPLICADO',
    nombre: 'Duplicado o hombro equivocado',
    corto: 'Bloqueante',
    descripcion:
      'El costalero ocupa dos posiciones a la vez en el mismo turno o tramo, ' +
      'o está en una vara que no corresponde con su hombro.',
    color: 'rojo',
    clases: 'bg-red-600 text-white border-red-700 animate-pulse-fast',
    chip: 'bg-red-100 text-red-800 border border-red-300',
    punto: 'bg-red-600',
    bloquea_publicacion: true,
    prioridad: 1,
  },
  TRAMOS_CONSECUTIVOS: {
    id: 'TRAMOS_CONSECUTIVOS',
    nombre: 'Tramos consecutivos',
    corto: 'Seguidos',
    descripcion: 'Carga en dos tramos seguidos sin descanso. Entre la ida y el regreso no cuenta, porque hay parada.',
    color: 'naranja',
    clases: 'bg-orange-500 text-white border-orange-600',
    chip: 'bg-orange-100 text-orange-800 border border-orange-300',
    punto: 'bg-orange-500',
    bloquea_publicacion: false,
    prioridad: 2,
  },
  REPITE_TRONO: {
    id: 'REPITE_TRONO',
    nombre: 'Repite en el trono',
    corto: 'Repite trono',
    descripcion: 'Está asignado a más de un turno del trono.',
    color: 'amarillo',
    clases: 'bg-yellow-400 text-yellow-950 border-yellow-500',
    chip: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    punto: 'bg-yellow-400',
    bloquea_publicacion: false,
    prioridad: 3,
  },
  REPITE_CRUZ: {
    id: 'REPITE_CRUZ',
    nombre: 'Repite en la cruz',
    corto: 'Repite cruz',
    descripcion: 'Está asignado a más de un turno de la cruz guía.',
    color: 'azul',
    clases: 'bg-sky-500 text-white border-sky-600',
    chip: 'bg-sky-100 text-sky-800 border border-sky-300',
    punto: 'bg-sky-500',
    bloquea_publicacion: false,
    prioridad: 4,
  },
  TRONO_Y_CRUZ: {
    id: 'TRONO_Y_CRUZ',
    nombre: 'Trono y cruz',
    corto: 'Trono + cruz',
    descripcion: 'Carga tanto en el trono como en la cruz guía, en tramos distintos.',
    color: 'verde',
    clases: 'bg-emerald-500 text-white border-emerald-600',
    chip: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    punto: 'bg-emerald-500',
    bloquea_publicacion: false,
    prioridad: 5,
  },
}

// Lista ordenada, para leyendas y paneles
export const LISTA_CONFLICTOS = Object.values(CONFLICTOS)
  .sort((a, b) => a.prioridad - b.prioridad)

export const CONFLICTOS_QUE_BLOQUEAN = LISTA_CONFLICTOS
  .filter((c) => c.bloquea_publicacion)
  .map((c) => c.id)

// --- ESTADOS DE UNA PROCESION ---
export const ESTADOS_PROCESION = {
  borrador: {
    id: 'borrador',
    nombre: 'Borrador',
    chip: 'bg-slate-100 text-slate-600 border border-slate-300',
  },
  publicada: {
    id: 'publicada',
    nombre: 'Publicada',
    chip: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  },
}

// =============================================================
//  ETIQUETAS DE LOS TURNOS
//    Trono -> letras:  A, B, C, D...
//    Cruz  -> numeros: 1, 2, 3, 4...
// =============================================================

// Convierte 0 -> "A", 1 -> "B", 2 -> "C"...
export const letraTurno = (i) => String.fromCharCode(65 + i)

// Etiqueta segun la pieza que se porta
export function etiquetaTurno(indice, pieza = 'trono') {
  return pieza === 'cruz' ? String(indice + 1) : letraTurno(indice)
}

// Camino inverso: "C" -> 2  |  "3" -> 2
export function indiceDeEtiqueta(etiqueta) {
  if (etiqueta === null || etiqueta === undefined || etiqueta === '') return null
  if (typeof etiqueta === 'number') return etiqueta

  const txt = String(etiqueta).trim()
  if (/^\d+$/.test(txt)) return Number(txt) - 1          // cruz
  return txt.toUpperCase().charCodeAt(0) - 65            // trono
}

// Lista de etiquetas disponibles
export function etiquetasTurno(cuantos, pieza = 'trono') {
  return Array.from({ length: Math.max(0, cuantos) }, (_, i) => etiquetaTurno(i, pieza))
}

// Marcador de posicion vacia dentro de un cuadrante
export const HUECO_LIBRE = { costalero_id: null, nombre: 'HUECO LIBRE', altura: 0 }
