// =============================================================
//  WEB DE COSTALEROS — NUCLEO COMPARTIDO
//
//  Codigo puro, sin Firebase. Lo usan el panel (para publicar)
//  y el portal (para leer), este ultimo por el alias @nucleo.
//
//  COMO SE PROTEGE
//  ---------------
//  Lo publicado NO vive en /procesiones ni en /ensayos: se hace
//  una copia limpia en un unico documento
//
//      /portal/{clave}
//
//  donde  clave = PBKDF2(codigo)  en hexadecimal. Las reglas
//  dejan leer ese documento por su id pero prohiben listar la
//  coleccion, asi que sin el codigo no hay forma de dar con el.
//
//  - El codigo nunca viaja ni se guarda en el portal: solo su clave.
//  - El PBKDF2 hace que cada intento cueste, lo que frena a quien
//    pruebe codigos a lo bruto.
//  - La copia solo lleva lo que el costalero necesita: nombres,
//    puestos, tramos y textos. Nada de alturas, telefonos ni censo.
//  - Cambiar el codigo borra la copia vieja: el codigo antiguo deja
//    de valer en el acto.
// =============================================================

import { ocupantes } from './cuadrante'

// -------------------------------------------------------------
//  CODIGO DE ACCESO
// -------------------------------------------------------------

export const CODIGO_MINIMO = 3
export const CODIGO_MAXIMO = 20

