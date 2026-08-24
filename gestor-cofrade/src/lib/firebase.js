// =============================================================
//  CONFIGURACION DE FIREBASE
// =============================================================
//  IMPORTANTE (Miguel Angel):
//  1. Ve a https://console.firebase.google.com y crea un proyecto nuevo.
//  2. Dentro del proyecto -> icono </> (Web) -> registra la app.
//  3. Firebase te dara un objeto "firebaseConfig". Copialo AQUI ABAJO.
//  4. Activa en el menu lateral:  Authentication (Email/Password)  y  Firestore Database.
//
//  Estos datos NO son secretos: son identificadores publicos.
//  La seguridad real se aplica con las reglas de firestore.rules
// =============================================================

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDz28y9yZe10BpHUEWoJzNPPnUcWrzO-SE',
  authDomain: 'gestorturnosagonia.firebaseapp.com',
  projectId: 'gestorturnosagonia',
  storageBucket: 'gestorturnosagonia.firebasestorage.app',
  messagingSenderId: '464022269570',
  appId: '1:464022269570:web:db9c25663943635d464e9b',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app

// Nombres de las colecciones (centralizados para no repetir strings sueltos)
export const COL = {
  COSTALEROS: 'costaleros',
  PROCESIONES: 'procesiones',
  CUADRILLEROS: 'cuadrilleros',
  LICENCIAS: 'licencias',
  CALENDARIO: 'calendario',
  ENSAYOS: 'ensayos',
  CONFIG: 'config',
}
