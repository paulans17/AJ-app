# Arquitectura — Staff AJapp (PWA)

> ⚠️ Este documento fue reescrito el 2026-07-15 por la tarde tras el
> pivote D13-D18 (ver `DECISIONS.md`): se abandonó Firestore en favor de
> Google Sheets + Apps Script. Si ves referencias a Firebase/Firestore en
> otro sitio del repo (`docs/FIRESTORE_SCHEMA.md`, `firebase/`), están
> marcadas como superseded — la versión vigente es esta.

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
│  Google Sheet "MIEMBROS CURSO PROTOCOLO XXII" │
│  ┌────────────┐ ┌────────┐ ┌─────────────┐   │
│  │ asistentes │ │ Config │ │ asistencias │   │
│  └────────────┘ └────────┘ └─────────────┘   │
│  ┌───────┐                                    │
│  │ tabla │  (informe, contenido por confirmar) │
│  └───────┘                                    │
│                                               │
│  Apps Script (container-bound, Code.gs) — Web App │
│  GET .../exec?action=checkin&num=...&staff=... │
│  GET .../exec?action=stats                    │
│  GET .../exec?action=staff                    │
│  GET .../exec?action=confirm&id=...           │
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

## Ya construido (demo, 07/07) — qué se reutiliza y qué no

La demo original (`index.html`, `css/app.css`,
`js/{demo-data,store,scanner,views,app}.js`, `sw.js`,
`manifest.webmanifest`, `icons/`) sigue siendo la base, pero con **menos
alcance** que antes de este pivote:

- **Se reutiliza tal cual:** `js/scanner.js` (escaneo QR), el service
  worker, el manifest, los iconos, y buena parte de `css/app.css`.
- **Se reescribe:** `js/store.js` — en vez de hablar con Firestore (que ya
  no existe en este proyecto), hace `fetch()` al Web App de Apps Script.
  La cola offline que ya tenía (`getQueue`/`setQueue`/`syncQueue`) se
  queda casi igual, pero ahora "sincronizar" significa disparar la
  llamada HTTP real, no escribir en un array local (D18).
- **Se recorta:** `js/views.js`/`app.js` pierden las pestañas Sesiones y
  Admin (D14/D15) — se quedan Escanear y Estadísticas, más el login. Todo
  lo que hacían esas dos pestañas (activar sesión, alta de staff, import
  Excel, informes) se mueve a la propia hoja de cálculo y a menús de
  Apps Script.

## Stack

- **Frontend:** el mismo HTML/CSS/JS vanilla de la demo, recortado.
- **Escaneo QR:** `BarcodeDetector` nativo con fallback `jsQR` — sin
  cambios, ya funciona.
- **Backend:** Google Apps Script, container-bound a la hoja de cálculo,
  publicado como Web App (`Ejecutar como: yo`, `Acceso: cualquier
  usuario`). Un único endpoint con varias `action` (ver
  `docs/SHEET_SCHEMA.md`).
- **Almacén de datos:** Google Sheets. Sin base de datos NoSQL/SQL
  externa, sin proyecto Firebase.
- **Hosting de la PWA:** puede ser cualquier cosa que sirva archivos
  estáticos por HTTPS — GitHub Pages, Firebase Hosting (el proyecto
  `alfiljuvenil-protocolo` ya existe y sigue siendo válido solo para
  esto, servir el HTML/CSS/JS, aunque ya no aloje Firestore/Auth para
  esta app), o cualquier hosting estático. A decidir cuando llegue el
  momento, no bloquea el desarrollo.

## Por qué peticiones GET simples (y no POST con JSON)

Igual que el Atajo de iPhone del año pasado hacía "Get contents of
[URL]?num=...", el Web App de Apps Script se llama con `fetch()` en modo
GET y todos los parámetros en la query string, sin cabeceras
personalizadas (`Content-Type`, `Authorization`, etc.). Motivo técnico:
una petición GET "simple" no dispara *CORS preflight* en el navegador,
que es donde suelen fallar las integraciones de Apps Script Web Apps
llamadas desde JS de cliente. Si en algún momento hace falta mandar datos
más complejos (por ejemplo, en el import de un CSV grande), tocará
investigar el caso aparte — para `checkin`/`stats`/`staff`/`confirm`, GET
con query string es suficiente y ya está probado (es literalmente lo que
hacía el Atajo).

## Estrategia offline (D18)

No hay persistencia offline nativa como la de Firestore — hay que
mantenerla a mano, reutilizando lo que la demo ya tenía:

- Al escanear, si `navigator.onLine` es `false` (o la llamada `fetch`
  falla), el check-in se guarda en una cola en `localStorage` en vez de
  intentarse contra el Web App.
- Al recuperar conexión (`window.addEventListener('online', ...)`), se
  recorre la cola y se dispara `?action=checkin` por cada elemento
  pendiente, en orden.
- Duplicados: el chequeo de "ya registrado" se hace primero contra la
  cola local (por si la misma persona se escaneó dos veces sin red desde
  el mismo móvil) y luego, al sincronizar, el propio Web App vuelve a
  comprobar contra `Checkins` con `LockService` antes de escribir — así
  que un duplicado entre **dos móviles distintos** sin red se resuelve al
  sincronizar (el segundo en llegar recibe `duplicado`), no antes.
- La interfaz debe indicar cuántos check-ins están pendientes de
  sincronizar (ya existe ese indicador en la demo — `queue-badge`).

## Seguridad (D17)

Sin Firebase Auth, sin Firestore Rules. El Web App de Apps Script es
público por URL — el control de acceso es "quién tiene la URL", igual que
antes con el Atajo. Es un riesgo aceptado y consciente para una
herramienta interna de bajo riesgo (peor caso: alguien sin autorización
registra check-ins falsos, no hay DNIs ni datos sensibles expuestos por
ese endpoint en concreto — `Inscripciones` con los DNIs no se sirve nunca
completa, solo se valida un ID puntual). Si más adelante hiciera falta más
control, se puede añadir un parámetro secreto compartido a las llamadas;
no es prioridad ahora.

## Estructura del repo

```
staff-ajapp-pwa/
├── CLAUDE.md                   (instrucciones para Claude Code — LEER PRIMERO)
├── README.md
├── index.html                  (demo — se recorta la navegación)
├── manifest.webmanifest
├── sw.js
├── css/app.css
├── js/
│   ├── demo-data.js             (se queda para modo demo/dev sin Sheet real)
│   ├── store.js                 (REESCRIBIR: fetch al Web App en vez de Firestore/localStorage)
│   ├── scanner.js                (sin cambios)
│   ├── views.js                  (RECORTAR: solo Login + Escanear + Estadísticas)
│   └── app.js                    (RECORTAR: quitar rutas Sesiones/Admin)
├── icons/
├── docs/
│   ├── DECISIONS.md              (histórico completo, incl. el pivote D13-D18)
│   ├── ARCHITECTURE.md            (este archivo, vigente)
│   ├── SHEET_SCHEMA.md            (vigente — sustituye a FIRESTORE_SCHEMA.md)
│   ├── FIRESTORE_SCHEMA.md        (⚠️ superseded, solo histórico)
│   ├── FLOWS.md                   (vigente, reescrito para Sheets)
│   └── PROJECT_SETUP.md           (⚠️ mayormente superseded — ver aviso al inicio)
├── firebase/                      (⚠️ superseded, solo histórico — no se despliega)
└── apps-script/
    ├── Code.gs                    (YA EXTENDIDO — script real de Pau + LockService/stats/staff/JSON)
    └── appsscript.json
```
