// =============================================================
//  SINCRONIZACION CALENDARIO <-> ENSAYOS
//
//  Regla de oro: una convocatoria de tipo "Ensayo" y su ensayo
//  son DOS CARAS DE LO MISMO.
//
//   - Crear una de tipo Ensayo  -> crea la otra automaticamente
//   - Editar fecha/hora/lugar/notas en una -> se refleja en la otra
//   - Borrar una                -> borra la otra
//   - Cambiar el motivo a otra cosa -> se pregunta al cuadrillero
//
//  Vinculo:  evento.ensayo_id  <->  ensayo.evento_id
// =============================================================

import { doc, writeBatch, collection, serverTimestamp } from 'firebase/firestore'
import { db, COL } from './firebase'
import { ensayoVacio } from './ensayos'
import { eventoVacio } from './calendario'

export const TIPO_ENSAYO = 'Ensayo'

export function esConvocatoriaDeEnsayo(evento) {
  return evento?.tipo === TIPO_ENSAYO
}

// --- Campos que viajan de un lado a otro ---
//   evento.indicaciones  <->  ensayo.notas
//   evento.fecha_iso     <->  ensayo.fecha_iso
//   evento.hora          <->  ensayo.hora
//   evento.lugar         <->  ensayo.lugar

function eventoDesdeEnsayo(ensayo) {
  return {
    fecha_iso: ensayo.fecha_iso,
    hora: ensayo.hora,
    lugar: ensayo.lugar,
    indicaciones: ensayo.notas || '',
  }
}

function ensayoDesdeEvento(evento) {
  return {
    fecha_iso: evento.fecha_iso,
    hora: evento.hora,
    lugar: evento.lugar,
    notas: evento.indicaciones || '',
  }
}

// ¿Han cambiado los campos compartidos?
export function hayCambiosCompartidos(antes, despues, campos) {
  return campos.some((c) => (antes?.[c] ?? '') !== (despues?.[c] ?? ''))
}

// =============================================================
//  CREACION EN PAREJA
// =============================================================

// Crea una convocatoria y, si es de tipo Ensayo, tambien su ensayo.
// Devuelve { eventoId, ensayoId }
export async function crearEventoCompleto(datos) {
  const batch = writeBatch(db)

  const refEvento = doc(collection(db, COL.CALENDARIO))
  const creaEnsayo = esConvocatoriaDeEnsayo(datos)
  const refEnsayo = creaEnsayo ? doc(collection(db, COL.ENSAYOS)) : null

  batch.set(refEvento, {
    ...eventoVacio(),
    ...datos,
    ensayo_id: refEnsayo?.id || null,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })

  if (creaEnsayo) {
    batch.set(refEnsayo, {
      ...ensayoVacio(ensayoDesdeEvento(datos)),
      evento_id: refEvento.id,
      creado: serverTimestamp(),
      actualizado: serverTimestamp(),
    })
  }

  await batch.commit()
  return { eventoId: refEvento.id, ensayoId: refEnsayo?.id || null }
}

// Crea un ensayo y SIEMPRE su convocatoria en el calendario.
// Devuelve { ensayoId, eventoId }
export async function crearEnsayoCompleto(datos) {
  const batch = writeBatch(db)

  const refEnsayo = doc(collection(db, COL.ENSAYOS))
  const refEvento = doc(collection(db, COL.CALENDARIO))

  const base = ensayoVacio(datos)

  batch.set(refEnsayo, {
    ...base,
    evento_id: refEvento.id,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })

  batch.set(refEvento, {
    ...eventoVacio(),
    ...eventoDesdeEnsayo(base),
    tipo: TIPO_ENSAYO,
    ensayo_id: refEnsayo.id,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })

  await batch.commit()
  return { ensayoId: refEnsayo.id, eventoId: refEvento.id }
}

// =============================================================
//  ACTUALIZACION SINCRONIZADA
// =============================================================

// Guarda una convocatoria y propaga los cambios a su ensayo.
export async function actualizarEventoSincronizado(id, datos) {
  const batch = writeBatch(db)
  const { id: _o, creado: _c, ...limpio } = datos

  batch.update(doc(db, COL.CALENDARIO, id), {
    ...limpio,
    actualizado: serverTimestamp(),
  })

  if (datos.ensayo_id) {
    batch.update(doc(db, COL.ENSAYOS, datos.ensayo_id), {
      ...ensayoDesdeEvento(datos),
      actualizado: serverTimestamp(),
    })
  }

  await batch.commit()
}

