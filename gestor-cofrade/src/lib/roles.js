// =============================================================
//  SISTEMA DE ROLES Y PERMISOS
// =============================================================
//  Jerarquia (de mayor a menor):
//    superadmin  -> el programador. Control absoluto. Intocable.
//    admin       -> cuadrillero mayor. Gestiona todo el tercio.
//    cuadrillero -> trabaja con censo, procesiones y ensayos.
//    consulta    -> solo mira, no toca nada.
// =============================================================

// --- Catalogo de permisos ---
export const P = {
  CENSO_VER: 'censo.ver',
  CENSO_EDITAR: 'censo.editar',
  CENSO_BORRAR: 'censo.borrar',
  CENSO_IMPORTAR: 'censo.importar',
  CENSO_CAMPOS: 'censo.campos',

  PROC_VER: 'procesiones.ver',
  PROC_EDITAR: 'procesiones.editar',
  PROC_BORRAR: 'procesiones.borrar',
  PROC_PUBLICAR: 'procesiones.publicar',

  ENSAYOS_VER: 'ensayos.ver',
  ENSAYOS_EDITAR: 'ensayos.editar',

  CAL_VER: 'calendario.ver',
  CAL_EDITAR: 'calendario.editar',

  LIC_VER: 'licencias.ver',
  LIC_CREAR: 'licencias.crear',
  LIC_GESTIONAR: 'licencias.gestionar',   // activar/desactivar/borrar
  ROLES_ASIGNAR: 'roles.asignar',         // cambiar el rol de otro
  CONFIG_GESTIONAR: 'config.gestionar',   // limite de cuadrilleros, etc.
}

const TODOS = Object.values(P)

// --- Definicion de cada rol ---
export const ROLES = {
  superadmin: {
    id: 'superadmin',
    nombre: 'Administrador supremo',
    descripcion: 'Control absoluto del sistema. Gestiona cuadrilleros, roles y configuración.',
    color: 'bg-morado text-white',
    chip: 'bg-morado/10 text-morado border border-morado/30',
    nivel: 100,
    permisos: TODOS,
    asignable: false, // no se puede otorgar desde la interfaz
  },

  admin: {
    id: 'admin',
    nombre: 'Cuadrillero mayor',
    descripcion: 'Gestiona todo el tercio y puede dar de alta a otros cuadrilleros.',
    color: 'bg-oro text-morado-dark',
    chip: 'bg-oro/20 text-oro-dark border border-oro/40',
    nivel: 75,
    permisos: [
      P.CENSO_VER, P.CENSO_EDITAR, P.CENSO_BORRAR, P.CENSO_IMPORTAR, P.CENSO_CAMPOS,
      P.PROC_VER, P.PROC_EDITAR, P.PROC_BORRAR, P.PROC_PUBLICAR,
      P.ENSAYOS_VER, P.ENSAYOS_EDITAR,
      P.CAL_VER, P.CAL_EDITAR,
      P.LIC_VER, P.LIC_CREAR, P.LIC_GESTIONAR,
    ],
    asignable: true,
  },

  cuadrillero: {
    id: 'cuadrillero',
    nombre: 'Cuadrillero',
    descripcion: 'Trabaja con el censo, los cuadrantes y los ensayos.',
    color: 'bg-sky-700 text-white',
    chip: 'bg-sky-100 text-sky-800 border border-sky-300',
    nivel: 50,
    permisos: [
      P.CENSO_VER, P.CENSO_EDITAR,
      P.PROC_VER, P.PROC_EDITAR, P.PROC_PUBLICAR,
      P.ENSAYOS_VER, P.ENSAYOS_EDITAR,
      P.CAL_VER, P.CAL_EDITAR,
    ],
    asignable: true,
  },

  consulta: {
    id: 'consulta',
    nombre: 'Solo consulta',
    descripcion: 'Puede ver la información pero no modificar nada.',
    color: 'bg-slate-500 text-white',
    chip: 'bg-slate-100 text-slate-700 border border-slate-300',
    nivel: 10,
    permisos: [P.CENSO_VER, P.PROC_VER, P.ENSAYOS_VER, P.CAL_VER],
    asignable: true,
  },
}

export const ROL_POR_DEFECTO = 'cuadrillero'

// Roles que se pueden elegir al generar una licencia
export const ROLES_ASIGNABLES = Object.values(ROLES).filter((r) => r.asignable)

// --- Utilidades ---

export function datosRol(rol) {
  return ROLES[rol] || ROLES.consulta
}

export function tienePermiso(rol, permiso) {
  return datosRol(rol).permisos.includes(permiso)
}

export function tieneAlguno(rol, permisos = []) {
  const r = datosRol(rol)
  return permisos.some((p) => r.permisos.includes(p))
}

export function esSuperadmin(rol) {
  return rol === 'superadmin'
}

// ¿Puede "rolA" actuar sobre alguien con "rolB"?
// Nadie puede tocar a un superadmin, ni a alguien de su mismo nivel o superior.
export function puedeGestionarA(rolActor, rolObjetivo) {
  if (esSuperadmin(rolObjetivo)) return false
  return datosRol(rolActor).nivel > datosRol(rolObjetivo).nivel
}

// --- Limite de cuadrilleros ---
export const LIMITE_CUADRILLEROS_POR_DEFECTO = 5
