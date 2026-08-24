// =============================================================
//  CAPA DE DATOS DE ENSAYOS
//
//  Documento en /ensayos/{id}:
//  {
//    fecha_iso, hora, lugar, notas,
//    estado: 'abierto' | 'archivado',
//    evento_id,                  <- cita del calendario que lo origino
//    asistentes: [ { costalero_id, nombre, altura, invitado } ],
//    config: { Izquierda:{Delante,Detras}, ... },
//    cuadrante: [ ...turnos... ] | null,
//    creado, actualizado, archivado_en
//  }
// =============================================================

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, COL } from './firebase'
import { configPorDefecto } from './cuadrante'
import { hoyISO } from './calendario'
import { ALGORITMO_POR_DEFECTO } from './constantes'

export const ESTADOS = {
  abierto: {
    id: 'abierto',
    nombre: 'Abierto',
    chip: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  },
  archivado: {
    id: 'archivado',
    nombre: 'Archivado',
    chip: 'bg-slate-100 text-slate-600 border border-slate-300',
  },
}

export function ensayoVacio(datos = {}) {
  return {
    fecha_iso: datos.fecha_iso || hoyISO(),
    hora: datos.hora || '20:00',
    lugar: datos.lugar || 'San Francisco',
    notas: datos.notas || '',
    estado: 'abierto',
    evento_id: datos.evento_id || null,
    asistentes: [],
    config: configPorDefecto(),
    algoritmo: ALGORITMO_POR_DEFECTO,
    cuadrante: null,
  }
}

// --- Lectura ---
export async function leerEnsayos() {
  const snap = await getDocs(collection(db, COL.ENSAYOS))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.fecha_iso || '').localeCompare(a.fecha_iso || ''))
}

export async function leerEnsayo(id) {
  const snap = await getDoc(doc(db, COL.ENSAYOS, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// --- Escritura ---
export async function crearEnsayo(datos) {
  const ref = await addDoc(collection(db, COL.ENSAYOS), {
    ...ensayoVacio(datos),
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })
  return ref.id
}

export async function guardarEnsayo(id, cambios) {
  const { id: _o, creado: _c, ...limpio } = cambios
  await updateDoc(doc(db, COL.ENSAYOS, id), {
    ...limpio,
    actualizado: serverTimestamp(),
  })
}

export async function borrarEnsayo(id) {
  await deleteDoc(doc(db, COL.ENSAYOS, id))
}

export async function archivarEnsayo(id) {
  await updateDoc(doc(db, COL.ENSAYOS, id), {
    estado: 'archivado',
    archivado_en: serverTimestamp(),
    actualizado: serverTimestamp(),
  })
}

export async function reabrirEnsayo(id) {
  await updateDoc(doc(db, COL.ENSAYOS, id), {
    estado: 'abierto',
    archivado_en: null,
    actualizado: serverTimestamp(),
  })
}

// =============================================================
//  LISTA DE ASISTENCIA
// =============================================================

// Convierte un costalero del censo en un asistente
export function comoAsistente(costalero) {
  return {
    costalero_id: costalero.id,
    nombre: costalero.nombre,
    altura: Number(costalero.altura) || 0,
    pref_hombro: costalero.pref_hombro || '',
    invitado: false,
  }
}

export function yaAsiste(asistentes, costaleroId) {
  return asistentes.some((a) => a.costalero_id === costaleroId)
}

export function anadirAsistente(asistentes, nuevo) {
  if (nuevo.costalero_id && yaAsiste(asistentes, nuevo.costalero_id)) return asistentes
  return [...asistentes, nuevo]
}

export function quitarAsistente(asistentes, costaleroId) {
  return asistentes.filter((a) => a.costalero_id !== costaleroId)
}

// Ordena la lista de asistencia por nombre
export function ordenarAsistentes(asistentes) {
  return [...asistentes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  )
}

// Asistentes que todavia no estan colocados en el cuadrante
export function sinColocar(asistentes, idsEnCuadrante) {
  return asistentes.filter((a) => !idsEnCuadrante.has(a.costalero_id))
}
