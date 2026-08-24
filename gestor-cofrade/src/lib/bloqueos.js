// =============================================================
//  BLOQUEO DE EDICION
//
//  Cuando un cuadrillero abre una procesion o un ensayo para
//  editarlo, se pone un bloqueo con su nombre. Si otro entra
//  mientras tanto, lo ve en SOLO LECTURA.
//
//  El bloqueo se renueva cada minuto mientras la pestaña este
//  abierta. Si deja de renovarse (cierre de golpe, apagon...),
//  caduca a los 3 minutos y queda libre.
//
//  Ademas se puede forzar la entrada si sabemos que esa persona
//  ya no esta delante.
//
//  Documento en /bloqueos/{tipo_id}:
//    { tipo, documento_id, uid, nombre, tomado, renovado }
// =============================================================

import {
  doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export const COL_BLOQUEOS = 'bloqueos'

// Cada cuanto se renueva y cuanto tarda en caducar
export const RENOVAR_CADA_MS = 60 * 1000        // 1 minuto
export const CADUCA_TRAS_MS = 3 * 60 * 1000     // 3 minutos

const refBloqueo = (tipo, id) => doc(db, COL_BLOQUEOS, `${tipo}_${id}`)

// ¿Sigue vivo este bloqueo?
export function estaVivo(datos) {
  if (!datos?.renovado) return false

  const ms = datos.renovado instanceof Timestamp
    ? datos.renovado.toMillis()
    : new Date(datos.renovado).getTime()

  return Date.now() - ms < CADUCA_TRAS_MS
}

// Minutos que lleva sin dar señales
export function minutosInactivo(datos) {
  if (!datos?.renovado) return null
  const ms = datos.renovado instanceof Timestamp
    ? datos.renovado.toMillis()
    : new Date(datos.renovado).getTime()
  return Math.floor((Date.now() - ms) / 60000)
}

// -------------------------------------------------------------
//  INTENTAR TOMAR EL BLOQUEO
//  Devuelve { ok: true } si lo consigue,
//  o { ok: false, ocupadoPor } si lo tiene otro.
// -------------------------------------------------------------
export async function tomarBloqueo(tipo, id, usuario, { forzar = false } = {}) {
  const ref = refBloqueo(tipo, id)

  try {
    const snap = await getDoc(ref)

    if (snap.exists() && !forzar) {
      const datos = snap.data()

      // Si es nuestro, lo renovamos y seguimos
      if (datos.uid === usuario.uid) {
        await setDoc(ref, { renovado: serverTimestamp() }, { merge: true })
        return { ok: true, propio: true }
      }

      // De otro y todavía vivo: no podemos entrar
      if (estaVivo(datos)) {
        return {
          ok: false,
          ocupadoPor: {
            uid: datos.uid,
            nombre: datos.nombre || 'otro cuadrillero',
            inactivoMin: minutosInactivo(datos),
          },
        }
      }
      // Si está caducado, seguimos y lo pisamos
    }

    await setDoc(ref, {
      tipo,
      documento_id: id,
      uid: usuario.uid,
      nombre: usuario.nombre || 'Cuadrillero',
      tomado: serverTimestamp(),
      renovado: serverTimestamp(),
    })

    return { ok: true, forzado: forzar }
  } catch (e) {
    console.error('No se ha podido tomar el bloqueo:', e)
    // Ante un fallo de red preferimos dejar trabajar
    return { ok: true, sinBloqueo: true }
  }
}

// Renovar mientras seguimos dentro
export async function renovarBloqueo(tipo, id, uid) {
  try {
    const snap = await getDoc(refBloqueo(tipo, id))
    if (!snap.exists() || snap.data().uid !== uid) return false
    await setDoc(refBloqueo(tipo, id), { renovado: serverTimestamp() }, { merge: true })
    return true
  } catch {
    return false
  }
}

// Soltarlo al salir
export async function soltarBloqueo(tipo, id, uid) {
  try {
    const snap = await getDoc(refBloqueo(tipo, id))
    if (!snap.exists() || snap.data().uid !== uid) return
    await deleteDoc(refBloqueo(tipo, id))
  } catch {
    // Si falla, caducará solo
  }
}

// Escuchar quien lo tiene, para enterarnos si se libera
export function escucharBloqueo(tipo, id, alCambiar) {
  return onSnapshot(
    refBloqueo(tipo, id),
    (snap) => alCambiar(snap.exists() ? snap.data() : null),
    () => alCambiar(null)
  )
}
