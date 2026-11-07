// =============================================================
//  PASAR LISTA — a pantalla completa
//  Pensado para usarlo de pie, en tablet o movil: filas grandes y
//  un toque por persona. Las marcas se guardan en el dispositivo
//  en cuanto se tocan, asi que un corte de conexion no las pierde.
// =============================================================

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { normalizar } from '../lib/censo'
import { Modal } from './ui'
import { diferencias, recalculoMinimo, recalculoTotal } from '../lib/paseLista'

function useEnLinea() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine !== false)
  useEffect(() => {
    const si = () => setEnLinea(true)
    const no = () => setEnLinea(false)
    window.addEventListener('online', si)
    window.addEventListener('offline', no)
    return () => {
      window.removeEventListener('online', si)
      window.removeEventListener('offline', no)
    }
  }, [])
  return enLinea
}

// --- Borrador en el dispositivo ---
const claveBorrador = (id) => `agonia.paselista.${id}`

export function leerBorrador(id) {
  try {
    const v = JSON.parse(localStorage.getItem(claveBorrador(id)))
    return Array.isArray(v) ? new Set(v) : null
  } catch { return null }
}
export function guardarBorrador(id, marcas) {
  try { localStorage.setItem(claveBorrador(id), JSON.stringify([...marcas])) } catch { /* modo privado */ }
}
export function borrarBorrador(id) {
  try { localStorage.removeItem(claveBorrador(id)) } catch { /* modo privado */ }
}

