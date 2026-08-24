// =============================================================
//  EDICION PROTEGIDA
//
//  Junta en un solo sitio las tres protecciones:
//
//   1. BLOQUEO      Solo un cuadrillero edita a la vez. El
//                   segundo entra en solo lectura y ve los
//                   cambios del primero en vivo.
//   2. GUARDADO     Los cambios se guardan solos a los pocos
//      AUTOMATICO   segundos, y ademas queda el boton manual.
//   3. AVISO        Si intenta cerrar la pestaña con algo sin
//      AL SALIR     guardar, el navegador le pregunta.
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import {
  tomarBloqueo, renovarBloqueo, soltarBloqueo, escucharBloqueo,
  estaVivo, RENOVAR_CADA_MS,
} from './bloqueos'

// Cuanto esperamos tras el ultimo cambio antes de guardar solo
export const RETARDO_AUTOGUARDADO_MS = 2500

export function useEdicionProtegida({
  tipo,               // 'procesion' | 'ensayo'
  id,
  coleccion,          // nombre de la coleccion en Firestore
  usuario,            // { uid, nombre }
  puedeEditar,        // permiso del rol
  datos,              // el documento tal y como está en pantalla
  setDatos,
  guardarEnServidor,  // (cambios) => Promise
  activo = true,      // false para archivados, etc.
}) {
  const [bloqueo, setBloqueo] = useState(null)         // quién lo tiene
  const [tengoElBloqueo, setTengoElBloqueo] = useState(false)
  const [comprobando, setComprobando] = useState(true)
  const [sinGuardar, setSinGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [ultimoGuardado, setUltimoGuardado] = useState(null)

  const temporizador = useRef(null)
  const pendiente = useRef(null)
  const montado = useRef(true)

  const soloLectura = !puedeEditar || !activo || !tengoElBloqueo

  // -----------------------------------------------------------
  //  1. TOMAR EL BLOQUEO AL ENTRAR
  // -----------------------------------------------------------
  const intentarTomar = useCallback(async (forzar = false) => {
    if (!id || !usuario?.uid || !puedeEditar || !activo) {
      setComprobando(false)
      return { ok: false }
    }

    setComprobando(true)
    const r = await tomarBloqueo(tipo, id, usuario, { forzar })

    if (!montado.current) return r

    setTengoElBloqueo(r.ok)
    if (!r.ok) setBloqueo(r.ocupadoPor)
    setComprobando(false)
    return r
  }, [tipo, id, usuario?.uid, usuario?.nombre, puedeEditar, activo])

  useEffect(() => {
    montado.current = true
    intentarTomar()
    return () => { montado.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, puedeEditar, activo])

  // -----------------------------------------------------------
  //  2. RENOVARLO MIENTRAS SEGUIMOS DENTRO
  // -----------------------------------------------------------
  useEffect(() => {
    if (!tengoElBloqueo || !id || !usuario?.uid) return
    const t = setInterval(() => {
      renovarBloqueo(tipo, id, usuario.uid)
    }, RENOVAR_CADA_MS)
    return () => clearInterval(t)
  }, [tengoElBloqueo, tipo, id, usuario?.uid])

  // -----------------------------------------------------------
  //  3. SOLTARLO AL SALIR
  // -----------------------------------------------------------
  useEffect(() => {
    if (!tengoElBloqueo || !id || !usuario?.uid) return

    const soltar = () => { soltarBloqueo(tipo, id, usuario.uid) }
    window.addEventListener('pagehide', soltar)

    return () => {
      window.removeEventListener('pagehide', soltar)
      soltar()
    }
  }, [tengoElBloqueo, tipo, id, usuario?.uid])

  // -----------------------------------------------------------
  //  4. SI ESTOY EN SOLO LECTURA, VIGILO POR SI SE LIBERA
  // -----------------------------------------------------------
  useEffect(() => {
    if (tengoElBloqueo || !id || !puedeEditar || !activo) return

    return escucharBloqueo(tipo, id, (datosBloqueo) => {
      if (!datosBloqueo || !estaVivo(datosBloqueo)) {
        setBloqueo(null)          // ha quedado libre
      } else if (datosBloqueo.uid !== usuario?.uid) {
        setBloqueo({ uid: datosBloqueo.uid, nombre: datosBloqueo.nombre })
      }
    })
  }, [tengoElBloqueo, tipo, id, puedeEditar, activo, usuario?.uid])

  // -----------------------------------------------------------
  //  5. EN SOLO LECTURA, VER LOS CAMBIOS DEL OTRO EN VIVO
  // -----------------------------------------------------------
  useEffect(() => {
    if (tengoElBloqueo || !id || !coleccion) return

    return onSnapshot(doc(db, coleccion, id), (snap) => {
      if (!snap.exists() || !montado.current) return
      setDatos((previo) => ({ ...previo, ...snap.data(), id: snap.id }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tengoElBloqueo, coleccion, id])

  // -----------------------------------------------------------
  //  6. GUARDADO AUTOMATICO
  // -----------------------------------------------------------
  const guardarAhora = useCallback(async (mensaje) => {
    const cambios = pendiente.current
    if (!cambios) return { ok: true, nada: true }

    if (temporizador.current) {
      clearTimeout(temporizador.current)
      temporizador.current = null
    }

    setGuardando(true)
    try {
      await guardarEnServidor(cambios)
      pendiente.current = null
      if (montado.current) {
        setSinGuardar(false)
        setUltimoGuardado(new Date())
      }
      return { ok: true, mensaje }
    } catch (e) {
      console.error('Error al guardar:', e)
      return { ok: false, error: e }
    } finally {
      if (montado.current) setGuardando(false)
    }
  }, [guardarEnServidor])

  // Registrar un cambio: actualiza la pantalla y programa el guardado
  const cambiar = useCallback((cambios) => {
    if (soloLectura) return

    setDatos((p) => ({ ...p, ...cambios }))
    pendiente.current = { ...(pendiente.current || {}), ...cambios }
    setSinGuardar(true)

    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => {
      guardarAhora()
    }, RETARDO_AUTOGUARDADO_MS)
  }, [soloLectura, setDatos, guardarAhora])

  // Al desmontar, guardamos lo que quede pendiente
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current)
    if (pendiente.current) {
      guardarEnServidor(pendiente.current).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -----------------------------------------------------------
  //  7. AVISO AL CERRAR LA PESTAÑA
  // -----------------------------------------------------------
  useEffect(() => {
    if (!sinGuardar) return
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sinGuardar])

  return {
    soloLectura,
    bloqueo,              // { nombre, inactivoMin } si lo tiene otro
    tengoElBloqueo,
    comprobando,
    sinGuardar,
    guardando,
    ultimoGuardado,
    cambiar,              // usar en vez de setDatos
    guardarAhora,
    forzarEntrada: () => intentarTomar(true),
    reintentar: () => intentarTomar(false),
  }
}
