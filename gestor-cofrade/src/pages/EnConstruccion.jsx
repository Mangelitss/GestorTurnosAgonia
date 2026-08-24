// =============================================================
//  MODULOS PENDIENTES — se construyen en los siguientes pasos
// =============================================================

import { Link } from 'react-router-dom'
import { Page, PageHeader, Vacio } from '../components/ui'

export default function EnConstruccion({ titulo, icono, descripcion, puntos = [] }) {
  return (
    <Page>
      <PageHeader titulo={titulo} icono={icono} subtitulo={descripcion} />

      <div className="card">
        <Vacio
          icono="🚧"
          titulo="Módulo en construcción"
          texto="Este apartado se construirá en el siguiente paso del proyecto."
        >
          <Link to="/" className="btn-ghost">← Volver al inicio</Link>
        </Vacio>

        {puntos.length > 0 && (
          <div className="border-t border-slate-200 px-8 py-6">
            <p className="label mb-3">Lo que incluirá</p>
            <ul className="space-y-2">
              {puntos.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="text-oro-dark mt-0.5">▸</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Page>
  )
}
