# Instrucciones para Claude Code — Staff AJapp (PWA)

> Reescrito 2026-07-15 tras la limpieza post-pivote. La app ya está
> construida y funcionando contra las dos URLs reales de Apps Script — esto
> ya no es una guía de construcción, es el estado actual. Si vuelves a ver
> referencias a Firebase/Firestore/Cloud Functions/custom claims, o a
> `LockService`/columna `staff`/acción `stats`/respuesta JSON en
> `apps-script/Code.gs`: son historial descartado (D13-D21), ignóralas.

Léelo entero antes de escribir código.

## Qué es esto

Staff AJapp es la evolución de un Atajo de iPhone que Pau ya usaba en la
edición pasada del Curso de Protocolo: escanear el QR de una acreditación,
llamar a una URL de Apps Script con el número, la hoja de cálculo registra
la asistencia. Ahora es una PWA para que lo use todo el equipo (~20
personas) a la vez desde sus móviles, no solo un Atajo personal.

**La app tiene 2 pantallas** (más el login inicial, que no cuenta como
pantalla de navegación): **Escanear** y **Estadísticas**. Nada más — no
hay pantalla de Sesiones ni de Admin. Activar la sesión en curso se hace
editando una celda directamente en la hoja de cálculo, fuera de la app.

## Orden de lectura obligatorio

1. `docs/DECISIONS.md` — decisiones, en orden cronológico. Las últimas
   (D13 en adelante) son las que valen; las anteriores se dejan como
   historial de cómo se llegó hasta aquí, no las repliques.
2. `docs/ARCHITECTURE.md` — stack, diagrama, estrategia offline, seguridad.
3. `docs/SHEET_SCHEMA.md` — la estructura real de la hoja de cálculo
   (pestañas `asistentes`, `Config`, `asistencias`) y el único endpoint
   real del Web App (`?num=X`, sin más parámetros).
4. `docs/FLOWS.md` — diagramas de cada flujo.
5. `docs/DEPLOY_URLS.md` — las dos URLs reales ya desplegadas.
6. `docs/PROJECT_SETUP.md` — checklist de infraestructura, lo poco que
   queda pendiente.

## Lo que NO se toca sin permiso explícito

- `apps-script/Code.gs` — **el código más importante del repo.** Es el
  script real que Pau ya usaba y ya funcionaba (comentarios "NO-PIN
  vFinal"), **exactamente tal cual, sin ninguna extensión** (D21 — se
  intentó añadir LockService/staff/stats/JSON y Pau lo rechazó
  explícitamente: "lo que hayas hecho, quitando las pantallas, no vale").
  No se te ocurra "mejorarlo" por iniciativa propia, ni aunque veas un
  caso límite sin cubrir (está anotado en `docs/ARCHITECTURE.md` y es un
  riesgo aceptado, no un olvido). Si de verdad hace falta tocarlo, para y
  pregunta primero.
- `apps-script/stats-readonly/` — igual de intocable salvo petición
  explícita; es el proyecto de solo lectura para Estadísticas (D22).

## Estado actual del código (ya construido)

- `js/store.js` — capa de datos. `checkin(codigo)` hace `fetch` a
  `.../exec?num=` + código contra `apps-script/Code.gs` y parsea el HTML
  de respuesta (el script real no devuelve JSON — busca "Ya estaba
  registrado", "no está en", "Config!B2 vacío", o "Registrado" limpio).
  `stats()` hace `fetch` a la URL del Web App de solo lectura (JSON
  directo). Cola offline en `localStorage` (`getQueue`/`syncQueue`):
  solo se quita un check-in de la cola si el servidor confirma `ok` o
  `duplicado`, nunca en silencio. Login: lista fija `STAFF` en el propio
  archivo (roster real pendiente de que Pau lo pase — ver
  `docs/PROJECT_SETUP.md`).
- `js/views.js` / `js/app.js` — Login, Escanear, Estadísticas. Overlay de
  carga bloqueante mientras se resuelve un check-in (`#loading-cover`).
  Pantalla de resultado verde/naranja/roja, autocierre a los 2s.
- `js/scanner.js` — `BarcodeDetector` nativo con fallback a `jsQR`
  (vendorizado en `js/vendor/`, no CDN — la URL de cdnjs para esa versión
  da 404).
- `css/app.css` — solo las reglas que usan las 3 pantallas reales; sin
  restos de Sesiones/Admin/modal/hero (limpiado 15/07).
- Diseño visual de referencia: `../Staff AJapp/Staff AJapp/` (proyecto
  Xcode/SwiftUI) — paleta en `Components/Theme.swift`
  (`#0B0B0B` / `#1A1A1A` / `#C6A75E`).

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
- Cualquier pantalla o comportamiento que no esté en `docs/FLOWS.md` — no
  la inventes.
