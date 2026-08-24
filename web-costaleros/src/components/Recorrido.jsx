// =============================================================
//  RECORRIDO OFICIAL Y NORMATIVA
//  Lo mismo que ve el cuadrillero en la pestaña Publicar, pero
//  en modo lectura.
// =============================================================

import { tramosOrdenados } from '@nucleo/conflictos'
import { FASES, PIEZAS } from '@nucleo/constantes'
import { Rotulo, Vacio } from './ui'

export default function Recorrido({ procesion }) {
  const tramos = tramosOrdenados(procesion.tramos || [])

  if (tramos.length === 0 && !procesion.normativa) {
    return <Vacio icono="—" titulo="Sin recorrido publicado" texto="El cuadrillero aún no ha definido los tramos." />
  }

  // Se separa ida y regreso porque entre medias hay descanso
  const porFase = [FASES.ida, FASES.regreso]
    .map((f) => ({ fase: f, lista: tramos.filter((t) => t.fase === f.id) }))
    .filter((g) => g.lista.length > 0)

  let numero = 0

  return (
    <div className="animate-subir space-y-8">
      {porFase.map(({ fase, lista }) => (
        <div key={fase.id}>
          <Rotulo>{fase.icono} {fase.nombre}</Rotulo>
          <ol className="space-y-2">
            {lista.map((t) => {
              numero += 1
              return <Tramo key={t.id} tramo={t} numero={numero} />
            })}
          </ol>
        </div>
      ))}

      {procesion.normativa && (
        <div>
          <Rotulo>Normativa de la cuadrilla</Rotulo>
          <div className="rounded-lg border-l-4 border-oro bg-morado-dark/60 px-5 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-crema/90">
              {procesion.normativa}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Tramo({ tramo, numero }) {
  return (
    <li className="rounded-lg border border-oro/20 bg-morado-dark/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                         bg-morado text-[11px] font-bold text-oro-light">
          {numero}
        </span>
        <span className="text-sm font-bold text-crema">{tramo.nombre}</span>

        {tramo.turno_trono && (
          <span className="rounded-full bg-oro/20 px-2.5 py-0.5 text-[11px] font-bold
                           text-oro-light ring-1 ring-oro/40">
            {PIEZAS.trono.nombre} {tramo.turno_trono}
          </span>
        )}
        {tramo.turno_cruz && (
          <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[11px] font-bold
                           text-sky-200 ring-1 ring-sky-400/40">
            Cruz {tramo.turno_cruz}
          </span>
        )}
      </div>

      {(tramo.desde || tramo.hasta) && (
        <p className="mt-1.5 pl-8 text-xs text-oro-light/50">
          {tramo.desde || '—'} <span className="text-oro/60">➔</span> {tramo.hasta || '—'}
        </p>
      )}

      {tramo.texto && (
        <p className="mt-2 whitespace-pre-wrap border-l-2 border-oro/30 pl-3 ml-8
                      text-xs leading-relaxed text-crema/65">
          {tramo.texto}
        </p>
      )}
    </li>
  )
}
