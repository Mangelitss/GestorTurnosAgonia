// =============================================================
//  CAPA DE DATOS DEL CALENDARIO
//  Los eventos guardan la fecha completa (con anio) pero en la
//  interfaz solo se muestra "05 de Marzo".
// =============================================================

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, COL } from './firebase'
import { normalizar } from './censo'

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// --- Valores base (siempre disponibles, no se pueden borrar) ---
export const TIPOS_BASE = [
  'Ensayo',
  'Reunión de Costaleros',
  'Mudá del Trono',
  'Misa de Hermandad',
]

export const LUGARES_BASE = [
  'San Francisco',
  'Santuario de Monserrate',
  'Casa de Hermandad',
  'As de Oros',
]

// Color e icono por tipo (los tipos nuevos usan el estilo por defecto)
export const ESTILO_TIPO = {
  'Ensayo': { icono: '📋', chip: 'bg-oro/20 text-oro-dark border-oro/40', punto: 'bg-oro' },
  'Reunión de Costaleros': { icono: '💬', chip: 'bg-sky-100 text-sky-800 border-sky-300', punto: 'bg-sky-500' },
  'Mudá del Trono': { icono: '🛠️', chip: 'bg-amber-100 text-amber-800 border-amber-300', punto: 'bg-amber-500' },
  'Misa de Hermandad': { icono: '⛪', chip: 'bg-morado/10 text-morado border-morado/30', punto: 'bg-morado' },
}

export const ESTILO_POR_DEFECTO = {
  icono: '📌',
  chip: 'bg-slate-100 text-slate-700 border-slate-300',
  punto: 'bg-slate-400',
}

export function estiloTipo(tipo) {
  return ESTILO_TIPO[tipo] || ESTILO_POR_DEFECTO
}

// =============================================================
//  FECHAS
// =============================================================

// "2027-03-05" -> "05 de Marzo"
export function fechaBonita(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d} de ${MESES[Number(m) - 1]}`
}

// "2027-03-05" -> "05 de Marzo de 2027"
export function fechaBonitaConAnio(iso) {
  if (!iso) return '—'
  const [a] = iso.split('-')
  return `${fechaBonita(iso)} de ${a}`
}

// Date -> "2027-03-05" (sin desfase de zona horaria)
export function aISO(fecha) {
  const a = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function hoyISO() {
  return aISO(new Date())
}

// Nombre del dia de la semana de una fecha ISO
export function diaSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const idx = (new Date(a, m - 1, d).getDay() + 6) % 7 // lunes = 0
  return DIAS_SEMANA[idx]
}

// Construye la rejilla del mes: 6 semanas x 7 dias, empezando en lunes
export function rejillaMes(anio, mes) {
  const primero = new Date(anio, mes, 1)
  const desplazamiento = (primero.getDay() + 6) % 7 // lunes = 0
  const inicio = new Date(anio, mes, 1 - desplazamiento)

  const celdas = []
  for (let i = 0; i < 42; i++) {
    const f = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)
    celdas.push({
      iso: aISO(f),
      dia: f.getDate(),
      delMes: f.getMonth() === mes,
      esHoy: aISO(f) === hoyISO(),
    })
  }
  return celdas
}

// =============================================================
//  EVENTOS
// =============================================================

export function eventoVacio(fechaISO) {
  return {
    fecha_iso: fechaISO || hoyISO(),
    hora: '20:00',
    tipo: 'Ensayo',
    lugar: 'San Francisco',
    indicaciones: '',
    ensayo_id: null,
  }
}

export async function leerEventos() {
  const snap = await getDocs(collection(db, COL.CALENDARIO))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      (a.fecha_iso || '').localeCompare(b.fecha_iso || '') ||
      (a.hora || '').localeCompare(b.hora || '')
    )
}

export async function crearEvento(datos) {
  const ref = await addDoc(collection(db, COL.CALENDARIO), {
    ...datos,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })
  return ref.id
}

export async function actualizarEvento(id, datos) {
  const { id: _o, creado: _c, ...limpio } = datos
  await updateDoc(doc(db, COL.CALENDARIO, id), {
    ...limpio,
    actualizado: serverTimestamp(),
  })
}

export async function borrarEvento(id) {
  await deleteDoc(doc(db, COL.CALENDARIO, id))
}

// Agrupa los eventos por fecha ISO para pintar la rejilla
export function agruparPorFecha(eventos) {
  const mapa = {}
  eventos.forEach((e) => {
    if (!e.fecha_iso) return
    if (!mapa[e.fecha_iso]) mapa[e.fecha_iso] = []
    mapa[e.fecha_iso].push(e)
  })
  Object.values(mapa).forEach((lista) =>
    lista.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
  )
  return mapa
}

// Proximos eventos a partir de hoy
export function proximos(eventos, cuantos = 5) {
  const hoy = hoyISO()
  return eventos.filter((e) => e.fecha_iso >= hoy).slice(0, cuantos)
}

// =============================================================
//  TIPOS Y LUGARES PERSONALIZADOS
//  Se guardan en /config/calendario -> { tipos: [], lugares: [] }
// =============================================================

const REF_CFG = () => doc(db, COL.CONFIG, 'calendario')

export async function leerOpciones() {
  try {
    const snap = await getDoc(REF_CFG())
    const d = snap.exists() ? snap.data() : {}
    return {
      tipos: unir(TIPOS_BASE, d.tipos),
      lugares: unir(LUGARES_BASE, d.lugares),
    }
  } catch {
    return { tipos: [...TIPOS_BASE], lugares: [...LUGARES_BASE] }
  }
}

function unir(base, extra) {
  const lista = [...base]
  ;(extra || []).forEach((x) => {
    if (!lista.some((y) => normalizar(y) === normalizar(x))) lista.push(x)
  })
  return lista
}

async function leerExtras() {
  const snap = await getDoc(REF_CFG())
  const d = snap.exists() ? snap.data() : {}
  return { tipos: d.tipos || [], lugares: d.lugares || [] }
}

export async function anadirOpcion(campo, valor) {
  const limpio = String(valor || '').trim()
  if (!limpio) throw new Error('Escribe un nombre válido.')

  const base = campo === 'tipos' ? TIPOS_BASE : LUGARES_BASE
  const extras = await leerExtras()
  const todos = [...base, ...extras[campo]]

  if (todos.some((x) => normalizar(x) === normalizar(limpio))) {
    throw new Error('Ese valor ya existe en la lista.')
  }

  const nuevos = [...extras[campo], limpio]
  await setDoc(REF_CFG(), { [campo]: nuevos }, { merge: true })
  return unir(base, nuevos)
}

export async function borrarOpcion(campo, valor) {
  const base = campo === 'tipos' ? TIPOS_BASE : LUGARES_BASE
  if (base.some((x) => normalizar(x) === normalizar(valor))) {
    throw new Error('Los valores base no se pueden borrar.')
  }
  const extras = await leerExtras()
  const nuevos = extras[campo].filter((x) => normalizar(x) !== normalizar(valor))
  await setDoc(REF_CFG(), { [campo]: nuevos }, { merge: true })
  return unir(base, nuevos)
}

// ¿Es un valor de la lista base? (no borrable)
export function esBase(campo, valor) {
  const base = campo === 'tipos' ? TIPOS_BASE : LUGARES_BASE
  return base.some((x) => normalizar(x) === normalizar(valor))
}