// Los costaleros lo teclean en el movil: da igual mayusculas,
// tildes o espacios. "Cristo Agonía 2027" == "cristoagonia2027".
export function normalizarCodigo(codigo) {
  return String(codigo || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

// Devuelve un texto con el problema, o null si vale
export function problemaCodigo(codigo) {
  const c = normalizarCodigo(codigo)
  if (c.length < CODIGO_MINIMO || c.length > CODIGO_MAXIMO) {
    return `Tiene que tener entre ${CODIGO_MINIMO} y ${CODIGO_MAXIMO} caracteres (sin contar espacios).`
  }
  return null
}

// Parametros del PBKDF2. Si se cambian, todos los codigos dejan
// de valer: habria que volver a guardar el codigo en el panel.
const SAL = 'agonia.portal.v1'
const ITERACIONES = 600000

// Id del documento del portal a partir del codigo (64 hex)
export async function claveDeCodigo(codigo) {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey(
    'raw', enc.encode(normalizarCodigo(codigo)), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SAL), iterations: ITERACIONES },
    base,
    256
  )
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function esClaveValida(clave) {
  return /^[0-9a-f]{64}$/.test(String(clave || ''))
}

// -------------------------------------------------------------
//  INFORMACION DE LA PROCESION PARA LA WEB
//  Se guarda en  procesion.info_web
// -------------------------------------------------------------

export function infoWebVacia() {
  return {
    citacion_hora: '',
    citacion_lugar: '',
    salida_hora: '',
    recogida_hora: '',
    tener_en_cuenta: '',
    avisos: [],
  }
}

export function infoWeb(item) {
  return { ...infoWebVacia(), ...(item?.info_web || {}) }
}

// -------------------------------------------------------------
//  NOMBRES
// -------------------------------------------------------------

// El generador marca a los repetidores con "(R)". Para el costalero
// eso es ruido: el color ya dice que repite.
export function limpiarNombre(nombre) {
  return String(nombre || '')
    .replace(/\s*\((R|C|C-Doble)\)\s*/gi, ' ')
    .trim()
}

// -------------------------------------------------------------
//  COPIA LIMPIA DE LO PUBLICADO
// -------------------------------------------------------------

// Los ids del censo no salen: se cambian por p1, p2... dentro de
// cada publicacion. Asi la web no expone ningun identificador real.
function seudonimos() {
  const mapa = new Map()
  return (id) => {
    if (!id) return null
    if (!mapa.has(id)) mapa.set(id, `p${mapa.size + 1}`)
    return mapa.get(id)
  }
}

// Solo nombre e id: fuera alturas, hombros, bloqueos...
function limpiarCuadrante(cuadrante, alias) {
  if (!Array.isArray(cuadrante) || !cuadrante.length) return null
  return cuadrante.map((turno) => {
    const varas = {}
    Object.entries(turno.varas || {}).forEach(([vara, secs]) => {
      varas[vara] = {}
      Object.entries(secs || {}).forEach(([sec, lista]) => {
        varas[vara][sec] = (lista || []).map((p) =>
          p ? { costalero_id: alias(p.costalero_id), nombre: limpiarNombre(p.nombre) } : null
        )
      })
    })
    return { id: turno.id, varas }
  })
}

// { idReal: valor }  ->  { alias: valor }, quitando lo vacio
function rebautizar(objeto, alias) {
  const salida = {}
  Object.entries(objeto || {}).forEach(([id, valor]) => {
    if (typeof valor === 'string' && !valor.trim()) return
    const a = alias(id)
    if (!a) return
    salida[a] = valor
  })
  return salida
}

function textoLimpio(s) {
  return String(s || '').trim()
}

export function instantaneaProcesion(p) {
  const alias = seudonimos()
  const info = infoWeb(p)

  // Primero los cuadrantes, para que los alias salgan en orden de puesto
  const cuadrante_trono = limpiarCuadrante(p.cuadrante_trono, alias)
  const cuadrante_cruz = p.lleva_cruz ? limpiarCuadrante(p.cuadrante_cruz, alias) : null

  return {
    id: p.id,
    clase: 'procesion',
    tipo: p.tipo || 'extraordinaria',
    nombre: p.nombre || '',
    anio: p.anio || null,
    fecha_iso: p.fecha_iso || '',
    lleva_cruz: !!p.lleva_cruz && !!cuadrante_cruz,
    info: {
      citacion_hora: textoLimpio(info.citacion_hora),
      citacion_lugar: textoLimpio(info.citacion_lugar),
      salida_hora: textoLimpio(info.salida_hora),
      recogida_hora: textoLimpio(info.recogida_hora),
      tener_en_cuenta: textoLimpio(info.tener_en_cuenta),
      avisos: (info.avisos || []).map(textoLimpio).filter(Boolean),
    },
    normativa: textoLimpio(p.normativa),
    tramos: (p.tramos || []).map((t) => ({
      id: t.id,
      nombre: t.nombre || '',
      desde: t.desde || '',
      hasta: t.hasta || '',
      fase: t.fase || 'ida',
      orden: t.orden ?? 0,
      turno_trono: t.turno_trono || null,
      turno_cruz: p.lleva_cruz ? t.turno_cruz || null : null,
      texto: textoLimpio(t.texto),
    })),
    cuadrante_trono,
    cuadrante_cruz,
    notas_costalero: rebautizar(p.notas_costalero, alias),
    roles_descanso: rebautizar(p.roles_descanso, alias),
  }
}

export function instantaneaEnsayo(e) {
  const alias = seudonimos()
  const info = infoWeb(e)

  return {
    id: e.id,
    clase: 'ensayo',
    tipo: 'ensayo',
    nombre: 'Ensayo',
    fecha_iso: e.fecha_iso || '',
    info: {
      citacion_hora: textoLimpio(e.hora),
      citacion_lugar: textoLimpio(e.lugar),
      tener_en_cuenta: textoLimpio(e.notas),
      avisos: (info.avisos || []).map(textoLimpio).filter(Boolean),
    },
    cuadrante: limpiarCuadrante(e.cuadrante, alias),
  }
}

// Orden en la web: Miercoles, Viernes, extraordinarias, ensayos por fecha
const PESO_TIPO = { miercoles: 0, viernes: 1, extraordinaria: 2, ensayo: 3 }

export function ordenarPublicaciones(lista) {
  return [...lista].sort((a, b) =>
    (PESO_TIPO[a.tipo] ?? 9) - (PESO_TIPO[b.tipo] ?? 9) ||
    String(a.fecha_iso || '').localeCompare(String(b.fecha_iso || ''))
  )
}

export function construirPortal({ procesiones = [], ensayos = [] }) {
  return {
    version: 1,
    publicaciones: ordenarPublicaciones([
      ...procesiones.map(instantaneaProcesion),
      ...ensayos.map(instantaneaEnsayo),
    ]),
  }
}

// Firestore no admite documentos de mas de 1 MiB. Se deja margen.
export const TAMANO_MAXIMO = 900 * 1024

export function tamanoAproximado(portal) {
  return new TextEncoder().encode(JSON.stringify(portal)).length
}

// -------------------------------------------------------------
//  COLORES DEL CUADRANTE (lo que explica la leyenda)
// -------------------------------------------------------------

export const MARCAS = {
  repite_trono: {
    id: 'repite_trono',
    nombre: 'Repite en el trono',
    descripcion: 'Carga en más de un turno del trono.',
  },
  repite_cruz: {
    id: 'repite_cruz',
    nombre: 'Repite en la cruz',
    descripcion: 'Carga en más de un turno de la cruz guía.',
  },
  trono_y_cruz: {
    id: 'trono_y_cruz',
    nombre: 'Trono y cruz',
    descripcion: 'Carga en el trono y también en la cruz guía.',
  },
  repite: {
    id: 'repite',
    nombre: 'Repite turno',
    descripcion: 'Sale en más de un turno del ensayo.',
  },
}

function turnosDe(cuadrante) {
  const mapa = {}
  if (!cuadrante) return mapa
  ocupantes(cuadrante).forEach(({ ref, p }) => {
    if (!p.costalero_id) return
    if (!mapa[p.costalero_id]) mapa[p.costalero_id] = new Set()
    mapa[p.costalero_id].add(ref.t)
  })
  return mapa
}

// id -> marca (una sola, la mas llamativa)
export function marcasDe(pub) {
  const salida = {}
  if (!pub) return salida

  if (pub.clase === 'ensayo') {
    Object.entries(turnosDe(pub.cuadrante)).forEach(([id, t]) => {
      if (t.size > 1) salida[id] = 'repite'
    })
    return salida
  }

  const trono = turnosDe(pub.cuadrante_trono)
  const cruz = turnosDe(pub.cuadrante_cruz)
  const ids = new Set([...Object.keys(trono), ...Object.keys(cruz)])

  ids.forEach((id) => {
    if (trono[id] && cruz[id]) salida[id] = 'trono_y_cruz'
    else if (trono[id]?.size > 1) salida[id] = 'repite_trono'
    else if (cruz[id]?.size > 1) salida[id] = 'repite_cruz'
  })
  return salida
}

// Marcas que aparecen de verdad en una publicacion (para no
// enseñar en la leyenda colores que no salen)
export function marcasPresentes(marcas) {
  const usadas = new Set(Object.values(marcas))
  return Object.values(MARCAS).filter((m) => usadas.has(m.id))
}
