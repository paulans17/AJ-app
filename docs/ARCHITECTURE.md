# Arquitectura — Staff AJapp (PWA)

Ver decisiones y motivos completos en `DECISIONS.md`. Este documento describe
el **cómo**, ya con las decisiones tomadas.

## Resumen

Staff AJapp es la herramienta que usa el equipo de Alfil Juvenil (~20
personas) durante el Curso de Protocolo para registrar la asistencia de cada
sesión (check-in por QR o manual) y, para Informática, controlar el estado
de las sesiones en vivo.

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Google Form        │  Apps  │   Firebase (proyecto      │
│   (inscripción)       │─Script─▶   Alfil Juvenil, Spark)   │
└─────────────────────┘  REST  │                            │
                                │  Firestore                │
┌─────────────────────┐        │   - staff                 │
│   Staff AJapp (PWA)   │◀──────▶   - sesiones               │
│   móvil de cada staff │  SDK   │   - inscripciones          │
│   (instalable, offline)│  web   │   - checkins               │
└─────────────────────┘        │   - config/general         │
                                │                            │
┌─────────────────────┐        │  Auth                     │
│  Web /admin (PHP)     │◀──────▶   - Anonymous (staff)      │
│  alfil-statics         │        │   - Email/password         │
└─────────────────────┘        │     (Informática/Presid.) │
                                │                            │
                                │  Hosting (la propia PWA)  │
                                └──────────────────────────┘
