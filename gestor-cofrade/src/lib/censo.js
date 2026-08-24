// =============================================================
//  CAPA DE DATOS DEL CENSO
// =============================================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db, COL } from './firebase'

// --- Normaliza texto para buscar sin tildes ni mayusculas ---
export function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// --- Ficha vacia de costalero ---
export function costaleroVacio() {
  return {
    nombre: '',
    altura: 0,
    pref_hombro: '',
    telefono: '',
    miercoles_santo: false,
    viernes_santo: false,
    // Quien tenga esto marcado va OBLIGATORIA y UNICAMENTE a los turnos
    // de cruz de ese dia: queda excluido del trono.
    cruz_miercoles: false,
    cruz_viernes: false,
    puede_repetir: true,
    campos_extra: {},
  }
}

// ¿Este costalero va solo a la cruz en este tipo de procesion?
export function esDeCruz(costalero, tipoProcesion) {
  if (tipoProcesion === 'miercoles') return !!costalero.cruz_miercoles
  if (tipoProcesion === 'viernes') return !!costalero.cruz_viernes
  return false
}

// -------------------------------------------------------------
//  EXCLUSION DIA <-> CRUZ
//  Quien va en la cruz de un dia NO sale en el trono de ese dia,
//  asi que las dos casillas nunca pueden estar marcadas a la vez.
// -------------------------------------------------------------
export const PARES_EXCLUYENTES = [
  { dia: 'miercoles_santo', cruz: 'cruz_miercoles' },
  { dia: 'viernes_santo', cruz: 'cruz_viernes' },
]

// Devuelve los cambios que hay que aplicar al marcar un campo
export function aplicarExclusion(ficha, campo, valor) {
  const cambios = { [campo]: valor }
  if (!valor) return cambios

  for (const par of PARES_EXCLUYENTES) {
    if (campo === par.cruz) cambios[par.dia] = false
    else if (campo === par.dia) cambios[par.cruz] = false
  }
  return cambios
}

// Limpia una ficha por si llegara con los dos marcados: manda la cruz
export function normalizarExclusion(ficha) {
  const limpia = { ...ficha }
  for (const par of PARES_EXCLUYENTES) {
    if (limpia[par.cruz]) limpia[par.dia] = false
  }
  return limpia
}

// --- Leer todo el censo ---
export async function leerCenso() {
  const snap = await getDocs(collection(db, COL.COSTALEROS))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre)))
}

// --- Crear costalero ---
export async function crearCostalero(datos) {
  const ref = await addDoc(collection(db, COL.COSTALEROS), {
    ...datos,
    nombre_busqueda: normalizar(datos.nombre),
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })
  return ref.id
}

// --- Actualizar costalero ---
export async function actualizarCostalero(id, datos) {
  const { id: _omitir, creado: _c, ...limpio } = datos
  await updateDoc(doc(db, COL.COSTALEROS, id), {
    ...limpio,
    nombre_busqueda: normalizar(datos.nombre),
    actualizado: serverTimestamp(),
  })
}

// --- Borrar costalero ---
export async function borrarCostalero(id) {
  await deleteDoc(doc(db, COL.COSTALEROS, id))
}

// --- Marcar/desmarcar procesion en lote (para apuntar a varios de golpe) ---
export async function marcarProcesionEnLote(ids, campo, valor) {
  // Firestore admite 500 operaciones por lote
  for (let i = 0; i < ids.length; i += 450) {
    const trozo = ids.slice(i, i + 450)
    const batch = writeBatch(db)
    trozo.forEach((id) => {
      batch.update(doc(db, COL.COSTALEROS, id), {
        [campo]: valor,
        actualizado: serverTimestamp(),
      })
    })
    await batch.commit()
  }
}

// --- Borrado en lote ---
export async function borrarEnLote(ids) {
  for (let i = 0; i < ids.length; i += 450) {
    const trozo = ids.slice(i, i + 450)
    const batch = writeBatch(db)
    trozo.forEach((id) => batch.delete(doc(db, COL.COSTALEROS, id)))
    await batch.commit()
  }
}

// =============================================================
//  CAMPOS PERSONALIZADOS
//  Se guardan en  /config/campos_censo  con la forma:
//  { campos: [ { clave, etiqueta, tipo } ] }
//  tipo: texto | numero | si_no
// =============================================================

const REF_CAMPOS = () => doc(db, COL.CONFIG, 'campos_censo')

export async function leerCamposExtra() {
  const snap = await getDoc(REF_CAMPOS())
  return snap.exists() ? snap.data().campos || [] : []
}

export async function guardarCamposExtra(campos) {
  await setDoc(REF_CAMPOS(), { campos, actualizado: serverTimestamp() })
}

export async function anadirCampoExtra(etiqueta, tipo) {
  const campos = await leerCamposExtra()
  const clave = normalizar(etiqueta).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  if (!clave) throw new Error('El nombre del campo no es válido.')
  if (campos.some((c) => c.clave === clave)) throw new Error('Ya existe un campo con ese nombre.')

  const nuevos = [...campos, { clave, etiqueta: etiqueta.trim(), tipo }]
  await guardarCamposExtra(nuevos)
  return nuevos
}

export async function borrarCampoExtra(clave) {
  const campos = await leerCamposExtra()
  await guardarCamposExtra(campos.filter((c) => c.clave !== clave))
}

// --- Valor por defecto segun el tipo de campo ---
export function valorPorDefecto(tipo) {
  if (tipo === 'numero') return 0
  if (tipo === 'si_no') return false
  return ''
}

// =============================================================
//  IMPORTACION del datos.json del programa antiguo
// =============================================================

export async function importarCensoAntiguo(lista, { sustituir = false } = {}) {
  if (!Array.isArray(lista)) throw new Error('El archivo no contiene una lista de costaleros.')

  if (sustituir) {
    const actuales = await getDocs(collection(db, COL.COSTALEROS))
    await borrarEnLote(actuales.docs.map((d) => d.id))
  }

  let importados = 0
  let saltados = 0

  for (let i = 0; i < lista.length; i += 450) {
    const trozo = lista.slice(i, i + 450)
    const batch = writeBatch(db)

    trozo.forEach((p) => {
      const nombre = String(p.nombre || '').trim()
      if (!nombre) { saltados++; return }

      const ref = doc(collection(db, COL.COSTALEROS))
      batch.set(ref, {
        nombre,
        nombre_busqueda: normalizar(nombre),
        altura: Number(p.altura) || 0,
        pref_hombro: p.pref_hombro || '',
        telefono: String(p.telefono || ''),
        miercoles_santo: !!p.miercoles_santo,
        viernes_santo: !!p.viernes_santo,
        cruz_miercoles: !!p.cruz_miercoles,
        cruz_viernes: !!p.cruz_viernes,
        puede_repetir: p.puede_repetir !== false,
        campos_extra: {},
        id_antiguo: p.id ?? null,
        creado: serverTimestamp(),
        actualizado: serverTimestamp(),
      })
      importados++
    })

    await batch.commit()
  }

  return { importados, saltados }
}

// --- Exportar a JSON (copia de seguridad) ---
export function exportarCensoJSON(censo) {
  const limpio = censo.map(({ creado, actualizado, nombre_busqueda, ...resto }) => resto)
  const blob = new Blob([JSON.stringify(limpio, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `censo_agonia_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
