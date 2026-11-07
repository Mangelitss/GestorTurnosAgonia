// =============================================================
//  PASE DE LISTA DE UN ENSAYO
//
//  La noche anterior se apunta a quien dijo que venia y se hacen
//  turnos. El dia del ensayo se pasa lista: quien no ha venido sale
//  de "asistentes" y queda en "ausentes", para poder ver quien es y
//  recuperarlo si llega tarde. Todo lo demas del ensayo (generar,
//  PDF, huecos...) sigue trabajando solo con "asistentes".
//
//  Despues se recalcula el trono de una de estas dos formas:
//    - minimo: se tocan solo los huecos, y casi todos siguen en su sitio
//    - total:  se reparte de nuevo a todos por altura
// =============================================================

import {
  clonar, generarConAvisos, huecos, ocupantes, varasDeTurno,
} from './cuadrante'
import { completarHuecos } from './completarHuecos'
import { corregirHombros } from './hombros'
import { SECCIONES } from './constantes'

// Todos los que se apuntaron, hayan venido o no, por orden alfabetico
export function apuntadosDelEnsayo(ensayo) {
  return [...(ensayo.asistentes || []), ...(ensayo.ausentes || [])].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  )
}

// Cierra el pase de lista. No toca el ensayo recibido.
export function aplicarPaseLista(ensayo, presentes) {
  const todos = apuntadosDelEnsayo(ensayo)
  const asistentes = todos.filter((a) => presentes.has(a.costalero_id))
  const ausentes = todos.filter((a) => !presentes.has(a.costalero_id))

  let cuadrante = ensayo.cuadrante || null
  const bloqueadosFuera = []

  if (cuadrante) {
    cuadrante = clonar(cuadrante)
    const fuera = new Set(ausentes.map((a) => a.costalero_id))
    ocupantes(cuadrante).forEach(({ ref, p }) => {
      if (!fuera.has(p.costalero_id)) return
      // Si no ha venido, sale aunque estuviera bloqueado: no esta
      if (p.bloqueado && !bloqueadosFuera.includes(p.nombre)) bloqueadosFuera.push(p.nombre)
      cuadrante[ref.t].varas[ref.vara][ref.seccion][ref.i] = null
    })
  }

  return {
    cambios: {
      asistentes,
      ausentes,
      cuadrante,
      pase_lista: { hecho_en: new Date().toISOString() },
    },
    bloqueadosFuera,
  }
}

// Lleva los huecos hacia el trono, para que no queden en mitad de la
// vara. Las puntas son lo primero que se llena. Los bloqueados no se mueven.
export function compactarCuadrante(cuadrante) {
  const c = clonar(cuadrante)

  c.forEach((turno) => {
    varasDeTurno(turno).forEach((vara) => {
      SECCIONES.forEach((seccion) => {
        const lista = turno.varas[vara]?.[seccion]
        if (!lista) return

        const desdePunta = seccion === 'Delante'
          ? lista.map((_, i) => i)
          : lista.map((_, i) => lista.length - 1 - i)

        const libres = desdePunta.filter((i) => !lista[i]?.bloqueado)
        const gente = libres.map((i) => lista[i]).filter(Boolean)
        libres.forEach((i, k) => { lista[i] = gente[k] || null })
      })
    })
  })

  return c
}

// Quienes podrian repetir para cubrir huecos
function posiblesRepetidores(cuadrante, censoPorId) {
  const vistos = new Set()
  return ocupantes(cuadrante)
    .map((x) => x.p)
    .filter((p) => p.costalero_id && !p.repetidor)
    .filter((p) => censoPorId[p.costalero_id]?.puede_repetir !== false)
    .filter((p) => {
      if (vistos.has(p.costalero_id)) return false
      vistos.add(p.costalero_id)
      return true
    })
}

// Tocar lo minimo: primero los presentes sin colocar y, si aun
// quedan huecos, repetidores. Los huecos que resten van hacia el trono.
export function recalculoMinimo(cuadrante, asistentes, censoPorId = {}) {
  const colocados = new Set(ocupantes(cuadrante).map((x) => x.p.costalero_id))
  const pendientes = asistentes.filter((a) => !colocados.has(a.costalero_id))

  // Quien llega tarde tiene preferencia sobre un repetidor: si hay gente
  // sin puesto, los repetidores dejan su sitio y luego vuelven a los
  // huecos que queden. Los bloqueados se quedan donde estan.
  let base = cuadrante
  if (pendientes.length) {
    base = clonar(cuadrante)
    ocupantes(base).forEach(({ ref, p }) => {
      if (p.repetidor && !p.bloqueado) base[ref.t].varas[ref.vara][ref.seccion][ref.i] = null
    })
  }

  const r = completarHuecos(base, pendientes, {
    censoPorId,
    repetidores: posiblesRepetidores(base, censoPorId),
  })

  return { cuadrante: compactarCuadrante(r.cuadrante), fuera: r.fuera }
}

// Repartir de nuevo: el generador ya respeta los bloqueos y mete repetidores
export function recalculoTotal(cuadrante, asistentes, { config, algoritmo, censoPorId = {} }) {
  const { cuadrante: generado } = generarConAvisos(asistentes, {
    numTurnos: cuadrante.length,
    config,
    algoritmo,
    cuadranteAnterior: cuadrante,
    censoPorId,
    rellenarConAnterior: true,
  })
  return { cuadrante: corregirHombros(generado, censoPorId).cuadrante, fuera: [] }
}

const etiquetaPuesto = (turno, ref) => {
  const seccion = ref.seccion === 'Detras' ? 'detrás' : 'delante'
  return `Turno ${turno.id} · ${ref.vara}, ${seccion}, ${ref.i + 1}`
}

function puestosPorPersona(cuadrante) {
  const m = new Map()
  ocupantes(cuadrante).forEach(({ ref, p }) => {
    if (!p.costalero_id) return
    if (!m.has(p.costalero_id)) m.set(p.costalero_id, { nombre: p.nombre, puestos: [] })
    m.get(p.costalero_id).puestos.push(etiquetaPuesto(cuadrante[ref.t], ref))
  })
  return m
}

// Lo que cambia de un cuadrante a otro, para la vista previa
export function diferencias(antes, despues) {
  const a = puestosPorPersona(antes)
  const d = puestosPorPersona(despues)
  const cambios = []

  d.forEach((info, id) => {
    const previos = a.get(id)?.puestos || []
    if ([...info.puestos].sort().join('|') === [...previos].sort().join('|')) return
    cambios.push({ id, nombre: info.nombre, de: previos, a: info.puestos, entra: previos.length === 0 })
  })

  return {
    cambios: cambios.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')),
    repetidores: ocupantes(despues).filter((x) => x.p.repetidor).length,
    huecos: huecos(despues).length,
  }
}
