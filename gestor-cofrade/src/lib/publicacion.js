// =============================================================
//  MODULO DE PUBLICACION — WEB DE COSTALEROS
//
//  /config/portal  (solo cuadrilleros, ni siquiera "consulta"):
//  {
//    visible: bool,          <- interruptor general de la web
//    codigo: string,         <- el que eligio el cuadrillero
//    clave: string | null,   <- PBKDF2(codigo): id de /portal/{clave}
//    url_web: string,        <- enlace del portal, para abrirlo desde aqui
//    generado_en, actualizado_por
//  }
//
//  /portal/{clave}: la copia limpia que lee la web (ver lib/portal.js).
//  Solo existe mientras la web esta visible. Ocultar = borrarla.
//
//  Que se publica lo dice el campo  publicado  de cada procesion y
//  cada ensayo. Cualquier cambio vuelve a generar la copia entera.
// =============================================================

import {
  doc, getDoc, getDocs, setDoc, collection, writeBatch, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db, COL } from './firebase'
import {
  claveDeCodigo, problemaCodigo, normalizarCodigo, construirPortal,
  tamanoAproximado, TAMANO_MAXIMO,
} from './portal'

const REF_CONFIG = () => doc(db, COL.CONFIG, 'portal')
const refPortal = (clave) => doc(db, COL.PORTAL, clave)

// Miercoles y Viernes: solo puede haber una publicada de cada
export const TIPOS_UNICOS = ['miercoles', 'viernes']

// Donde queda el portal al hacer  npm run deploy  en web-costaleros.
// Si se cambia de dominio, se corrige desde el propio modulo.
export const URL_WEB_POR_DEFECTO = 'https://costaleros-agonia.web.app'

// -------------------------------------------------------------
//  LECTURA
// -------------------------------------------------------------

export async function leerConfigPortal() {
  const snap = await getDoc(REF_CONFIG())
  return {
    visible: false,
    codigo: '',
    clave: null,
    generado_en: null,
    url_web: URL_WEB_POR_DEFECTO,
    ...(snap.exists() ? snap.data() : {}),
  }
}