// Guarda un ensayo y propaga los cambios compartidos a su convocatoria.
// "cambios" puede traer tambien asistentes/cuadrante, que no se propagan.
export async function guardarEnsayoSincronizado(id, cambios, eventoId) {
  const batch = writeBatch(db)
  const { id: _o, creado: _c, ...limpio } = cambios

  batch.update(doc(db, COL.ENSAYOS, id), {
    ...limpio,
    actualizado: serverTimestamp(),
  })

  // Solo propagamos si el cambio afecta a los campos compartidos
  const tocaCompartidos =
    'fecha_iso' in cambios || 'hora' in cambios ||
    'lugar' in cambios || 'notas' in cambios

  if (eventoId && tocaCompartidos) {
    const parche = {}
    if ('fecha_iso' in cambios) parche.fecha_iso = cambios.fecha_iso
    if ('hora' in cambios) parche.hora = cambios.hora
    if ('lugar' in cambios) parche.lugar = cambios.lugar
    if ('notas' in cambios) parche.indicaciones = cambios.notas || ''

    batch.update(doc(db, COL.CALENDARIO, eventoId), {
      ...parche,
      actualizado: serverTimestamp(),
    })
  }

  await batch.commit()
}

// =============================================================
//  BORRADO EN CASCADA
// =============================================================

// Borra la convocatoria y su ensayo asociado.
export async function borrarEventoCompleto(evento) {
  const batch = writeBatch(db)
  batch.delete(doc(db, COL.CALENDARIO, evento.id))
  if (evento.ensayo_id) {
    batch.delete(doc(db, COL.ENSAYOS, evento.ensayo_id))
  }
  await batch.commit()
}

// Borra el ensayo y su convocatoria asociada.
export async function borrarEnsayoCompleto(ensayo) {
  const batch = writeBatch(db)
  batch.delete(doc(db, COL.ENSAYOS, ensayo.id))
  if (ensayo.evento_id) {
    batch.delete(doc(db, COL.CALENDARIO, ensayo.evento_id))
  }
  await batch.commit()
}

// =============================================================
//  CAMBIO DE MOTIVO
//  Cuando una convocatoria deja de ser "Ensayo".
// =============================================================

// Opcion A: borrar el ensayo junto con el cambio de motivo
export async function cambiarMotivoYBorrarEnsayo(id, datos, ensayoId) {
  const batch = writeBatch(db)
  const { id: _o, creado: _c, ...limpio } = datos

  batch.update(doc(db, COL.CALENDARIO, id), {
    ...limpio,
    ensayo_id: null,
    actualizado: serverTimestamp(),
  })
  if (ensayoId) batch.delete(doc(db, COL.ENSAYOS, ensayoId))

  await batch.commit()
}

// Opcion B: dejar el ensayo suelto, sin cita asociada
export async function cambiarMotivoYDesvincular(id, datos, ensayoId) {
  const batch = writeBatch(db)
  const { id: _o, creado: _c, ...limpio } = datos

  batch.update(doc(db, COL.CALENDARIO, id), {
    ...limpio,
    ensayo_id: null,
    actualizado: serverTimestamp(),
  })
  if (ensayoId) {
    batch.update(doc(db, COL.ENSAYOS, ensayoId), {
      evento_id: null,
      actualizado: serverTimestamp(),
    })
  }

  await batch.commit()
}

// Una convocatoria que NO era ensayo y pasa a serlo: hay que crearle uno
export async function convertirEnEnsayo(id, datos) {
  const batch = writeBatch(db)
  const { id: _o, creado: _c, ...limpio } = datos

  const refEnsayo = doc(collection(db, COL.ENSAYOS))

  batch.update(doc(db, COL.CALENDARIO, id), {
    ...limpio,
    ensayo_id: refEnsayo.id,
    actualizado: serverTimestamp(),
  })

  batch.set(refEnsayo, {
    ...ensayoVacio(ensayoDesdeEvento(datos)),
    evento_id: id,
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  })

  await batch.commit()
  return refEnsayo.id
}
