// =============================================================
//  CONTEXTO DE AUTENTICACION Y PERMISOS
//  Flujo:  codigo de licencia -> registro (usuario + password) -> acceso
// =============================================================

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { auth, db, COL } from '../lib/firebase'
import {
  tienePermiso, tieneAlguno, esSuperadmin, datosRol, ROL_POR_DEFECTO,
} from '../lib/roles'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

// Traduce los codigos de error de Firebase a mensajes en castellano
function traducirError(code) {
  const mapa = {
    'auth/invalid-email': 'El correo electrónico no tiene un formato válido.',
    'auth/user-not-found': 'No existe ninguna cuenta con ese correo.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin conexión a internet. Comprueba tu red.',
  }
  return mapa[code] || 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)          // usuario de Firebase Auth
  const [perfil, setPerfil] = useState(null)      // documento en /cuadrilleros
  const [cargando, setCargando] = useState(true)

  // Escuchamos los cambios de sesion
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const snap = await getDoc(doc(db, COL.CUADRILLEROS, u.uid))
          setPerfil(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        } catch {
          setPerfil(null)
        }
      } else {
        setPerfil(null)
      }
      setCargando(false)
    })
    return unsub
  }, [])

  const rol = perfil?.rol || ROL_POR_DEFECTO

  // -----------------------------------------------------------
  //  PASO 1 — Verificar que el codigo de licencia es valido
  // -----------------------------------------------------------
  const verificarLicencia = useCallback(async (codigo) => {
    const limpio = codigo.trim().toUpperCase()
    if (!limpio) return { ok: false, error: 'Introduce un código de licencia.' }

    try {
      const snap = await getDoc(doc(db, COL.LICENCIAS, limpio))

      if (!snap.exists()) {
        return { ok: false, error: 'Este código de licencia no existe. Revísalo o pide uno nuevo.' }
      }

      const lic = snap.data()

      if (lic.activa === false) {
        return { ok: false, error: 'Esta licencia ha sido desactivada. Contacta con el administrador.' }
      }
      if (lic.uid) {
        return { ok: false, error: 'Esta licencia ya ha sido utilizada por otro cuadrillero.' }
      }

      return { ok: true, licencia: { codigo: limpio, ...lic } }
    } catch {
      return { ok: false, error: 'No se ha podido verificar la licencia. Comprueba tu conexión.' }
    }
  }, [])

  // -----------------------------------------------------------
  //  PASO 2 — Registrar al cuadrillero y consumir la licencia
  // -----------------------------------------------------------
  const registrarConLicencia = useCallback(async ({ codigo, nombre, apellidos, email, password }) => {
    const check = await verificarLicencia(codigo)
    if (!check.ok) return check

    const nom = nombre.trim()
    const ape = (apellidos || '').trim()
    const completo = ape ? `${nom} ${ape}` : nom

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const uid = cred.user.uid

      await updateProfile(cred.user, { displayName: completo })

      const rolAsignado = check.licencia.rol || ROL_POR_DEFECTO

      const ficha = {
        nombre: nom,
        apellidos: ape,
        nombre_completo: completo,
        email: email.trim().toLowerCase(),
        licencia: check.licencia.codigo,
        rol: rolAsignado,
        activo: true,
        creado: serverTimestamp(),
        ultimo_acceso: serverTimestamp(),
      }

      await setDoc(doc(db, COL.CUADRILLEROS, uid), ficha)

      await updateDoc(doc(db, COL.LICENCIAS, check.licencia.codigo), {
        uid,
        nombre_cuadrillero: completo,
        email_cuadrillero: email.trim().toLowerCase(),
        fecha_activacion: serverTimestamp(),
      })

      setPerfil({ id: uid, ...ficha })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: traducirError(e.code) }
    }
  }, [verificarLicencia])

  // -----------------------------------------------------------
  //  Login normal (ya registrado)
  // -----------------------------------------------------------
  const iniciarSesion = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)

      const ref = doc(db, COL.CUADRILLEROS, cred.user.uid)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        await fbSignOut(auth)
        return { ok: false, error: 'Tu cuenta no tiene una licencia asociada. Contacta con el administrador.' }
      }
      if (snap.data().activo === false) {
        await fbSignOut(auth)
        return { ok: false, error: 'Tu acceso ha sido desactivado. Contacta con el administrador.' }
      }

      await updateDoc(ref, { ultimo_acceso: serverTimestamp() }).catch(() => {})
      setPerfil({ id: snap.id, ...snap.data() })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: traducirError(e.code) }
    }
  }, [])

  const cerrarSesion = useCallback(() => fbSignOut(auth), [])

  // -----------------------------------------------------------
  //  Permisos
  // -----------------------------------------------------------
  const puede = useCallback((permiso) => tienePermiso(rol, permiso), [rol])
  const puedeAlguno = useCallback((permisos) => tieneAlguno(rol, permisos), [rol])

  const valor = useMemo(() => ({
    user,
    perfil,
    cargando,
    autenticado: !!user && !!perfil,
    rol,
    infoRol: datosRol(rol),
    esSupremo: esSuperadmin(rol),
    puede,
    puedeAlguno,
    verificarLicencia,
    registrarConLicencia,
    iniciarSesion,
    cerrarSesion,
  }), [user, perfil, cargando, rol, puede, puedeAlguno,
       verificarLicencia, registrarConLicencia, iniciarSesion, cerrarSesion])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// --- Helper: nombre formateado "Nombre, Apellidos" ---
export function nombreConComa(perfil) {
  if (!perfil) return ''
  const nom = perfil.nombre || ''
  const ape = perfil.apellidos || ''
  if (nom && ape) return `${nom}, ${ape}`
  // Compatibilidad con cuentas antiguas que solo tenian "nombre" completo
  const partes = (perfil.nombre_completo || nom).trim().split(/\s+/)
  if (partes.length <= 1) return partes[0] || ''
  return `${partes[0]}, ${partes.slice(1).join(' ')}`
}
