# Portal del Costalero

Web pública del **Tercio del Santísimo Cristo de la Agonía y María Magdalena**.
Aquí entra el costalero, busca su nombre y ve lo que le toca.

No pide cuenta: se entra con el **código del tercio**, que elige y cambia el
cuadrillero desde el panel (menú **Web costaleros**). Solo muestra lo que se ha
publicado allí, y solo mientras la web esté visible.

---

## Qué ve el costalero

Una pestaña por cada cosa publicada: Miércoles, Viernes, extraordinarias y ensayos.
En cada una, arriba los avisos, la hora y el lugar de citación, la salida y lo que
hay que tener en cuenta. Debajo:

| Apartado | Qué muestra |
|---|---|
| **Búscate / Lo mío** | Tramo a tramo: cuándo carga, con qué turno y qué pieza, y cuándo descansa con qué cometido. Su puesto exacto en la vara y la nota personal del cuadrillero. En un ensayo, su turno y su puesto. |
| **Cuadrante** | Todos los turnos con colores (repite trono, repite cruz, trono y cruz) y su leyenda. Su nombre, resaltado en dorado. |
| **Recorrido** | Los tramos de ida y regreso, de dónde a dónde, qué turno carga cada uno y la normativa. |

La web recuerda en el móvil la clave de acceso (nunca el código) y tu nombre.
**No soy yo** olvida el nombre; **Salir de este móvil**, el acceso.

---

## Cómo se protege

- Lo publicado **no** se lee de `/procesiones` ni `/ensayos`, que ya no son
  públicas. Al publicar, el panel hace una copia limpia en un único documento
  `/portal/{clave}`, donde `clave = PBKDF2(código)`.
- Las reglas dejan **leer** ese documento por su id, pero **nadie puede listar**
  la colección. Sin el código no hay forma de dar con él.
- La copia solo lleva nombres, puestos, tramos y textos. Ni alturas, ni hombros,
  ni teléfonos, ni ids del censo (se cambian por `p1`, `p2`...).
- **Cambiar el código** borra la copia vieja: el código anterior deja de valer al
  instante. **Ocultar la web** también la borra: no queda nada que leer.
- El código en claro solo está en `/config/portal`, que solo pueden leer los
  cuadrilleros.
- Tras tres fallos seguidos, la pantalla de acceso hace esperar cada vez más.

El código es tan fuerte como lo que se elija: el panel admite de 3 a 20
caracteres. Uno corto se adivina probando; cuanto más largo, más seguro.

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

Una sola lectura: `getDoc(/portal/{clave})`. Nada más es legible sin cuenta.

La copia la genera el panel cada vez que se publica, se retira o se cambia la
información de algo publicado. Si se toca una procesión ya publicada (turnos,
tramos…), el módulo **Web costaleros** avisa de *cambios sin subir* y ofrece
el botón **Subir cambios**.

El cálculo de la clave y la copia limpia viven en
`../gestor-cofrade/src/lib/portal.js`, compartido por el alias `@nucleo`.

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

La configuración de hosting ya está en `firebase.json`, con la carpeta `dist`,
el rewrite a `index.html` y el sitio `costaleros-agonia`.

Queda en **https://costaleros-agonia.web.app**. Es el enlace que muestra el
panel en **Web costaleros**; si cambia de dominio, se corrige allí con *Cambiar*.

| Web | Sitio de hosting | Carpeta |
|---|---|---|
| Costaleros | https://costaleros-agonia.web.app | `web-costaleros/` |
| Cuadrilleros (panel) | https://cuadrilleros-agonia.web.app | `gestor-cofrade/` |

Cada carpeta despliega solo en su sitio (campo `site` de su `firebase.json`),
así que una nunca pisa a la otra. Las reglas de Firestore se publican desde el
panel: `npm run deploy:reglas` en `gestor-cofrade/`.

---

## Aviso sobre datos personales

Quien tenga el código ve los nombres de todo el tercio y quién va en cada
puesto. Nada más: ni teléfonos, ni alturas, ni ningún otro campo del censo.

Si el código se filtra, se cambia en el panel y el antiguo deja de servir.
