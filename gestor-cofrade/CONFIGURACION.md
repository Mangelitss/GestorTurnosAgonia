# Puesta en marcha — Gestor Cofrade v2

Guía paso a paso. Sigue el orden y en 15 minutos lo tienes funcionando.

---

## 1. Crear el proyecto en Firebase

1. Entra en <https://console.firebase.google.com>
2. **Agregar proyecto** → nombre: `gestor-agonia` (o el que quieras)
3. Puedes desactivar Google Analytics, no hace falta.

---

## 2. Activar Authentication

1. Menú lateral → **Compilación → Authentication** → *Comenzar*
2. Pestaña **Sign-in method**
3. Habilita **Correo electrónico/contraseña** → *Guardar*

> No habilites "Vínculo de correo", solo la opción normal.

---

## 3. Crear la base de datos Firestore

1. Menú lateral → **Compilación → Firestore Database** → *Crear base de datos*
2. Ubicación: **eur3 (europe-west)** — es la más cercana a España
3. Empieza en **modo de producción** (las reglas las ponemos en el paso 5)

---

## 4. Registrar la aplicación web

1. En la portada del proyecto, pulsa el icono **`</>`** (Web)
2. Apodo: `panel-cuadrilleros` → *Registrar app*
3. Firebase te muestra un bloque como este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestor-agonia.firebaseapp.com",
  projectId: "gestor-agonia",
  storageBucket: "gestor-agonia.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc"
};
```

4. **Copia esos valores** y pégalos en `src/lib/firebase.js`, sustituyendo los
   `PEGA_AQUI_...`

> Estos datos no son secretos, son identificadores públicos. La seguridad real
> la dan las reglas del paso siguiente.

---

## 5. Publicar las reglas de seguridad

1. **Firestore Database → pestaña Reglas**
2. Borra lo que haya y pega **todo** el contenido del archivo `firestore.rules`
3. Pulsa **Publicar**

---

## 6. Crear TU licencia de administrador supremo

Como todavía no hay ningún cuadrillero, hay que crear la primera licencia desde
la consola. Las siguientes ya las generarás desde la propia aplicación.

1. **Firestore Database → Datos → Iniciar colección**
2. ID de la colección: `licencias`
3. ID del documento: `AGON-2026-0001` (escríbelo tal cual, en mayúsculas)
4. Añade estos campos:

| Campo    | Tipo    | Valor        |
|----------|---------|--------------|
| `activa` | boolean | `true`       |
| `uid`    | null    | *(tipo null)* |
| `rol`    | string  | `superadmin` |

5. **Guardar**

> ⚠️ El campo `uid` debe existir con tipo **null**, no como texto vacío.
>
> ⚠️ El rol `superadmin` **solo** puede crearse a mano desde aquí. Las reglas de
> seguridad impiden que nadie se lo autoasigne desde la aplicación. Esta es tu
> garantía de control absoluto.

---

## 6-bis. Fijar el límite de cuadrilleros (opcional)

Por defecto el sistema permite **5 cuadrilleros**. Puedes cambiarlo después
desde la app (botón *Límite* en la pantalla de Cuadrilleros), o crearlo ahora:

1. **Iniciar colección** → `config`
2. ID del documento: `general`
3. Campo: `max_cuadrilleros` (number) = el número que quieras

---

## 7. Arrancar la aplicación

Abre una terminal en la carpeta `gestor-cofrade` y ejecuta:

```bash
npm install
npm run dev
```

Se abrirá <http://localhost:5173>

---

## 8. Primer acceso

1. Pulsa **ACTIVAR LICENCIA**
2. Introduce `AGON-2026-0001`
3. Rellena tu **nombre**, tus **apellidos**, correo y contraseña
4. Ya estás dentro como 👑 **Administrador supremo**

---

## 9. Cargar el censo antiguo

1. Ve a **Censo** en el menú lateral
2. Pulsa **📥 Importar**
3. Selecciona el `datos.json` del programa antiguo
4. Revisa la previsualización y pulsa importar

---

## 10. Dar de alta a los demás cuadrilleros

1. Ve a **Cuadrilleros**
2. **➕ Generar licencia** → elige el **rol** que tendrá esa persona
3. **📋 Copiar** y pásaselo al cuadrillero por WhatsApp
4. Él entra en la web, pulsa *Activar licencia* y crea su cuenta

---

## Sistema de roles

| Rol | Nivel | Qué puede hacer |
|-----|-------|-----------------|
| 👑 **Administrador supremo** | 100 | Todo. Gestiona roles, límite de cuadrilleros y configuración. Nadie puede desactivarlo ni cambiarle el rol. |
| **Cuadrillero mayor** (`admin`) | 75 | Todo el tercio: censo completo (incluido borrar e importar), procesiones, ensayos, calendario y dar de alta cuadrilleros. |
| **Cuadrillero** | 50 | Censo (ver y editar, no borrar), procesiones, ensayos y calendario. |
| **Solo consulta** | 10 | Ver la información sin poder modificar nada. |

**Garantías de seguridad:**

- El rol `superadmin` solo se puede crear a mano desde la consola de Firebase.
  Las reglas impiden que nadie se lo asigne desde la aplicación.
- Nadie puede modificar, desactivar ni borrar a un superadmin.
- Solo puedes cambiar el rol de alguien que esté **por debajo de ti**.
- Un admin no puede ascender a nadie a su mismo nivel.
- El límite de cuadrilleros solo lo cambia el superadmin.

---

## Estructura de datos en Firestore

```
/costaleros/{id}
    nombre, altura, pref_hombro, telefono,
    miercoles_santo, viernes_santo, puede_repetir,
    campos_extra: { ... }

