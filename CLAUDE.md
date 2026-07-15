# Instrucciones para Claude Code — Staff AJapp (PWA)

> ⚠️ Reescrito 2026-07-15, dos veces el mismo día. Si tenías contexto de
> una versión anterior de este archivo con Firebase/Firestore/Cloud
> Functions/custom claims, **o con `LockService`/columna `staff`/acción
> `stats`/respuesta JSON en `apps-script/Code.gs`: ignóralo, está
> superseded.** Pau fue explícito (D21): el script de Apps Script se usa
> **tal cual**, sin ninguna extensión — "lo que hayas hecho, quitando las
> pantallas, no vale". Ver `docs/DECISIONS.md` D13-D21 para el porqué.

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
   (pestañas `asistentes`, `Config`, `asistencias`) y el único endpoint
   real del Web App (`?num=X`, sin más parámetros).
4. `docs/FLOWS.md` — diagramas de cada flujo.
5. `docs/PROJECT_SETUP.md` — checklist de infraestructura. Nota: la mayor
   parte de este archivo describe pasos de Firebase que **ya no hacen
   falta** — tiene un aviso al principio de qué sigue vigente.

**Ignora `docs/FIRESTORE_SCHEMA.md` y `firebase/`** — están marcados como
superseded, solo se dejan como referencia histórica de por qué se diseñó
así al principio. No leas esos archivos para entender el sistema actual.

## Ya construido — reutilizar, no rehacer

- `apps-script/Code.gs` — **el código más importante del repo, y el que
  NO se toca.** Es el script real que Pau ya usaba y ya funcionaba
  (comentarios "NO-PIN vFinal"), **exactamente tal cual, sin ninguna
  extensión** (D21 — se intentó añadir LockService/staff/stats/JSON y Pau
  lo rechazó explícitamente: "lo que hayas hecho, quitando las pantallas,
  no vale"). No se te ocurra "mejorarlo" por iniciativa propia, ni
  aunque veas un caso límite sin cubrir (está anotado en
  `docs/ARCHITECTURE.md` y es un riesgo aceptado, no un olvido). Si de
  verdad hace falta tocarlo, para y pregunta primero.
- La demo PWA (`index.html`, `css/app.css`,
  `js/{demo-data,store,scanner,views,app}.js`, `sw.js`,
  `manifest.webmanifest`, `icons/`) — reutilizable pero **hay que
  recortarla**: quita las pestañas Sesiones y Admin de `views.js`/`app.js`
  (ya no existen, D14/D15), y reescribe `js/store.js` para hacer `fetch()`
  a `.../exec?num=X` (GET, query string, sin headers custom) en vez de
  hablar con Firestore o `localStorage` puro. La respuesta es **HTML de
  una línea, no JSON** — hay que parsear el texto (mirar si contiene
  "Ya estaba registrado", "no está en", "Config!B2 vacío", o si es un
  "Registrado" limpio) para decidir qué pantalla de resultado mostrar. La
  cola offline que ya tenía la demo (`getQueue`/`setQueue`/`syncQueue`) se
  reutiliza casi tal cual, solo cambia qué hace "sincronizar" (ver
  `docs/FLOWS.md` §2).
- Diseño visual de referencia: sigue siendo `../Staff AJapp/Staff AJapp/`
  (proyecto Xcode/SwiftUI) — paleta en `Components/Theme.swift`
  (`#0B0B0B` / `#1A1A1A` / `#C6A75E`), estilo de la pantalla de escaneo en
  `Views/Scan/`. No hay Figma nuevo.

## Tareas concretas

1. Confirma con Pau la URL `.../exec` del Web App ya desplegado sobre la
   hoja real (["MIEMBROS CURSO PROTOCOLO XXI"](https://docs.google.com/spreadsheets/d/1YDADLLWwA92Gm-_WYPYY4qGxTt5Wx-RIjM7Ju8z9FHE/edit?usp=sharing),
   que se usa tal cual para las pruebas, no una copia). Sin esa URL no se
   puede probar nada real.
2. Recortar `js/views.js` y `js/app.js`: solo Login, Escanear,
   Estadísticas. Quitar todo rastro de Sesiones/Admin (tabs, rutas,
   funciones de `store.js` que ya no se usan como `setEstadoSesion`,
   `addAsistente`, `importAsistentes`, `informeAsistencia`, etc.).
3. Reescribir `js/store.js`: función `checkin(codigo)` hace `fetch` a
   `.../exec?num=` + codigo, y parsea el HTML de respuesta como se
   describe arriba. Mantener la cola offline existente, cambiando el
   destino de la sincronización.
4. Pantalla Estadísticas (D22, ya resuelto): hace `fetch` a la URL del
   Web App **separado** `apps-script/stats-readonly/Code.gs` (sin
   parámetros), no a la de check-in. Devuelve JSON
   `{session, total, registrados, tasa}` — a diferencia del check-in, este
   sí es JSON, se puede usar directo sin parsear texto. Polling cada
   5-10s mientras la pantalla está abierta, parar el intervalo al salir
   (ya había un patrón parecido en `Views.stopLive()` de la demo).
   Necesitas la URL `.../exec` de este segundo script desplegado — pide
   a Pau que lo despliegue si no está hecho, es un proyecto de Apps
   Script nuevo y aparte, no toca el de check-in.
5. Login: lista de staff puede quedarse como constante en el propio
   código — no hay ninguna fuente de esto en el script real ni en la
   hoja (`asistentes` es la lista de asistentes al curso, no del staff).

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
