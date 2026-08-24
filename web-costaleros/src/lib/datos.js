// =============================================================
//  LECTURA PUBLICA DE DATOS
//
//  Todo lo de aqui funciona SIN iniciar sesion. Las reglas solo
//  permiten:
//    - /procesiones  con  publicado == true
//    - /calendario   entero
// =============================================================

import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, COL } from './firebase'
import { ocupantes } from '@nucleo/cuadrante'
import { hoyIso } from './texto'

// -------------------------------------------------------------
//  PROCESIONES PUBLICADAS
//  La condicion  where('publicado','==',true)  no es un adorno:
//  las reglas exigen que la consulta se limite a lo publicado,
//  si no Firestore la rechaza entera.
// -------------------------------------------------------------
export async function leerProcesionesPublicadas() {
  const c = query(collection(db, COL.PROCESIONES), where('publicado', '==', true))
  const snap = await getDocs(c)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      (b.anio || 0) - (a.anio || 0) ||
      String(a.fecha_iso || '').localeCompare(String(b.fecha_iso || ''))
    )
}

// -------------------------------------------------------------
//  CONVOCATORIAS DEL CALENDARIO (de hoy en adelante)
// -------------------------------------------------------------
export async function leerConvocatorias() {
  const snap = await getDocs(collection(db, COL.CALENDARIO))
  const hoy = hoyIso()

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => e.fecha_iso && e.fecha_iso >= hoy)
    .sort((a, b) =>
      a.fecha_iso.localeCompare(b.fecha_iso) ||
      String(a.hora || '').localeCompare(String(b.hora || ''))
    )
}

// -------------------------------------------------------------
//  CENSO IMPLICITO DE UNA PROCESION
//
//  El censo real nunca es publico. Pero los nombres de quienes
//  salen ya viajan dentro del cuadrante publicado, asi que la
//  lista de costaleros se saca de ahi y no de /costaleros.
// -------------------------------------------------------------
export function personasDe(procesion) {
  const mapa = new Map()

  ;[procesion?.cuadrante_trono, procesion?.cuadrante_cruz].forEach((cuadrante) => {
    if (!cuadrante) return
    ocupantes(cuadrante).forEach(({ p }) => {
      if (!p?.costalero_id) return
      if (!mapa.has(p.costalero_id)) {
        mapa.set(p.costalero_id, {
          id: p.costalero_id,
          nombre: limpiarNombre(p.nombre),
          altura: p.altura || 0,
        })
      }
    })
  })

  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// El generador marca a los repetidores con "(R)". Para el costalero
// eso es ruido: se ve en el cuadrante, no hace falta en su nombre.
export function limpiarNombre(nombre) {
  return String(nombre || '')
    .replace(/\s*\((R|C|C-Doble)\)\s*/gi, ' ')
    .trim()
}