```

Un único proyecto Firebase (plan Spark, sin Blaze — D3) para todo: el evento
y la web (D2). Nada de Cloud Functions desplegadas.

## Ya construido (demo, 07/07 — ver `DECISIONS.md` D10)

Antes de este documento ya se construyó una PWA funcional completa con
datos ficticios en `localStorage`, en la raíz de este mismo repo:
`index.html`, `css/app.css`, `js/{demo-data,store,scanner,views,app}.js`,
`sw.js`, `manifest.webmanifest`, `icons/`. Su propio README explica que
**solo `js/store.js` cambia** para pasar a Firestore real — el resto
(vistas, escáner, navegación, app shell/PWA) se queda igual. Todo lo que
sigue en este documento describe esa base ya existente más lo que falta
para hacerla real, no un proyecto desde cero.

## Stack

- **Frontend:** HTML/CSS/JS vanilla (sin framework, sin build step) — ya
  construido así en la demo. Módulos con IIFE (`Store`, `App`, `Views`,
  `Scanner`), sin dependencias de build. Service worker + manifest ya
  soportan instalación en Android/iOS.
- **Escaneo QR:** `BarcodeDetector` nativo (Chrome/Android) con fallback a
  `jsQR` sobre `<canvas>` para Safari/iOS — ya implementado en
  `js/scanner.js`. Equivalente web del `AVFoundation`/`QRScannerManager`
  que existía en la app Swift.
- **Import Excel/CSV (respaldo de inscripción, D5):** SheetJS (`xlsx`),
  cargado por CDN — ya usado en la demo para `importAsistentes`.
- **Backend de datos:** Firestore (SDK web, cliente directo — sin capa de
  servidor propia).
- **Puente de inscripción:** Google Apps Script (`apps-script/Code.gs`),
  llama a la API REST de Firestore. Vive fuera de este repo (vinculado al
  Form en Google Drive), pero el código fuente se versiona aquí.
- **Hosting:** Firebase Hosting (gratis en Spark, sirve la PWA con HTTPS y
  el dominio `*.web.app`/`*.firebaseapp.com` por defecto).
- **Scripts de administración locales:** Node.js + `firebase-admin` (SDK de
  administración), para tareas puntuales que no encajan en Cloud Functions
  ni en las rules (asignar custom claims, cargas iniciales de datos, el
  reset pre-curso). Se ejecutan a mano desde el ordenador de Pau/Informática,
  nunca se despliegan.

## Modelo de autenticación (D4, confirmado y afinado en D12)

La demo actual (D10) oculta la pestaña Admin solo a nivel de interfaz,
según el `departamento` del nombre elegido en el login — sin verificación
real. Eso es suficiente para una demo, pero no para proteger escrituras
reales sin Cloud Functions. La versión real añade un segundo nivel, ambos
usando Firebase Auth del mismo proyecto:

| | Staff general (~20) | Informática / Presidencia (modo admin) |
|---|---|---|
| Método | Anonymous Auth | Email + contraseña (cuenta real) |
| Se identifica como | Elige su nombre de una lista (`staff` collection) — dato de UI, no de autenticación | Su cuenta real, con custom claim `departamento` |
| Puede | Leer `staff`/`sesiones`/`inscripciones`/`config`, crear `checkins` | Todo lo anterior + escribir en `sesiones`, `staff`, `config` |
| Dónde se usa | Toda la app en uso normal (escanear, ver sesiones, dashboard) | Solo al entrar a la pestaña `Admin` dentro de la propia PWA (mismo sitio donde hoy la demo solo comprueba `Store.isInformatica()`) |

Cambio concreto sobre la demo: al pulsar la pestaña `Admin`, si la sesión
activa es anónima, la PWA debe pedir email+contraseña antes de mostrar el
panel — sustituyendo la sesión anónima por la real mientras se está en
modo admin. Para el resto del staff, cero cambios de UX.

El custom claim `departamento` se asigna con un script local
(`scripts/set-claim.js`, usa `firebase-admin` con la service account key —
nunca se sube al repo, va en `.gitignore`). Se ejecuta una vez por persona
de Informática/Presidencia que necesite el claim. La misma cuenta sirve para
el panel `/admin` de la web (D2), así que si esa persona ya tiene cuenta ahí,
no hace falta crear una nueva — solo añadirle el claim.

**Por qué no hace falta Cloud Functions para esto:** Firestore Security
Rules pueden leer `request.auth.token.departamento` directamente sin ningún
servidor intermedio. El deploy de rules (`firebase deploy --only
firestore:rules`) funciona en el plan gratuito Spark — solo el deploy de
Cloud Functions exige Blaze.

## Estrategia offline (obligatoria, decidida el 07/07)

Se usa la **persistencia offline nativa del SDK de Firestore para web**
(`persistentLocalCache` / `enableIndexedDbPersistence` según versión del
SDK), no una cola hecha a mano:

- Lecturas: la app sirve datos de sesiones/asistentes desde la caché local
  aunque no haya red.
- Escrituras (`checkins`): se aplican de forma optimista en local y quedan
  en cola; el SDK las sincroniza solo cuando vuelve la conexión, sin código
  adicional.
- El único trabajo manual es de UX: mostrar un indicador de "pendiente de
  sincronizar" en los check-ins que aún no se confirmaron con el servidor
  (Firestore expone `hasPendingWrites` en cada snapshot).

**Limitación conocida y aceptada:** si dos móviles hacen check-in de la
misma persona en la misma sesión mientras ambos están sin red, ninguno de
los dos puede saber en el momento que el otro ya lo hizo — la comprobación
de duplicados (`where sesionId == X && asistenteId == Y`) solo es fiable
online. Mitigación: no se bloquea, pero el dashboard (ver `FLOWS.md`) marca
como "posible duplicado" cualquier asistente con más de un `checkin` en la
misma sesión, para revisión manual de Informática. Resolverlo de forma
100% atómica requeriría un backend con Cloud Functions/transacciones
server-side, que D3 descarta.

## Estructura del repo (real, no hipotética)

```
staff-ajapp-pwa/
├── README.md
├── index.html                 (ya existe — demo)
├── manifest.webmanifest       (ya existe — demo)
├── sw.js                      (ya existe — demo)
├── css/
│   └── app.css                 (ya existe — demo)
├── js/
│   ├── demo-data.js            (ya existe — seed ficticio, se deja para modo demo/dev)
│   ├── store.js                (ya existe — ÚNICO archivo a reescribir contra Firestore)
│   ├── scanner.js              (ya existe — no cambia)
│   ├── views.js                (ya existe — no cambia salvo login admin, D12)
│   └── app.js                  (ya existe — no cambia)
├── icons/                      (ya existe — demo)
├── docs/
│   ├── DECISIONS.md
│   ├── ARCHITECTURE.md   (este archivo)
│   ├── FIRESTORE_SCHEMA.md
│   ├── FLOWS.md
│   └── PROJECT_SETUP.md
├── firebase/
│   ├── firestore.rules
│   └── firebase.json        (a crear con `firebase init` — ver PROJECT_SETUP)
├── apps-script/
│   ├── Code.gs                (puente inscripción, se copia a Apps Script)
│   └── appsscript.json
└── scripts/
    └── set-claim.js           (a escribir en Claude Code — asignar custom claim departamento)
```

El trabajo real en Claude Code es sobre todo: (1) reescribir `js/store.js`
para hablar con Firestore (Auth anónima + SDK web) en vez de `localStorage`,
manteniendo exactamente la misma interfaz pública que ya consume
`views.js`/`app.js`; (2) añadir el login real de modo admin en `views.js`
(D12); (3) escribir `scripts/set-claim.js`.
