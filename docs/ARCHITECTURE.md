# Arquitectura — Staff AJapp (PWA)

> Actualizado 2026-07-15 tras la limpieza post-pivote: sin Firebase/Firestore
> en ningún sitio del repo (se borraron `firebase/` y
> `docs/FIRESTORE_SCHEMA.md` — el histórico de esa vía descartada queda en
> `docs/DECISIONS.md`). El script de Apps Script se usa tal cual, sin
> extensiones (nada de `LockService`, columna `staff`, acción `stats` ni
> JSON — D21).

Ver decisiones y motivos completos en `DECISIONS.md`. Este documento
describe el **cómo**, ya con las decisiones tomadas.

## Resumen

Staff AJapp es la herramienta que usa el equipo de Alfil Juvenil (~20
personas) durante el Curso de Protocolo para registrar la asistencia de
cada sesión (check-in por QR o manual). Es la evolución directa de un
Atajo de iPhone que Pau usaba en la edición pasada: escanear un QR,
llamar a una URL de Apps Script con el número, la hoja de cálculo lo
registra. Ahora ese mismo patrón vive en una PWA para que lo use todo el
equipo, no solo el móvil de una persona.

```
(El roster de asistentes — "asistentes" — se carga aparte, con el
Excel/scripts que Pau ya usa; fuera de alcance de este repo, D20)

┌─────────────────────────────────────────────┐
│  Google Sheet "MIEMBROS CURSO PROTOCOLO XXI"  │
│  ┌────────────┐ ┌────────┐ ┌─────────────┐   │
│  │ asistentes │ │ Config │ │ asistencias │   │
│  └────────────┘ └────────┘ └─────────────┘   │
│  ┌───────┐                                    │
│  │ tabla │  (informe, contenido por confirmar) │
│  └───────┘                                    │
│                                               │
│  Apps Script #1 (container-bound, Code.gs)    │
│  GET .../exec?num=...  ← check-in, tal cual (D21) │
│                                               │
│  Apps Script #2 (standalone, stats-readonly/) │
│  GET .../exec  ← solo lectura, stats (D22)    │
└──────────────────────▲────────────────────────┘
                        │ fetch (GET, sin headers custom)
                        │
┌───────────────────────┴───────────────────────┐
│   Staff AJapp (PWA) — móvil de cada staff        │
│   Login (elegir nombre) → Escanear → Estadísticas │
│   Cola local si no hay conexión, reintenta al volver │
└─────────────────────────────────────────────────┘
```

Sin Firebase, sin backend propio, sin servidor que mantener — Google Sheets
+ Apps Script como en la edición anterior, solo que ahora detrás de una
interfaz compartida por todo el equipo en vez de un Atajo personal.

## Stack

- **Frontend:** HTML/CSS/JS vanilla, sin build step ni framework. Módulos
  con IIFE (`Store`, `Scanner`, `Views`, `App`).
- **Escaneo QR:** `BarcodeDetector` nativo con fallback a `jsQR`
  (vendorizado en `js/vendor/jsQR.min.js` — la URL de cdnjs para esta
  versión devuelve 404, por eso se sirve local en vez de CDN).
- **Backend:** Google Apps Script, container-bound a la hoja de cálculo,
  publicado como Web App (`Ejecutar como: yo`, `Acceso: cualquier
  usuario`). Un único endpoint, `?num=X`, tal cual lo tenía Pau — sin
  tocar (D21, ver `docs/SHEET_SCHEMA.md`). Las estadísticas viven en un
  segundo proyecto de Apps Script separado, de solo lectura (D22).
- **Almacén de datos:** Google Sheets. Sin base de datos NoSQL/SQL
  externa, sin proyecto Firebase.
- **Hosting de la PWA:** cualquier cosa que sirva archivos estáticos por
  HTTPS — GitHub Pages, Firebase Hosting, o cualquier hosting estático. A
  decidir cuando llegue el momento, no bloquea el desarrollo (ver
  `docs/PROJECT_SETUP.md`).

## Por qué peticiones GET simples (y no POST con JSON)

Igual que el Atajo de iPhone del año pasado hacía "Get contents of
[URL]?num=...", el Web App de Apps Script se llama con `fetch()` en modo
GET y todos los parámetros en la query string, sin cabeceras
personalizadas (`Content-Type`, `Authorization`, etc.). Motivo técnico:
una petición GET "simple" no dispara *CORS preflight* en el navegador,
que es donde suelen fallar las integraciones de Apps Script Web Apps
llamadas desde JS de cliente. Para `?num=X`, GET con query string es
suficiente y ya está probado (es literalmente lo que hacía el Atajo).

