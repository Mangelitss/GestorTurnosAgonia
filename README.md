# Gestor de Turnos · Cristo de la Agonía

Sistema de gestión de costaleros del **Tercio del Cristo de la Agonía y María
Magdalena**, de la M.I. Mayordomía de Ntro. Padre Jesús Nazareno de Orihuela.

> ⚠️ **Repositorio privado.** El censo real del tercio (`datos.json` y sus
> copias) **no** se versiona: contiene nombres y datos personales de los
> costaleros y vive solo en el ordenador y en Firestore.

---

## Qué hay en este repositorio

```
gestor-cofrade/        Aplicación web actual (React + Firebase)
*.py                   Programa antiguo de escritorio (Python + Tkinter)
```

El programa en Python es la **versión anterior**, que se conserva como
referencia. El desarrollo activo está en `gestor-cofrade/`.

---

## La aplicación web

Panel para los cuadrilleros, construido con React, Vite, Tailwind y Firebase.

### Puesta en marcha

```bash
cd gestor-cofrade
npm install
npm run dev
```

La configuración de Firebase y el alta del primer administrador están
explicadas paso a paso en [`gestor-cofrade/CONFIGURACION.md`](gestor-cofrade/CONFIGURACION.md).

### Módulos

| Módulo | Qué hace |
|---|---|
| **Censo** | Alta y edición de costaleros, campos personalizados, importación del `datos.json` antiguo |
| **Procesiones** | Tramos del recorrido, cuadrantes de trono y cruz, detección de conflictos |
| **Ensayos** | Lista de asistencia, generación de turnos, archivado y reapertura |
| **Calendario** | Convocatorias mensuales, unidas a los ensayos |
| **Cuadrilleros** | Licencias, roles y permisos |

### Cómo se reparten los turnos

Los costaleros se ordenan por **altura de hombro** y se reparten en bloques: el
Turno A se lleva a los más altos, y los siguientes van cogiendo bloques del
mismo tamaño. Si al último le faltan, se completa con los más bajos del turno
anterior, marcados con **(R)**.

Dentro de cada turno hay dos formas de colocarlos:

- **Algoritmo V** — zigzag empezando por el Centro: Centro, Izquierda, Derecha,
  Centro, Derecha, Izquierda… Los más altos caen en la vara del centro.
- **Algoritmo U** — las tres varas se llenan a la vez desde las puntas hacia el
  trono, formando una U simétrica.

En ambos casos los más altos quedan en las puntas de las varas y los más bajos
pegados al trono.

### Verificación de hombros

La vara Izquierda se lleva con el hombro derecho y la Derecha con el izquierdo.
La del Centro va uniforme, decidida por separado para delante y para detrás. Si
alguien cae en la vara equivocada, el sistema busca con quién intercambiarlo
entre los de su misma altura exacta. Si no lo consigue, queda marcado en rojo.

### Conflictos

| Color | Significado | ¿Impide publicar? |
|---|---|---|
| 🔴 Rojo | Duplicado en el mismo turno, o hombro equivocado | **Sí** |
| 🟠 Naranja | Carga en dos tramos seguidos | No |
| 🟡 Amarillo | Repite turno de trono | No |
| 🔵 Azul | Repite turno de cruz | No |
| 🟢 Verde | Va en el trono y en la cruz | No |

### Reparto de peso

El trono pesa **1200 kg**, repartidos a partes iguales entre las tres varas. La
vara flexiona unos **9 cm**, así que quien esté por debajo de esa diferencia
respecto al más alto de su vara no llega a tocarla. El mapa de calor lo muestra
en pantalla.

### Protección del trabajo

Los cambios se guardan solos a los pocos segundos. Solo un cuadrillero puede
editar una procesión o un ensayo a la vez: el segundo entra en modo lectura y ve
los cambios en vivo. El bloqueo caduca solo a los 3 minutos.

---

## Pendiente

- [ ] Módulo de publicación
- [ ] Web pública de costaleros
- [ ] Mapa del recorrido con Leaflet
- [ ] Vista adaptada a móvil para el día de la procesión