/licencias/{CODIGO}
    activa, uid, rol, nombre_cuadrillero,
    email_cuadrillero, fecha_activacion, creada_por

/cuadrilleros/{uid}
    nombre, apellidos, nombre_completo, email,
    licencia, rol, activo, creado, ultimo_acceso

/config/general
    max_cuadrilleros

/config/campos_censo
    campos: [ { clave, etiqueta, tipo } ]

/config/calendario
    tipos: [ ... ]      ← motivos añadidos por el cuadrillero
    lugares: [ ... ]

/calendario/{id}
    fecha_iso ("2027-03-05"), hora, tipo, lugar, indicaciones,
    ensayo_id                     ← ensayo unido (si el motivo es "Ensayo")

/ensayos/{id}
    fecha_iso, hora, lugar, notas,
    estado ("abierto" | "archivado"),
    evento_id,                    ← convocatoria unida en el calendario
    asistentes: [ { costalero_id, nombre, altura } ],
    config: { Izquierda:{Delante,Detras}, Centro:{...}, Derecha:{...} },
    cuadrante: [ { id:"A", varas:{ ... } } ]

/procesiones/{id}
    tipo ("miercoles" | "viernes" | "extraordinaria"),
    nombre, anio, fecha_iso,
    estado ("borrador" | "publicada"), publicado,
    lleva_cruz, turnos_trono, turnos_cruz,
    config_trono, config_cruz,
    cuadrante_trono, cuadrante_cruz,
    tramos: [ { id, nombre, desde, hasta, fase, orden,
                turno_trono, turno_cruz, texto } ],
    recorrido: { nombre_archivo, puntos },
    normativa, notas_costalero
