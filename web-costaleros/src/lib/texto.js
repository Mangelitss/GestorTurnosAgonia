// =============================================================
//  UTILIDADES DE TEXTO
// =============================================================

// Quita tildes y mayusculas para poder buscar "jose" y que salga "José"
export function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// "2027-03-05" -> "viernes 5 de marzo de 2027"
export function fechaLarga(iso) {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-').map(Number)
  if (!a || !m || !d) return iso
  const f = new Date(a, m - 1, d)
  const texto = `${DIAS[f.getDay()]} ${d} de ${MESES[m - 1]} de ${a}`
  // Solo la primera letra. Con la clase capitalize de CSS saldria
  // "Viernes 26 De Marzo De 2027", con mayuscula en cada palabra.
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// "2027-03-05" -> "5 mar"
export function fechaCorta(iso) {
  if (!iso) return ''
  const [, m, d] = String(iso).split('-').map(Number)
  if (!m || !d) return iso
  return `${d} ${MESES[m - 1].slice(0, 3)}`
}

// Fecha de hoy en formato ISO, en hora local (no UTC)
export function hoyIso() {
  const f = new Date()
  const mes = String(f.getMonth() + 1).padStart(2, '0')
  const dia = String(f.getDate()).padStart(2, '0')
  return `${f.getFullYear()}-${mes}-${dia}`
}