export async function guardarUrlWeb(url, usuario = null) {
  let limpia = String(url || '').trim()
  if (!limpia) limpia = URL_WEB_POR_DEFECTO
  if (!/^https?:\/\//i.test(limpia)) limpia = `https://${limpia}`
  try { new URL(limpia) } catch { throw new Error('Ese enlace no es válido.') }

  await setDoc(REF_CONFIG(), { url_web: limpia, actualizado_por: usuario }, { merge: true })
  return limpia
}

async function leerTodo(col) {
  const snap = await getDocs(collection(db, col))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function leerPublicados() {
  const [procesiones, ensayos] = await Promise.all([
    leerTodo(COL.PROCESIONES),
    leerTodo(COL.ENSAYOS),
  ])
  return {
    procesiones: procesiones.filter((p) => p.publicado),
    ensayos: ensayos.filter((e) => e.publicado),
  }
}

// -------------------------------------------------------------
//  GENERAR LA COPIA
// -------------------------------------------------------------

async function portalActual() {
  const portal = construirPortal(await leerPublicados())
  if (tamanoAproximado(portal) > TAMANO_MAXIMO) {
    throw new Error('Hay demasiado publicado a la vez. Quita algún ensayo antiguo.')
  }
  return portal
}

// Vuelve a escribir la copia con lo que haya marcado como publicado.
// Si la web esta oculta o no hay codigo, no escribe nada.
export async function regenerarPortal(usuario = null) {
  const cfg = await leerConfigPortal()
  if (!cfg.visible || !cfg.clave) return { escrito: false, cfg }

  const portal = await portalActual()
  const batch = writeBatch(db)
  batch.set(refPortal(cfg.clave), { ...portal, generado_en: serverTimestamp() })
  batch.set(REF_CONFIG(), {
    generado_en: serverTimestamp(),
    actualizado_por: usuario,
  }, { merge: true })
  await batch.commit()

  return { escrito: true, cfg, publicaciones: portal.publicaciones.length }
}

// -------------------------------------------------------------
//  INTERRUPTOR GENERAL
// -------------------------------------------------------------

export async function mostrarWeb(usuario = null) {
  const cfg = await leerConfigPortal()
  if (!cfg.clave) throw new Error('Antes de mostrar la web hay que poner un código de acceso.')

  const portal = await portalActual()
  const batch = writeBatch(db)
  batch.set(refPortal(cfg.clave), { ...portal, generado_en: serverTimestamp() })
  batch.set(REF_CONFIG(), {
    visible: true,
    generado_en: serverTimestamp(),
    actualizado_por: usuario,
  }, { merge: true })
  await batch.commit()
}

// Ocultar BORRA la copia: no queda nada que leer, ni con el codigo
export async function ocultarWeb(usuario = null) {
  const cfg = await leerConfigPortal()
  const batch = writeBatch(db)
  if (cfg.clave) batch.delete(refPortal(cfg.clave))
  batch.set(REF_CONFIG(), { visible: false, actualizado_por: usuario }, { merge: true })
  await batch.commit()
}

// -------------------------------------------------------------
//  CODIGO DE ACCESO
// -------------------------------------------------------------

// Cambia el codigo. Todo en un solo lote: se escribe la copia con la
// clave nueva y se borra la vieja, asi el codigo anterior deja de
// valer en el mismo instante en que empieza a valer el nuevo.
export async function cambiarCodigo(codigo, usuario = null) {
  const problema = problemaCodigo(codigo)
  if (problema) throw new Error(problema)

  const cfg = await leerConfigPortal()
  const clave = await claveDeCodigo(codigo)
  if (clave === cfg.clave) throw new Error('Ese ya es el código actual.')

  const batch = writeBatch(db)

  if (cfg.visible) {
    const portal = await portalActual()
    batch.set(refPortal(clave), { ...portal, generado_en: serverTimestamp() })
  }
  if (cfg.clave) batch.delete(refPortal(cfg.clave))

  batch.set(REF_CONFIG(), {
    codigo: String(codigo).trim(),
    clave,
    actualizado_por: usuario,
    ...(cfg.visible ? { generado_en: serverTimestamp() } : {}),
  }, { merge: true })

  await batch.commit()
  return normalizarCodigo(codigo)
}

// -------------------------------------------------------------
//  QUE SE PUBLICA
// -------------------------------------------------------------

// Marca o desmarca una procesion. Si es de Miercoles o Viernes,
// desmarca la otra del mismo tipo que estuviera publicada.
export async function marcarProcesion(procesion, publicar, todas = []) {
  const batch = writeBatch(db)

  if (publicar && TIPOS_UNICOS.includes(procesion.tipo)) {
    todas
      .filter((p) => p.id !== procesion.id && p.tipo === procesion.tipo && p.publicado)
      .forEach((p) => {
        batch.update(doc(db, COL.PROCESIONES, p.id), {
          publicado: false,
          estado: 'borrador',
          actualizado: serverTimestamp(),
        })
      })
  }

  batch.update(doc(db, COL.PROCESIONES, procesion.id), {
    publicado: publicar,
    estado: publicar ? 'publicada' : 'borrador',
    ...(publicar ? { publicado_en: serverTimestamp() } : {}),
    actualizado: serverTimestamp(),
  })

  await batch.commit()
}

export async function marcarEnsayo(ensayo, publicar) {
  await updateDoc(doc(db, COL.ENSAYOS, ensayo.id), {
    publicado: publicar,
    ...(publicar ? { publicado_en: serverTimestamp() } : {}),
    actualizado: serverTimestamp(),
  })
}

// Solo toca el campo info_web: no pisa lo que otro cuadrillero
// este editando en los tramos o los turnos.
export async function guardarInfoWeb(coleccion, id, info) {
  await updateDoc(doc(db, coleccion, id), {
    info_web: info,
    actualizado: serverTimestamp(),
  })
}

// ¿Se ha tocado desde la ultima vez que se genero la web?
export function tieneCambiosSinSubir(item, generadoEn) {
  if (!item?.publicado) return false
  const a = item.actualizado?.toMillis?.() ?? 0
  const g = generadoEn?.toMillis?.() ?? 0
  return a > g
}
