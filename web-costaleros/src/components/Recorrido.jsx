// =============================================================
//  RECORRIDO OFICIAL Y NORMATIVA
//  Lo mismo que ve el cuadrillero en la pestaña Publicar, pero
//  en modo lectura.
// =============================================================

import { tramosOrdenados } from '@nucleo/conflictos'
import { FASES, PIEZAS } from '@nucleo/constantes'
import { Revelar, Rotulo, Vacio } from './ui'
import { TenerEnCuenta } from './InfoPublicacion'

export default function Recorrido({ procesion }) {
  const tramos = tramosOrdenados(procesion.tramos || [])

  const tenerEnCuenta = procesion.info?.tener_en_cuenta

  if (tramos.length === 0 && !procesion.normativa && !tenerEnCuenta) {
    return <Vacio titulo="Sin recorrido publicado" texto="El cuadrillero aún no ha definido los tramos." />
  }

  // Se separa ida y regreso porque entre medias hay descanso
  const porFase = [FASES.ida, FASES.regreso]
    .map((f) => ({ fase: f, lista: tramos.filter((t) => t.fase === f.id) }))
    .filter((g) => g.lista.length > 0)

  let numero = 0

  return (
    <div className="animate-aparecer space-y-8">
      <TenerEnCuenta texto={tenerEnCuenta} />

      {porFase.map(({ fase, lista }) => (
        <div key={fase.id}>
          <Rotulo>{fase.nombre}</Rotulo>
          <ol className="relative">
            <span
              className="absolute bottom-3 left-[13px] top-3 w-px origin-top animate-descender bg-oro/35"
              aria-hidden="true"
            />
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
          <p className="prosa whitespace-pre-wrap border-l-2 border-oro/60 pl-4">
            {procesion.normativa}
          </p>
        </div>
      )}
    </div>
  )
}

function Tramo({ tramo, numero }) {
  return (
    <Revelar as="li" className="relative pb-5 pl-10 last:pb-0">
      <span
        className="absolute left-0 top-0 flex h-[27px] w-[27px] items-center justify-center rounded-full
                   border border-oro/60 bg-morado-black font-titulo text-[11.5px] font-semibold text-oro-pale"
      >
        {numero}
      </span>

      <p className="pt-0.5 text-[15px] font-bold leading-snug text-crema">{tramo.nombre}</p>

      {(tramo.desde || tramo.hasta) && (
        <p className="mt-0.5 font-texto text-[16px] italic leading-snug text-oro-light/70">
          {tramo.desde || '—'} — {tramo.hasta || '—'}
        </p>
      )}

      {(tramo.turno_trono || tramo.turno_cruz) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {tramo.turno_trono && (
            <span className="rounded-sm border border-oro/45 bg-oro/15 px-2 py-0.5 text-[11.5px] font-bold text-oro-light">
              {PIEZAS.trono.nombre} {tramo.turno_trono}
            </span>
          )}
          {tramo.turno_cruz && (
            <span className="rounded-sm border border-sky-400/45 bg-sky-500/15 px-2 py-0.5 text-[11.5px] font-bold text-sky-200">
              Cruz {tramo.turno_cruz}
            </span>
          )}
        </div>
      )}

      {tramo.texto && (
        <p className="prosa mt-2 whitespace-pre-wrap text-[16px] text-crema/75">
          {tramo.texto}
        </p>
      )}
    </Revelar>
  )
}
