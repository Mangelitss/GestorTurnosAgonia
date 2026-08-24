# Portal del Costalero

Web pública del **Tercio del Santísimo Cristo de la Agonía y María Magdalena**.
Aquí entra el costalero, busca su nombre y ve lo que le toca.

No pide cuenta ni contraseña: solo muestra lo que el cuadrillero ha publicado
desde el panel.

---

## Qué ve el costalero

| Apartado | Qué muestra |
|---|---|
| **Lo mío** | Tramo a tramo: cuándo carga, con qué turno y qué pieza, y cuándo descansa con qué cometido. Su puesto exacto en la vara y la nota personal del cuadrillero. |
| **Cuadrante** | Todos los turnos del trono y de la cruz, con su nombre resaltado en dorado. |
| **Recorrido** | Los tramos de ida y regreso con sus indicaciones, y la normativa de la cuadrilla. |
| **Ensayos** | Las próximas convocatorias del calendario. |

La web recuerda quién eres en el móvil (`localStorage`), así que la segunda vez
que entras vas directo a tu ficha. El botón **No soy yo** lo olvida.

---

## Puesta en marcha

```bash
cd web-costaleros
npm install
npm run dev          # http://localhost:5174
```

Usa el mismo proyecto de Firebase que el panel (`gestorturnosagonia`), así que
no hay nada más que configurar.

---

## Cómo se relaciona con el panel

Es una **aplicación aparte**, pero no duplica ni una línea de los algoritmos.
Los módulos de cálculo se leen directamente de la carpeta del panel a través
del alias `@nucleo`, definido en `vite.config.js`:

```
@nucleo  ->  ../gestor-cofrade/src/lib
```

De ahí salen `constantes.js`, `cuadrante.js`, `conflictos.js` y `hombros.js`,
que son código puro sin Firebase. Si mañana cambia el reparto de turnos en el
panel, el portal lo refleja solo.

> ⚠️ Por eso las dos carpetas tienen que estar **juntas**. Si mueves una de
> sitio, ajusta el alias.

Otra consecuencia: en `tailwind.config.js` la carpeta del núcleo entra en el
rastreo de clases. Si se quita, los chips de turnos salen sin estilo.

---

## De dónde salen los datos

Todo se lee de Firestore sin iniciar sesión. Las reglas
(`../gestor-cofrade/firestore.rules`) solo dejan leer sin cuenta:

- `/procesiones` **con `publicado == true`** — por eso la consulta lleva
  siempre ese `where`: sin él, Firestore rechaza la consulta entera.
- `/calendario` — para las convocatorias.

El censo (`/costaleros`) **nunca** es público. Los nombres que se ven salen del
cuadrante ya publicado, no del censo.

Mientras el cuadrillero no pulse *Publicar*, la procesión no existe para esta
web.

---

## Publicar en internet

```bash
npm run deploy
```

Equivale a `npm run build && firebase deploy --only hosting`. La primera vez:

```bash
npm install -g firebase-tools
firebase login
firebase use gestorturnosagonia
```

La configuración de hosting ya está en `firebase.json`, con la carpeta `dist`
y el rewrite a `index.html`.

> El panel de cuadrilleros y este portal son dos sitios distintos del mismo
> proyecto. Si despliegas los dos, usa
> [targets de hosting](https://firebase.google.com/docs/hosting/multisites)
> para no pisar uno con otro.

---

## Aviso sobre datos personales

Esta web es **pública y sin identificación**: cualquiera con el enlace ve los
nombres de todo el tercio y quién va en cada puesto. Es una decisión tomada a
propósito, y es la misma que tenía el portal anterior.

Lo que **no** sale: teléfonos, ni ningún campo del censo más allá del nombre y
la altura de hombro que ya viajan dentro del cuadrante.

Si algún día hiciera falta cerrarla, la vía más corta es pedir un código por
costalero antes de mostrar nada.
