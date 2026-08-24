// =============================================================
//  RUTA PROTEGIDA POR PERMISO
// =============================================================

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Page, Vacio } from './ui'

export default function Protegida({ permiso, children }) {
  const { puede, infoRol } = useAuth()

  if (permiso && !puede(permiso)) {
    return (
      <Page>
        <div className="card">
          <Vacio
            icono="🔒"
            titulo="No tienes acceso a esta sección"
            texto={`Tu rol actual es "${infoRol.nombre}" y no incluye este permiso. Si necesitas entrar, pide al administrador que te cambie el rol.`}
          >
            <Link to="/" className="btn-morado">← Volver al inicio</Link>
          </Vacio>
        </div>
      </Page>
    )
  }

  return children
}