La respuesta del check-in es HTML de una línea envuelto en el loader
sandboxed de Apps Script (`goog.script.init`), no JSON — `js/store.js`
desescapa y parsea ese texto (ver `parseCheckinHtml`). Las estadísticas sí
devuelven JSON limpio.

## Estrategia offline (D18)

No hay persistencia offline nativa como la de Firestore — se mantiene a
mano con una cola en `localStorage`:

- Al escanear, si `navigator.onLine` es `false` (o la llamada `fetch`
  falla), el check-in se guarda en la cola en vez de intentarse contra el
  Web App.
- Al recuperar conexión (`window.addEventListener('online', ...)`), se
  recorre la cola y se dispara `?num=X` por cada elemento pendiente, en
  orden. Solo se quita de la cola si la respuesta confirma un estado
  resuelto (`ok`/`duplicado`); cualquier otro resultado (`sin_sesion`,
  `no_encontrado`, error de hoja) se queda pendiente para no perder el
  check-in en silencio.
- Duplicados: el chequeo de "ya registrado" se hace primero contra la
  cola local (por si la misma persona se escaneó dos veces sin red desde
  el mismo móvil) y luego, al sincronizar, el propio Web App vuelve a
  comprobar contra `asistencias` antes de escribir (tal cual ya hacía el
  script) — así que un duplicado entre **dos móviles distintos** sin red
  se resuelve al sincronizar (el segundo en llegar recibe "Ya estaba
  registrado"), no antes. El script no usa `LockService` (D21, rechazado
  explícitamente), así que en el caso límite de dos sincronizaciones
  llegando exactamente a la vez hay una ventana de carrera teórica sin
  cerrar — aceptado.
- La topbar indica cuántos check-ins están pendientes de sincronizar
  (`queue-badge`).

Mientras se resuelve un check-in (online u offline) se muestra un overlay
bloqueante (`#loading-cover`) para que no se pueda tocar nada más de la
interfaz hasta que llegue la respuesta.

## Seguridad (D17)

Sin Firebase Auth, sin Firestore Rules. El Web App de Apps Script es
público por URL — el control de acceso es "quién tiene la URL", igual que
antes con el Atajo. Es un riesgo aceptado y consciente para una
herramienta interna de bajo riesgo (peor caso: alguien sin autorización
registra check-ins falsos; la pestaña `asistentes` solo tiene número y
nombre, sin DNI ni otros datos sensibles). Si más adelante hiciera falta
más control, se puede añadir algo — pero no modificando `Code.gs` sin que
Pau lo pida (D21).

El login de staff (elegir nombre de una lista fija en `js/store.js`) es
igualmente solo atribución, no autenticación real — cualquiera con el
móvil puede elegir el nombre de otra persona.

## Estructura del repo

```
staff-ajapp-pwa/
├── CLAUDE.md                   (instrucciones para Claude Code — LEER PRIMERO)
├── README.md
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/app.css
├── js/
│   ├── store.js                 (capa de datos: fetch a los 2 Web Apps + cola offline)
│   ├── scanner.js                (BarcodeDetector + fallback jsQR)
│   ├── views.js                  (Login + Escanear + Estadísticas)
│   ├── app.js                    (arranque y navegación)
│   └── vendor/jsQR.min.js        (vendorizado, ver Stack)
├── icons/
├── docs/
│   ├── DECISIONS.md              (histórico completo de decisiones, D1 en adelante)
│   ├── ARCHITECTURE.md            (este archivo, vigente)
│   ├── SHEET_SCHEMA.md            (vigente — estructura real de la hoja)
│   ├── FLOWS.md                   (vigente, diagramas de los flujos)
│   ├── DEPLOY_URLS.md             (URLs reales de los 2 Web Apps desplegados)
│   └── PROJECT_SETUP.md           (checklist de infraestructura, vigente)
└── apps-script/
    ├── Code.gs                    (script real de Pau, TAL CUAL — no tocar sin permiso, D21)
    ├── appsscript.json
    └── stats-readonly/            (proyecto standalone aparte, solo lectura, D22)
```
