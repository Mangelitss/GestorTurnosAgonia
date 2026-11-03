// =============================================================
//  LECTURA DEL PORTAL
//
//  Todo sale de un unico documento:  /portal/{clave}
//  donde la clave se calcula a partir del codigo que teclea el
//  costalero (ver gestor-cofrade/src/lib/portal.js).
//
//  Si el codigo esta mal, o el cuadrillero ha ocultado la web,
//  el documento no existe. Las dos cosas se ven igual a proposito:
//  la web no da pistas de si el codigo era bueno.
// =============================================================

import { doc, getDoc } from 'firebase/firestore'
import { db, COL } from './firebase'
import { ocupantes } from '@nucleo/cuadrante'
import { claveDeCodigo, esClaveValida, limpiarNombre } from '@nucleo/portal'

export { limpiarNombre }

// Devuelve el portal, o null si no existe
export async function leerPortal(clave) {
  if (!esClaveValida(clave)) return null
  const snap = await getDoc(doc(db, COL.PORTAL, clave))
  return snap.exists() ? snap.data() : null
}

// Comprueba un codigo. Devuelve { clave, portal } o null.
export async function entrarConCodigo(codigo) {
  const clave = await claveDeCodigo(codigo)
  const portal = await leerPortal(clave)
  return portal ? { clave, portal } : null
}

// -------------------------------------------------------------
//  SE RECUERDA LA CLAVE (nunca el codigo) EN ESTE MOVIL
// -------------------------------------------------------------
const CLAVE_ACCESO = 'agonia.acceso'

export function claveRecordada() {
  try { return localStorage.getItem(CLAVE_ACCESO) || null } catch { return null }
}

export function recordarClave(clave) {
  try {
    clave ? localStorage.setItem(CLAVE_ACCESO, clave) : localStorage.removeItem(CLAVE_ACCESO)
  } catch { /* modo privado */ }
}

// -------------------------------------------------------------
//  QUIEN SALE EN UNA PUBLICACION
//  El censo real nunca es publico: la lista sale del cuadrante.
// -------------------------------------------------------------
export function cuadrantesDe(pub) {
  if (!pub) return []
  if (pub.clase === 'ensayo') return [pub.cuadrante]
  return [pub.cuadrante_trono, pub.lleva_cruz ? pub.cuadrante_cruz : null]
}

export function personasDe(pub) {
  const mapa = new Map()

  cuadrantesDe(pub).forEach((cuadrante) => {
    if (!cuadrante) return
    ocupantes(cuadrante).forEach(({ p }) => {
      if (!p?.costalero_id || mapa.has(p.costalero_id)) return
      mapa.set(p.costalero_id, { id: p.costalero_id, nombre: limpiarNombre(p.nombre) })
    })
  })

  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
