// =============================================================
//  CAPA DE DATOS DE PROCESIONES
//
//  Documento en /procesiones/{id}:
//  {
//    tipo: 'miercoles' | 'viernes' | 'extraordinaria',
//    nombre, anio, fecha_iso,
//    estado: 'borrador' | 'publicada',
//    publicado: bool,              <- lo lee la web publica
//    lleva_cruz: bool,
//    config_trono: { Izquierda:{Delante,Detras}, ... },
//    config_cruz:  { Izquierda:{Delante,Detras}, Derecha:{...} },
//    cuadrante_trono: [ ...turnos... ] | null,
//    cuadrante_cruz:  [ ...turnos... ] | null,
//    tramos: [ { id, nombre, desde, hasta, fase, orden,
//                turno_trono, turno_cruz, texto } ],
//    recorrido: { nombre_archivo, puntos: [[lat,lng],...] } | null,
//    normativa: string,
//    notas_costalero: { [costaleroId]: 'texto' },
//    creado, actualizado, publicado_en
//  }
// =============================================================

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, COL } from './firebase'
import {
  TIPOS_PROCESION, PRESETS_PROCESION, FASES, ALGORITMO_POR_DEFECTO,
  etiquetaTurno, etiquetasTurno, indiceDeEtiqueta,
} from './constantes'
import { configPorDefecto, configCruz } from './cuadrante'

// -------------------------------------------------------------
//  CREACION
// -------------------------------------------------------------

let contadorTramo = 0
export function nuevoIdTramo() {
  contadorTramo += 1
  return `tr_${Date.now().toString(36)}_${contadorTramo}`
}

// Construye los tramos por defecto de un tipo
export function tramosPorDefecto(tipo) {
  const p = PRESETS_PROCESION[tipo] || PRESETS_PROCESION.extraordinaria
  const lista = []
  let orden = 0

  for (let i = 0; i < p.tramos_ida; i++) {
    lista.push({
      id: nuevoIdTramo(),
      nombre: `Tramo ${i + 1}`,
      desde: '',
      hasta: '',
      fase: FASES.ida.id,
      orden: orden++,
      // Reparto ciclico inicial entre los turnos disponibles
      turno_trono: etiquetaTurno(i % p.turnos_trono, 'trono'),
      turno_cruz: p.lleva_cruz ? etiquetaTurno(i % p.turnos_cruz, 'cruz') : null,
      texto: '',
    })
  }

  for (let i = 0; i < p.tramos_regreso; i++) {
    lista.push({
      id: nuevoIdTramo(),
      nombre: `Regreso ${i + 1}`,
      desde: '',
      hasta: '',
      fase: FASES.regreso.id,
      orden: orden++,
      turno_trono: etiquetaTurno(i % p.turnos_trono, 'trono'),
      // La cruz no hace el regreso
      turno_cruz: p.cruz_en_regreso ? etiquetaTurno(i % p.turnos_cruz, 'cruz') : null,
      texto: '',
    })
  }

  return lista
}

export function procesionVacia(tipo = 'miercoles', anio = new Date().getFullYear()) {
  const info = TIPOS_PROCESION[tipo] || TIPOS_PROCESION.extraordinaria
  const p = PRESETS_PROCESION[tipo] || PRESETS_PROCESION.extraordinaria

  return {
    tipo,
    anio: Number(anio),
    nombre: `${info.nombre} ${anio}`,
    fecha_iso: '',
    estado: 'borrador',
    publicado: false,
    lleva_cruz: p.lleva_cruz,
    turnos_trono: p.turnos_trono,
    turnos_cruz: p.turnos_cruz,
    config_trono: configPorDefecto(),
    config_cruz: configCruz(),
    algoritmo: ALGORITMO_POR_DEFECTO,
    cuadrante_trono: null,
    cuadrante_cruz: null,
    tramos: tramosPorDefecto(tipo),
    recorrido: null,
    normativa: '',
    notas_costalero: {},
    // Cometido de cada costalero en los tramos que NO carga.
    // Por defecto Cirio; aqui solo se guardan las excepciones.
    //   { [costaleroId]: { [tramoId]: 'Muletero' } }
    roles_descanso: {},
  }
}

// -------------------------------------------------------------
//  LECTURA
// -------------------------------------------------------------

export async function leerProcesiones() {
  const snap = await getDocs(collection(db, COL.PROCESIONES))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      (b.anio || 0) - (a.anio || 0) ||
      (a.tipo || '').localeCompare(b.tipo || '')
    )
}

