# Instrucciones para Claude Code — Staff AJapp (PWA)

> ⚠️ Reescrito 2026-07-15 (pivote). Si tenías contexto de una versión
> anterior de este archivo con Firebase/Firestore/Cloud Functions/custom
> claims: **ignóralo, está superseded.** Ver `docs/DECISIONS.md` D13-D20
> para el porqué del cambio.

Léelo entero antes de escribir código.

## Qué es esto (versión corta)

Staff AJapp es la evolución de un Atajo de iPhone que Pau ya usaba en la
edición pasada del Curso de Protocolo: escanear el QR de una acreditación,
llamar a una URL de Apps Script con el número, la hoja de cálculo registra
la asistencia. Ahora se construye como PWA para que lo use todo el equipo
(~20 personas) a la vez desde sus móviles, no solo un Atajo personal.

**La app tiene 2 pantallas** (más el login inicial, que no cuenta como
pantalla de navegación): **Escanear** y **Estadísticas**. Nada más — no
hay pantalla de Sesiones ni de Admin. Activar la sesión en curso se hace
editando una celda directamente en la hoja de cálculo, fuera de la app.

## Orden de lectura obligatorio

1. `docs/DECISIONS.md` — decisiones, en orden cronológico. Las últimas
   (D13 en adelante) son las que valen; las anteriores se dejan como
   historial de cómo se llegó hasta aquí, no las repliques.
2. `docs/ARCHITECTURE.md` — stack, diagrama, estrategia offline.
3. `docs/SHEET_SCHEMA.md` — la estructura real de la hoja de cálculo
   (pestañas `asistentes`, `Config`, `asistencias`) y las 4 acciones del
   Web App de Apps Script.
4. `docs/FLOWS.md` — diagramas de cada flujo.
5. `docs/PROJECT_SETUP.md` — checklist de infraestructura. Nota: la mayor
   parte de este archivo describe pasos de Firebase que **ya no hacen
   falta** — tiene un aviso al principio de qué sigue vigente.

**Ignora `docs/FIRESTORE_SCHEMA.md` y `firebase/`** — están marcados como
superseded, solo se dejan como referencia histórica de por qué se diseñó
así al principio. No leas esos archivos para entender el sistema actual.

## Ya construido — reutilizar, no rehacer

- `apps-script/Code.gs` — **este es el código más importante del repo**.
  Es el script real que Pau ya usaba (comentarios "NO-PIN vFinal"),
  extendido con 4 cosas mínimas marcadas `// AÑADIDO` en el propio
  archivo: `LockService`, columna `staff` opcional, acción `stats`, y
  respuesta JSON opcional. No lo reescribas desde cero — si hace falta
  tocarlo, entiende primero qué es del script original (no tocar la
  lógica base sin motivo) y qué es la extensión.
- La demo PWA de la mañana (`index.html`, `css/app.css`,
  `js/{demo-data,store,scanner,views,app}.js`, `sw.js`,
  `manifest.webmanifest`, `icons/`) — reutilizable pero **hay que
  recortarla**: quita las pestañas Sesiones y Admin de `views.js`/`app.js`
  (ya no existen, D14/D15), y reescribe `js/store.js` para hacer `fetch()`
  al Web App de Apps Script (GET, query string, sin headers custom — ver
  "Por qué peticiones GET simples" en `ARCHITECTURE.md`) en vez de hablar
  con Firestore o `localStorage` puro. La cola offline que ya tenía la
  demo (`getQueue`/`setQueue`/`syncQueue`) se reutiliza casi tal cual,
  solo cambia qué hace "sincronizar" (ver `docs/FLOWS.md` §2).
- Diseño visual de referencia: sigue siendo `../Staff AJapp/Staff AJapp/`
  (proyecto Xcode/SwiftUI) — paleta en `Components/Theme.swift`
  (`#0B0B0B` / `#1A1A1A` / `#C6A75E`), estilo de la pantalla de escaneo en
  `Views/Scan/`. No hay Figma nuevo.

## Tareas concretas

1. Desplegar (o dejar listo para que Pau despliegue) `apps-script/Code.gs`
   como Web App sobre la hoja real — necesita la URL `.../exec` resultante
   para poder probar la PWA contra datos reales. Si no la tienes, trabaja
   con una URL de prueba/mock y pregúntale a Pau por la real.
2. Recortar `js/views.js` y `js/app.js`: solo Login, Escanear,
   Estadísticas. Quitar todo rastro de Sesiones/Admin (tabs, rutas,
   funciones de `store.js` que ya no se usan como `setEstadoSesion`,
   `addAsistente`, `importAsistentes`, `informeAsistencia`, etc. — esas
   responsabilidades ya no viven en la app, D15/D20).
3. Reescribir `js/store.js`: función `checkin(codigo, metodo)` hace
   `fetch` al Web App con `num`, `staff` (el usuario logueado) y
   `format=json`; función `stats()` hace `fetch` con `action=stats`.
   Mantener la cola offline existente, cambiando el destino de la
   sincronización.
4. Pantalla Estadísticas: polling cada 5-10s mientras está abierta,
   parar el intervalo al salir de la pantalla (ya había un patrón
   parecido en `Views.stopLive()` de la demo — revísalo).
5. Login: lista de staff puede quedarse como constante en el propio
   código (no hace falta pedirla al Web App) salvo que Pau prefiera
   gestionarla también desde la hoja — pregunta si no está claro.

## Fuera de alcance — no construir

- Cualquier cosa relacionada con Firebase/Firestore (D13).
- Pantalla de Sesiones o Admin dentro de la app (D14/D15).
- Import Excel/CSV o alta manual de asistentes desde la app (D20) — eso
  sigue siendo el Excel/scripts de Pau, fuera de este repo.
- `../alfil-statics/` (la web) — proyecto totalmente aparte, no lo toques.

## Cuándo preguntar en vez de asumir

- Si el número de acreditación lleva ceros a la izquierda o no en la
  edición XXII (afecta a cómo comparar `num` — ver nota en
  `docs/SHEET_SCHEMA.md`).
- Qué contiene la pestaña `tabla` de la hoja y si la pantalla
  Estadísticas debe usarla.
- La URL real del Web App desplegado, si no la tienes.
- Cualquier pantalla o comportamiento que no esté en `docs/FLOWS.md` — no
  la inventes.
