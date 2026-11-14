// =============================================================
//  TOQUES DEL LLAMADOR
//  Apartado fijo: se ve siempre, haya o no algo publicado.
//  Los textos vienen del portal antiguo (toques_llamador_npj.html).
//
//  Cada toque lleva su dibujo de golpes: separados si son
//  discontinuos, juntos si son seguidos o continuos.
// =============================================================

import { Revelar, Rotulo } from './ui'

// golpes: cuantos toques; juntos: si van seguidos
const TOQUES = [
  {
    titulo: 'Tres toques discontinuos',
    golpes: 3,
    juntos: false,
    texto: <>Para cargar el trono: 1.º atentos; 2.º arrimamos el hombro, y al 3.º <b>levantamos por igual.</b> Una vez a hombros, empezamos a moverlo de <b>izquierda a derecha.</b></>,
  },
  {
    titulo: 'Un toque con el paso a hombros',
    golpes: 1,
    texto: <><b>Indica el comienzo del paso una vez cogido el ritmo.</b> El toque se dará cuando el peso esté sobre el pie izquierdo para que os dé tiempo a reaccionar; volvemos estáticamente al derecho y salimos todos con el izquierdo.</>,
  },
  {
    titulo: 'Un toque, en marcha',
    golpes: 1,
    texto: <>Cuando estemos en marcha, si perdemos el paso o hay que parar sin descansar, <b>un toque lo indicará.</b></>,
  },
  {
    titulo: 'Dos toques seguidos',
    golpes: 2,
    juntos: true,
    texto: <>Indicarán el momento de descansar en las muletas. Los muleteros deben estar pendientes únicamente de su cometido; el resto, siempre pendientes de <b>la estabilidad del trono.</b></>,
  },
  {
    titulo: 'Tres toques continuos (1)',
    golpes: 3,
    juntos: true,
    texto: <>Indicarán bajar el trono a brazo. Una vez superado el obstáculo se darán dos toques continuos para subir directamente a las muletas. <b>Nunca directo al hombro.</b></>,
  },
  {
    titulo: 'Tres toques continuos (2)',
    golpes: 3,
    juntos: true,
    texto: <>En entradas y salidas de iglesias, máximo silencio para poder escuchar instrucciones, y bajaremos el trono <b>«a ras de suelo».</b> Un toque indicará parar y después dos toques subir a la muleta. Avanzaremos todos juntos una vez salvado el obstáculo.</>,
  },
]

export default function Toques() {
  return (
    <div className="seccion animate-aparecer space-y-5">
      <div className="text-center">
        <h2 className="font-titulo text-[24px] font-semibold uppercase tracking-[0.18em] text-oro-pale">
          Toques
        </h2>
        <p className="mt-1 font-texto text-[17px] italic text-oro-light/80">del llamador</p>
      </div>

      <Rotulo>Lo que indica cada toque</Rotulo>

      <ol className="space-y-3">
        {TOQUES.map((t, i) => (
          <Revelar as="li" key={t.titulo} retraso={Math.min(i, 3) * 80} className="cartela p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-titulo text-[14px] font-semibold leading-snug text-oro-light">
                {t.titulo}
              </h3>
              <Golpes cuantos={t.golpes} juntos={t.juntos} />
            </div>
            <p className="prosa mt-2 [&_b]:font-medium [&_b]:text-crema">{t.texto}</p>
          </Revelar>
        ))}
      </ol>
    </div>
  )
}

// Los golpes del llamador, dibujados
function Golpes({ cuantos, juntos }) {
  return (
    <span
      className={`mt-0.5 flex shrink-0 items-center ${juntos ? 'gap-1' : 'gap-2.5'}`}
      role="img"
      aria-label={`${cuantos} toque${cuantos === 1 ? '' : 's'}${cuantos > 1 ? (juntos ? ' seguidos' : ' separados') : ''}`}
    >
      {Array.from({ length: cuantos }).map((_, k) => (
        <span key={k} className="h-2.5 w-2.5 rounded-full bg-oro shadow-[0_0_6px_rgba(209,181,20,0.6)]" />
      ))}
    </span>
  )
}