export async function leerProcesion(id) {
  const snap = await getDoc(doc(db, COL.PROCESIONES, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// -------------------------------------------------------------
//  ESCRITURA
// -------------------------------------------------------------

export async function crearProcesion(datos) {
  const ref = await addDoc(collection(db, COL.PROCESIONES), {
    ...datos,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })
  return ref.id
}

export async function guardarProcesion(id, cambios) {
  const { id: _o, creado: _c, ...limpio } = cambios
  await updateDoc(doc(db, COL.PROCESIONES, id), {
    ...limpio,
    actualizado: serverTimestamp(),
  })
}

export async function borrarProcesion(id) {
  await deleteDoc(doc(db, COL.PROCESIONES, id))
}

export async function publicarProcesion(id) {
  await updateDoc(doc(db, COL.PROCESIONES, id), {
    estado: 'publicada',
    publicado: true,
    publicado_en: serverTimestamp(),
    actualizado: serverTimestamp(),
  })
}

export async function despublicarProcesion(id) {
  await updateDoc(doc(db, COL.PROCESIONES, id), {
    estado: 'borrador',
    publicado: false,
    actualizado: serverTimestamp(),
  })
}

// =============================================================
//  PROCESIONES AUTOMATICAS DEL AÑO EN CURSO
//
//  Miercoles y Viernes Santo se celebran todos los años, asi que
//  al entrar en el modulo se crean solas si faltan.
//
//  Si el cuadrillero borra una a proposito, se guarda esa
//  decision en /config/procesiones y NO se vuelve a crear.
// =============================================================

export const TIPOS_AUTOMATICOS = ['miercoles', 'viernes']

const REF_CFG_PROC = () => doc(db, COL.CONFIG, 'procesiones')

// Lee las que el cuadrillero ha borrado a proposito:
//   { "2026": ["miercoles"], "2027": [...] }
export async function leerBorradas() {
  try {
    const snap = await getDoc(REF_CFG_PROC())
    return snap.exists() ? snap.data().borradas || {} : {}
  } catch {
    return {}
  }
}

export async function marcarBorrada(anio, tipo) {
  if (!TIPOS_AUTOMATICOS.includes(tipo)) return
  const borradas = await leerBorradas()
  const delAnio = borradas[String(anio)] || []
  if (delAnio.includes(tipo)) return

  await setDoc(REF_CFG_PROC(), {
    borradas: { ...borradas, [String(anio)]: [...delAnio, tipo] },
  }, { merge: true })
}

// Crea las que falten del año en curso. Devuelve cuantas ha creado.
export async function asegurarProcesionesDelAnio(lista, anio = new Date().getFullYear()) {
  const borradas = await leerBorradas()
  const borradasEsteAnio = borradas[String(anio)] || []

  const faltan = TIPOS_AUTOMATICOS.filter((tipo) => {
    if (borradasEsteAnio.includes(tipo)) return false          // la borró a proposito
    return !lista.some((p) => p.tipo === tipo && Number(p.anio) === Number(anio))
  })

  if (!faltan.length) return { creadas: 0, tipos: [] }

  for (const tipo of faltan) {
    await crearProcesion({ ...procesionVacia(tipo, anio), automatica: true })
  }

  return { creadas: faltan.length, tipos: faltan }
}

// ¿Es una procesion de un año anterior? (va al archivo)
export function esArchivada(procesion, anio = new Date().getFullYear()) {
  return Number(procesion.anio) < Number(anio)
}

// Separa el listado en las del año en curso y el archivo historico
export function separarPorAnio(lista, anio = new Date().getFullYear()) {
  const actuales = []
  const archivo = []
  lista.forEach((p) => {
    if (esArchivada(p, anio)) archivo.push(p)
    else actuales.push(p)
  })
  return { actuales, archivo }
}

// -------------------------------------------------------------
//  DUPLICAR
//  Copia recorrido, tramos y textos. NO copia los costaleros.
// -------------------------------------------------------------
export function duplicarEstructura(origen, anioNuevo) {
  const info = TIPOS_PROCESION[origen.tipo] || TIPOS_PROCESION.extraordinaria

  return {
    tipo: origen.tipo,
    anio: Number(anioNuevo),
    nombre: `${info.nombre} ${anioNuevo}`,
    fecha_iso: '',
    estado: 'borrador',
    publicado: false,
    lleva_cruz: origen.lleva_cruz !== false,
    turnos_trono: origen.turnos_trono || 3,
    turnos_cruz: origen.turnos_cruz || 3,
    config_trono: origen.config_trono || configPorDefecto(),
    config_cruz: origen.config_cruz || configCruz(),
    algoritmo: origen.algoritmo || ALGORITMO_POR_DEFECTO,
    cuadrante_trono: null,       // sin costaleros
    cuadrante_cruz: null,
    tramos: (origen.tramos || []).map((t) => ({
      ...t,
      id: nuevoIdTramo(),
      // Los turnos asignados se conservan: la estructura es la misma
    })),
    recorrido: origen.recorrido || null,
    normativa: origen.normativa || '',
    notas_costalero: {},
    roles_descanso: {},
  }
}

// -------------------------------------------------------------
//  TRAMOS
// -------------------------------------------------------------

export function tramoVacio(fase = 'ida', orden = 0) {
  return {
    id: nuevoIdTramo(),
    nombre: '',
    desde: '',
    hasta: '',
    fase,
    orden,
    turno_trono: 'A',
    turno_cruz: null,
    texto: '',
  }
}

// Reordena la lista dejando la ida primero y el regreso despues
export function reordenarTramos(tramos) {
  const ida = tramos.filter((t) => (t.fase || 'ida') === 'ida')
  const regreso = tramos.filter((t) => t.fase === 'regreso')
  return [...ida, ...regreso].map((t, i) => ({ ...t, orden: i }))
}

export function moverTramo(tramos, id, direccion) {
  const lista = reordenarTramos(tramos)
  const i = lista.findIndex((t) => t.id === id)
  if (i < 0) return lista

  const j = i + direccion
  if (j < 0 || j >= lista.length) return lista

  // Solo se puede mover dentro de la misma fase
  if ((lista[i].fase || 'ida') !== (lista[j].fase || 'ida')) return lista

  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia.map((t, k) => ({ ...t, orden: k }))
}

// ¿Todos los tramos tienen turno de trono asignado?
export function tramosSinTurno(tramos = [], numTurnosTrono = 0) {
  return tramos.filter((t) => {
    if (!t.turno_trono) return true
    const idx = indiceDeEtiqueta(t.turno_trono)
    return idx === null || idx < 0 || idx >= numTurnosTrono
  })
}

// Etiquetas de turno disponibles
//   Trono -> A, B, C...   |   Cruz -> 1, 2, 3...
export function letrasTurno(cuantos, pieza = 'trono') {
  return etiquetasTurno(cuantos, pieza)
}

// -------------------------------------------------------------
//  FILTRADO DEL CENSO SEGUN EL TIPO
// -------------------------------------------------------------

// Costaleros que pueden ir en el TRONO de esta procesion:
// apuntados al dia, y que NO esten marcados como "solo cruz".
export function candidatosTrono(censo, tipo) {
  const info = TIPOS_PROCESION[tipo]
  if (!info) return []

  return censo.filter((c) => {
    if (info.campoCenso && !c[info.campoCenso]) return false
    if (info.campoCruz && c[info.campoCruz]) return false   // los de cruz, fuera
    return true
  })
}

// Costaleros que pueden ir en la CRUZ: solo los marcados para ella.
export function candidatosCruz(censo, tipo) {
  const info = TIPOS_PROCESION[tipo]
  if (!info) return []
  if (!info.campoCruz) {
    // En las extraordinarias no hay marca de cruz: vale cualquiera
    return info.campoCenso ? censo.filter((c) => c[info.campoCenso]) : [...censo]
  }
  return censo.filter((c) => c[info.campoCruz])
}

// Para el boton "Rellenar cruz".
// Se completa con:
//   1. Los marcados de cruz que aun no esten colocados.
//   2. Los que estan apuntados al dia pero NO han quedado en
//      ningun turno del trono (se han quedado fuera).
export function candidatosRellenarCruz(censo, tipo, { yaEnCruz, enTrono }) {
  const info = TIPOS_PROCESION[tipo]
  if (!info) return []

  const titulares = candidatosCruz(censo, tipo)
    .filter((c) => !yaEnCruz.has(c.id))

  const sueltos = censo.filter((c) => {
    if (info.campoCenso && !c[info.campoCenso]) return false   // no sale ese dia
    if (info.campoCruz && c[info.campoCruz]) return false       // ya contado arriba
    if (enTrono.has(c.id)) return false                         // esta en el trono
    if (yaEnCruz.has(c.id)) return false
    return true
  })

  return { titulares, sueltos, todos: [...titulares, ...sueltos] }
}

// Convierte un costalero del censo en ocupante de cuadrante
export function comoOcupante(c) {
  return {
    costalero_id: c.id,
    nombre: c.nombre,
    altura: Number(c.altura) || 0,
    pref_hombro: c.pref_hombro || '',
    bloqueado: false,
  }
}

// Indice por id, para consultas rapidas
export function indexarCenso(censo) {
  const m = {}
  censo.forEach((c) => { m[c.id] = c })
  return m
}
