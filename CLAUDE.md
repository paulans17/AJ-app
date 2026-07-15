# Instrucciones para Claude Code — Staff AJapp (PWA)

Este archivo es lo primero que debes leer al abrir este repo. Léelo entero
antes de escribir código.

## Qué es esto

Staff AJapp es la herramienta interna de Alfil Juvenil (asociación
universitaria) para el check-in de asistencia durante su Curso de
Protocolo: escaneo de QR / registro manual, estado de sesiones en vivo, y
un panel de administración para Informática/Presidencia.

Tu tarea es **construir la app real**, funcionando contra Firebase de
verdad, partiendo de lo que ya existe en este repo (ver más abajo). No es
un proyecto en blanco.

## Orden de lectura obligatorio

1. `docs/DECISIONS.md` — decisiones tomadas y por qué (D1-D12). Es la
   fuente de verdad. Si algo en el código actual contradice una decisión
   escrita aquí, manda la decisión.
2. `docs/ARCHITECTURE.md` — cómo encajan las piezas: stack, modelo de
   autenticación de dos niveles, estrategia offline, estructura del repo.
3. `docs/FIRESTORE_SCHEMA.md` — colecciones, campos, quién puede escribir
   cada una, reglas de negocio (ECTS/faltas).
4. `docs/FLOWS.md` — diagramas Mermaid de todos los flujos.
5. `docs/PROJECT_SETUP.md` — checklist de infraestructura. Algunos pasos
   los hace Pau fuera de Claude Code (crear el proyecto Firebase, Auth,
   etc.) — pregúntale por el estado antes de asumir que ya existen.

## Fuente de diseño: el proyecto Xcode, no un Figma

**No hay un archivo de Figma nuevo.** La referencia de diseño real es la
app iOS nativa antigua, en `../Staff AJapp/Staff AJapp/` (mismo nivel que
este repo, carpeta hermana):

- `Components/Theme.swift` — paleta exacta: fondo `#0B0B0B`, tarjetas
  `#1A1A1A`, dorado de marca `#C6A75E`, texto blanco/gris, estados
  verde/naranja/rojo.
- `MainTabView.swift` — estructura de pestañas: Sesiones · Escanear
  (por defecto) · Dashboard (+ Admin, solo Informática/Presidencia).
- `Views/Scan/`, `Views/Sessions/`, `Views/Dashboard/` — layout y
  componentes de cada pantalla (círculo de escaneo con doble anillo,
  registro manual como hoja inferior, resultado a pantalla completa que se
  cierra solo a los 1,5s, etc.).
- `Managers/` — la lógica de negocio ya pensada (duplicados, cálculo de
  asistencia) que sirvió de base para `docs/FIRESTORE_SCHEMA.md`.

Ese código Swift es obsoleto como cliente (no se va a compilar ni desplegar
como app iOS), pero es el documento de diseño de referencia.

## Qué ya existe en este repo — no lo tires

`index.html`, `css/app.css`, `js/{demo-data,store,scanner,views,app}.js`,
`sw.js`, `manifest.webmanifest`, `icons/` son una **demo funcional ya
construida** (2026-07-07) que ya porta ese diseño de Xcode a web 1:1, con
datos ficticios en `localStorage`. Tiene: login, escáner QR
(`BarcodeDetector` nativo + fallback `jsQR`), sesiones, dashboard con
riesgo de pérdida de título (ECTS, ver `docs/FIRESTORE_SCHEMA.md`), cola
offline simulada, y un panel admin con alta manual, import Excel/CSV
(SheetJS), informes CSV y gestión de staff/sesiones.

**Tu trabajo no es rehacer la interfaz desde cero.** Es:

1. Auditar `js/views.js`, `js/app.js`, `css/app.css` contra el Xcode real
   y corregir cualquier cosa que se haya quedado a medias o que no
   coincida (colores, spacing, comportamiento de las pantallas).
2. **Reescribir `js/store.js`** para hablar con Firebase real en vez de
   `localStorage`: Firestore (SDK web) + Anonymous Auth para el staff
   general, manteniendo exactamente la misma interfaz pública que ya
   consumen `views.js`/`app.js` (mismos nombres de función, misma forma de
   los datos que devuelven — están listados al final de `js/store.js`
   actual).
3. Usar la **persistencia offline nativa de Firestore**
   (`persistentLocalCache`) en vez de la cola manual simulada de la demo —
   ver `docs/ARCHITECTURE.md`, sección "Estrategia offline". El toggle
   "Simular sin cobertura" de la demo puede quedarse como ayuda de
   desarrollo/pruebas, pero el comportamiento real de fondo debe ser el
   del SDK, no un array en `localStorage`.
4. Implementar el **login real de modo Admin** (`docs/DECISIONS.md` D12,
   diagrama en `docs/FLOWS.md` §3): al entrar a la pestaña Admin, si el
   usuario tiene `departamento` informática/presidencia y la sesión activa
   es anónima, pedir email+contraseña y hacer `signInWithEmailAndPassword`
   antes de mostrar el panel. Para el resto del staff, no cambia nada del
   login actual.
5. Escribir `scripts/set-claim.js` (Node + `firebase-admin`) para asignar
   el custom claim `departamento` a una cuenta, como se describe en
   `docs/ARCHITECTURE.md`.
6. Dejar `firebase/firebase.json` listo para `firebase deploy --only
   firestore:rules,hosting` (sin Cloud Functions — `docs/DECISIONS.md` D3).

## Fuera de alcance — no tocar

- `../alfil-statics/` — la web pública + panel `/admin` (PHP). Proyecto
  independiente, aunque comparta el proyecto Firebase (D2). Ni lo edites
  ni asumas nada de su código.
- `../Staff AJappBd/` — backend del proyecto Firebase de pruebas antiguo
  (`prueba-protocolo2627`), descartado. Solo consúltalo como referencia
  histórica si algo en `docs/` no está claro.
- `../Staff AJapp/` — código Swift, no se toca ni se compila. Solo se lee
  como referencia de diseño (ver arriba).
- Cloud Functions / plan Blaze — decisión explícita de no usarlos (D3). Si
  crees que hace falta una, para y pregúntale a Pau en vez de activarlo.

## Cuándo preguntar en vez de asumir

- El proyecto Firebase real (API key, project ID) — probablemente no
  existe todavía cuando empieces. Pregunta a Pau el estado de
  `docs/PROJECT_SETUP.md` antes de hardcodear nada; mientras tanto, deja
  la app funcionando en "modo demo" (con `js/demo-data.js`) detrás de un
  flag de configuración, para poder seguir trabajando en paralelo.
- El roster real de ~20 miembros de staff — sigue sin llegar, sigue en
  `docs/DECISIONS.md` como pendiente.
- Cualquier pantalla o comportamiento que no esté ni en el Xcode ni en
  `docs/FLOWS.md` — no la inventes, pregunta primero.
