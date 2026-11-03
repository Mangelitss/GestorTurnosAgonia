// =============================================================
//  FIREBASE — SOLO LECTURA PUBLICA
//
//  Es el mismo proyecto que usa el panel de cuadrilleros. Estos
//  identificadores no son secretos: quien protege los datos son
//  las reglas de firestore.rules, que sin cuenta solo dejan leer
//  UN documento de /portal, y solo si se sabe su id (que sale del
//  codigo de acceso). Ni procesiones, ni ensayos, ni censo.
//
//  Aqui NO se importa firebase/auth a proposito: el portal nunca
//  inicia sesion, asi el paquete queda mas ligero y no hay forma
//  de que desde esta web se toque nada.
// =============================================================

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDz28y9yZe10BpHUEWoJzNPPnUcWrzO-SE',
  authDomain: 'gestorturnosagonia.firebaseapp.com',
  projectId: 'gestorturnosagonia',
  storageBucket: 'gestorturnosagonia.firebasestorage.app',
  messagingSenderId: '464022269570',
  appId: '1:464022269570:web:db9c25663943635d464e9b',
}

export const db = getFirestore(initializeApp(firebaseConfig))

export const COL = {
  PORTAL: 'portal',
}