```

---

## Módulo de Procesiones

### Campos nuevos del censo

`Cruz Miércoles` y `Cruz Viernes`. Quien los tenga marcados va **obligatoria y
únicamente** a los turnos de cruz de ese día, quedando **excluido del trono**.

### Las tres pestañas

**🗺️ Tramos** — Subes el recorrido en GPX o KML (opcional) y defines los tramos
con su desde/hasta. Cada tramo pertenece a la ida o al regreso, y lleva
**obligatoriamente** un turno de trono asignado, más uno de cruz si procede.

**👥 Turnos** — Trono y cruz en la misma pestaña, alternando con el selector de
arriba.

- *Trono*: 3 varas × 12 en forma de U. Botón **«Rellenar con repetidores»** para
  los huecos, usando solo a quienes tengan «puede repetir» en el censo. Aparecen
  marcados con **(R)**.
- *Cruz*: 2 varas con 2 delante y 2 detrás. Se reparte buscando que los 4 de
  delante tengan alturas parecidas entre sí, y lo mismo los 4 de detrás. Botón
  **«Rellenar cruz»** que completa los huecos con los más parejos en altura.
- Si un turno de cruz tiene entre 4 y 8 costaleros no salta ningún aviso. Por
  debajo de 4, sí.

**📤 Publicar** — Comprobaciones previas, panel de conflictos, indicaciones por
tramo, normativa y la vista de **indicaciones por costalero** (en qué tramos
carga y con qué pieza, con nota personal editable).

### Los cinco conflictos

| Color | Qué significa | ¿Impide publicar? |
|---|---|---|
| 🔴 Rojo parpadeante | Dos posiciones a la vez en el mismo turno o tramo | **Sí** |
| 🟠 Naranja | Carga en dos tramos seguidos | No |
| 🟡 Amarillo | Repite turno de trono | No |
| 🔵 Azul | Repite turno de cruz | No |
| 🟢 Verde | Va en el trono y en la cruz | No |

Entre la ida y el regreso hay descanso, así que ese salto **nunca** cuenta como
tramos consecutivos.

En la vista de cada costalero, el **trono va en morado y la cruz en azul**.

### Valores por defecto

| | Turnos trono | Turnos cruz | Tramos ida | Tramos regreso |
|---|---|---|---|---|
| Miércoles Santo | 3 | 3 | 3 | 0 |
| Viernes Santo | 3 | 4 | 4 | 3 (sin cruz) |
| Extraordinaria | 2 | 2 | 2 | 0 |

### Histórico y duplicado

Una procesión por año y tipo, todas conservadas. El botón 📑 duplica la
estructura de otro año (recorrido, tramos con sus turnos asignados, textos y
normativa) **sin copiar los costaleros**.

---

## Calendario y Ensayos van unidos

Una convocatoria de motivo **«Ensayo»** y su ensayo son **dos caras de lo mismo**.
No hay que crearlos por separado nunca:

| Lo que haces | Lo que ocurre |
|---|---|
| Creas una cita de motivo «Ensayo» | Se crea el ensayo y se abre para pasar lista |
| Creas un ensayo | Se crea su convocatoria en el calendario |
| Cambias fecha, hora, lugar o notas en cualquiera de los dos | El otro se actualiza solo |
| Borras la convocatoria | Se borra también el ensayo, con su asistencia y cuadrante |
| Borras el ensayo | Se borra también su convocatoria |
| Cambias el motivo de «Ensayo» a otra cosa | Se te pregunta si borrar el ensayo o solo desvincularlo |
| Cambias el motivo de otra cosa a «Ensayo» | Se crea el ensayo y se abre |

**Cómo reconocerlos:** en la rejilla del calendario, las citas con ensayo llevan
el icono 📋. En el listado de Ensayos, los que tienen convocatoria muestran
«🔗 Unido al calendario».

> Un ensayo puede quedarse **suelto** (sin cita) si lo desvinculas al cambiar el
> motivo de su convocatoria. Sigue funcionando igual, simplemente ya no aparece
> en el calendario.

---

## Cómo funciona el módulo de Ensayos

1. **Crear el ensayo** — desde el listado de Ensayos, o creando una convocatoria
   de motivo *Ensayo* en el calendario. En ambos casos se crea la pareja completa.

2. **Pasar lista** — escribe el nombre en el buscador de la izquierda y se
   apunta. Si esa persona no está en el censo, te ofrece darla de alta pidiendo
   como mínimo nombre y altura de hombro.

3. **Generar turnos** — reparte a los asistentes por altura de hombro. Puedes
   ajustar el número de turnos y cuántos costaleros van en cada vara.

4. **Colocar a mano** — arrastra costaleros entre posiciones, pulsa 🔒 para
   fijar a alguien en su sitio, ✕ para quitarlo, o haz clic en un hueco vacío
   para buscar a quien colocar ahí. Con los botones «+ posición» amplías una
   vara sobre la marcha.

5. **Si alguien llega tarde** — al apuntarlo con el cuadrante ya hecho, el
   sistema te pregunta si colocarlo en un hueco libre, regenerar todo, o
   dejarlo pendiente.

6. **Guardar** — los movimientos manuales se guardan con el botón
   «💾 Guardar cambios» que aparece arriba cuando hay algo sin guardar.

7. **Archivar** — congela el ensayo para consultarlo más adelante. Puedes
   reabrirlo en cualquier momento (útil si el ensayo se corta por lluvia).
   Archivar **no** toca la convocatoria del calendario.

8. **Exportar** — PDF del cuadrante y PDF de la lista de asistentes. Se abren
   en la ventana de impresión del navegador: elige *Guardar como PDF*.

> ⚠️ Si no se abre la ventana del PDF, permite las **ventanas emergentes** para
> esta página en tu navegador.

**Conflictos:** en los ensayos solo se comprueba el rojo — que la misma persona
no ocupe dos posiciones dentro del mismo turno. Aparece parpadeando en rojo y
en un aviso arriba.

---

## Desplegar en internet (cuando esté listo)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # carpeta pública: dist
npm run build
firebase deploy
```

---

## Problemas frecuentes

**"Missing or insufficient permissions"**
Las reglas no están publicadas, o tu ficha de cuadrillero tiene `activo: false`.

**"Este código de licencia no existe"**
Revisa que el ID del documento en Firestore esté en mayúsculas y sin espacios.

**La pantalla se queda en "Comprobando sesión…"**
No has pegado bien la configuración en `src/lib/firebase.js`. Abre la consola del
navegador (F12) para ver el error concreto.