export default function PaseLista({
  abierto, apuntados, marcas, buscador, onAlternar, onCerrar, onTerminar,
}) {
  const [texto, setTexto] = useState('')
  const enLinea = useEnLinea()

  useEffect(() => {
    if (!abierto) return undefined
    const onEsc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [abierto, onCerrar])

  const q = normalizar(texto)
  const visibles = useMemo(
    () => apuntados.filter((a) => !q || normalizar(a.nombre).includes(q)),
    [apuntados, q]
  )

  if (!abierto) return null

  const total = apuntados.length
  const presentes = apuntados.filter((a) => marcas.has(a.costalero_id)).length

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pasar lista"
      className="fixed inset-0 z-40 flex flex-col bg-slate-100 animate-hoja-entra"
    >
      <header className="bg-gradient-to-r from-morado-deep to-morado text-white px-4 md:px-8 pt-4 pb-3 shadow-md">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-oro">Pasar lista</h2>
            <button
              type="button"
              onClick={onCerrar}
              className="text-sm text-white/80 hover:text-white min-h-[44px] px-2"
            >
              Seguir luego
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-1 text-sm">
            <span>
              <b className="text-2xl tabular-nums text-white">{presentes}</b>
              <span className="text-white/70"> de {total} han llegado</span>
            </span>
            <span className={`text-xs text-right ${enLinea ? 'hidden sm:inline text-white/50' : 'text-amber-300 font-semibold'}`}>
              {enLinea ? 'Las marcas se guardan en este dispositivo' : 'Sin conexión: no se pierde nada'}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-white/15 mt-2 overflow-hidden">
            <div
              className="h-full bg-oro rounded-full transition-[width] duration-500 ease-posarse"
              style={{ width: total ? `${(presentes / total) * 100}%` : 0 }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto w-full space-y-3">
          <input
            className="input !text-base min-h-[44px]"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar en la lista…"
          />

          <ul className="space-y-1.5">
            {visibles.map((a) => {
              const marcado = marcas.has(a.costalero_id)
              return (
                <li key={a.costalero_id}>
                  <button
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => onAlternar(a.costalero_id)}
                    className={`w-full min-h-[56px] flex items-center gap-3 px-4 rounded-xl border-2 text-left
                                transition-all duration-200 active:scale-[0.985] ${
                                  marcado
                                    ? 'bg-emerald-50 border-emerald-500'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-sm
                                  transition-all duration-200 ${
                                    marcado
                                      ? 'bg-emerald-600 border-emerald-600 text-white scale-110'
                                      : 'border-slate-300 text-transparent'
                                  }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1 min-w-0 truncate text-base font-medium text-slate-800">{a.nombre}</span>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">{a.altura} cm</span>
                  </button>
                </li>
              )
            })}
            {visibles.length === 0 && (
              <li className="text-center text-sm text-slate-400 py-8">Nadie en la lista con ese nombre.</li>
            )}
          </ul>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">¿Ha llegado alguien que no estaba apuntado?</p>
            {buscador}
          </div>
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 px-4 md:px-8 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {total - presentes > 0
              ? <><b className="text-red-700">{total - presentes}</b> sin marcar quedarán como ausentes</>
              : 'Han llegado todos'}
          </p>
          <button type="button" onClick={onTerminar} className="btn-morado min-h-[44px] shrink-0">
            Terminar
          </button>
        </div>
      </footer>
    </div>,
    document.body
  )
}

// =============================================================
//  RECALCULAR EL TRONO DESPUES DE PASAR LISTA
// =============================================================

export function ModalRecalcular({
  datos,       // { cuadrante, asistentes, ausentes, bloqueadosFuera } o null
  config, algoritmo, censoPorId, onCerrar, onAplicar,
}) {
  const opciones = useMemo(() => {
    if (!datos?.cuadrante) return null
    const min = recalculoMinimo(datos.cuadrante, datos.asistentes, censoPorId)
    const tot = recalculoTotal(datos.cuadrante, datos.asistentes, { config, algoritmo, censoPorId })
    return {
      minimo: { ...min, ...diferencias(datos.cuadrante, min.cuadrante) },
      total: { ...tot, ...diferencias(datos.cuadrante, tot.cuadrante) },
    }
  }, [datos, config, algoritmo, censoPorId])

  return (
    <Modal abierto={!!opciones} onCerrar={onCerrar} titulo="Recalcular el trono" ancho="max-w-3xl">
      {opciones && (
        <div className="space-y-4">
          {datos.ausentes.length > 0 && (
            <p className="text-sm text-slate-600">
              <b className="text-red-700">{datos.ausentes.length}</b> no han venido:{' '}
              {datos.ausentes.map((a) => a.nombre).join(' · ')}
            </p>
          )}
          {datos.bloqueadosFuera.length > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              Estaban bloqueados, pero han salido porque no han venido: {datos.bloqueadosFuera.join(' · ')}.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Opcion
              titulo="Tocar lo mínimo"
              texto="Cubre los huecos y corre a la gente de esa vara. Casi todos siguen en su sitio."
              datos={opciones.minimo}
              onAplicar={() => onAplicar(opciones.minimo.cuadrante, 'Trono actualizado.')}
            />
            <Opcion
              titulo="Repartir de nuevo"
              texto="Reparte a todos los presentes por altura. Queda más equilibrado, pero cambia más gente."
              datos={opciones.total}
              onAplicar={() => onAplicar(opciones.total.cuadrante, 'Trono repartido de nuevo.')}
            />
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onCerrar} className="btn-ghost">
              Ahora no, dejarlo como está
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Opcion({ titulo, texto, datos, onAplicar }) {
  const entran = datos.cambios.filter((c) => c.entra).length
  return (
    <div className="border border-slate-200 rounded-xl p-4 flex flex-col min-w-0">
      <h3 className="font-serif font-bold text-morado">{titulo}</h3>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">{texto}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="chip bg-morado/10 text-morado">{datos.cambios.length - entran} se mueven</span>
        <span className="chip bg-emerald-100 text-emerald-800">{entran} entran</span>
        {datos.repetidores > 0 && <span className="chip bg-yellow-100 text-yellow-800">{datos.repetidores} repetidores</span>}
        <span className={`chip ${datos.huecos ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
          {datos.huecos} huecos
        </span>
      </div>

      <ul className="flex-1 max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs mb-3 border border-slate-100 rounded-lg">
        {datos.cambios.length === 0 ? (
          <li className="p-3 text-slate-400 text-center">Nadie cambia de puesto.</li>
        ) : datos.cambios.map((c) => (
          <li key={c.id} className="px-2.5 py-1.5">
            <p className="font-medium text-slate-800 truncate">{c.nombre}</p>
            <p className="text-slate-500">{c.a.join(' + ')}</p>
          </li>
        ))}
      </ul>

      {datos.fuera.length > 0 && (
        <p className="text-xs text-amber-800 mb-3">
          Sin colocar: {datos.fuera.map((p) => p.nombre).join(' · ')}
        </p>
      )}

      <button type="button" onClick={onAplicar} className="btn-morado w-full">Aplicar</button>
    </div>
  )
}

