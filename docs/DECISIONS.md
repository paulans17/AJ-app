# Decisiones — Staff AJapp (PWA)

Registro de decisiones tomadas para el rediseño de Staff AJapp. Cada entrada
tiene fecha, la decisión y el motivo. Es la fuente de verdad: si algo aquí
cambia, se actualiza esta lista (no se borra el historial, se añade una nueva
entrada que sustituye a la anterior y se referencia).

Decisiones heredadas de sesiones previas (contexto, no se repiten aquí en
detalle): la app pasa de iOS nativa a PWA (2026-07-07); backend Firestore;
login de staff solo-usuario sin contraseña; departamentos y mapeo de roles
del CMS web. Ver `Staff AJappBd/FIRESTORE_SCHEMA.md` (carpeta antigua) para
el histórico completo previo a este repo.

## 2026-07-15

**D1. Proyecto Firebase nuevo, en la cuenta de Gmail de Alfil Juvenil (no la
personal de Pau).**
Motivo: `prueba-protocolo2627` está a nombre personal de Pau; para la BD real
del curso conviene que el proyecto sea propiedad de la asociación, no de una
persona. Este será el proyecto **definitivo**: se usa también para pruebas
mientras se desarrolla, y se limpia (ver D7) antes de que empiece el curso
real. `prueba-protocolo2627` queda como sandbox descartable, ya no se toca.

**D2. El proyecto Firebase se comparte con la web (`alfil-statics`).**
La web tenía pendiente esta decisión desde su migración a PHP+Firebase
(07/07). Se comparte un único proyecto: la web usa colecciones con prefijo
`web_` (usuarios, patrocinadores, blog, config) y el evento usa las suyas sin
prefijo (`staff`, `sesiones`, `inscripciones`, `checkins`, `config`). Motivo:
evita mantener dos proyectos, y permite reutilizar las mismas cuentas reales
de Informática/Presidencia para autenticar acciones privilegiadas tanto en
el panel `/admin` de la web como en el modo admin de la PWA (ver D4).

**D3. Sin plan Blaze — nada de Cloud Functions desplegadas.**
Igual que se decidió en `prueba-protocolo2627` el 03/07: no se da de alta
facturación en el proyecto nuevo. Esto obliga a resolver de otra forma las
operaciones que antes se habían diseñado como Cloud Functions
(`registrarInscripcion`, `confirmarInscripcion`, `cambiarEstadoSesion`) — ver
D4 y D5. Motivo de Pau: no quiere asociar una tarjeta a la cuenta de la
asociación aunque el gasto real esperado sea 0€.

**D4. Modelo de autenticación de dos niveles (resuelve un vacío del diseño
anterior).**
El diseño de 03/07 asumía que `cambiarEstadoSesion` sería una Cloud Function
que comprobaba un custom claim `departamento == "informatica"` en el token
de quien llama — pero el login de la app es anónimo y sin contraseña para
todo el mundo, así que ningún usuario de la app tenía ese claim. Sin Cloud
Functions esta contradicción hay que resolverla en el cliente:

- **Staff general (~20 personas):** Firebase Anonymous Auth + elegir su
  nombre de una lista (como estaba decidido). Sirve para poder escanear y
  registrar check-ins. No es una identidad verificada — es atribución, no
  seguridad (como ya se apuntó en la sesión del 03/07).
- **Informática (modo admin dentro de la PWA):** al entrar a la ruta
  `/admin` de la propia PWA, se pide iniciar sesión con email/contraseña
  (cuenta real de Firebase Auth, la misma que ya usan en el panel `/admin`
  de la web gracias a D2). Esto sustituye la sesión anónima por una con
  custom claim `departamento`, y **Firestore Security Rules comprueban ese
  claim directamente** para permitir escritura en `sesiones`, `staff` y
  `config` — sin pasar por ninguna Cloud Function. Al salir del modo admin
  o cerrar la app, se vuelve a entrar de forma anónima.

Esto es gratis (las rules no cuestan, solo el deploy de Functions requiere
Blaze) y cierra el agujero de seguridad del diseño anterior.

**D5. Inscripción sigue por Google Form → Apps Script → Firestore.**
Se mantiene el mismo puente que ya funciona en `prueba-protocolo2627`
(`apps-script/Code.gs`, autenticado con el token OAuth de la cuenta de
Google propietaria del proyecto — ahora la cuenta de Alfil, no la de Pau).
Motivo: ya está resuelto y probado, y no requiere Blaze. Se traslada al
proyecto nuevo cambiando `PROJECT_ID` en el script.

**D6. Repositorio único (monorepo) para PWA + backend Firebase.**
Un solo repo `staff-ajapp-pwa/` con el frontend (PWA) y la configuración de
Firebase (`firestore.rules`, Apps Script, scripts de administración) juntos.
Motivo (decisión tomada por Claude ante la duda de Pau): son la misma pieza
funcional, se despliegan y versionan a la vez, y con un solo desarrollador +
Claude Code trabajando es más simple tener un único historial de commits y
un único sitio donde Claude Code tenga todo el contexto. Si más adelante
hace falta separar (por ejemplo, si entra alguien más solo al frontend), se
puede partir el repo con `git subtree split` sin perder historial.

**D7. Reset antes del curso real.**
Se trabaja con datos reales de prueba en el proyecto definitivo durante el
desarrollo. Antes de que arranque el Curso de Protocolo XXII se vacían
`inscripciones` y `checkins`, y se resetea `contadorId` en `config/general`
a 0. `staff`, `sesiones` y `config` (excepto el contador) se dejan con los
datos reales definitivos. Checklist completo en `PROJECT_SETUP.md`.

**D8. Se mantienen `gradoActividades` y `alergias` en Firestore este año.**
El año pasado estaban en el Google Form pero no se copiaban a la hoja
procesada (quedaban solo en las respuestas crudas del Form). Se guardan
ahora en `inscripciones` porque no cuesta nada guardarlas y `alergias` es
relevante para el catering. Si Pau prefiere lo contrario, se quita del
esquema en un minuto.

**D9. Diseño: se usa el prototipo Figma Make existente
(`dQjrZnwka2UzPESvIG5Gl3`, "prototipo app y admin") como base de pantallas**,
con la corrección ya conocida de que el escaneo es por cámara/QR (no NFC,
que era una idea descartada — ver memoria previa). Si aparece un Figma más
definitivo, estos flujos y `FLOWS.md` se actualizan contra él.

## 2026-07-15 (continuación — tras revisar el código ya existente)

**D10. Ya existe una demo funcional en este mismo repo** (`index.html`,
`js/`, `css/`, `sw.js`, `manifest.webmanifest`, construida el 07/07, antes de
que existiera esta carpeta `docs/`). Es una PWA completa con datos ficticios
en `localStorage`: login, escaneo QR (BarcodeDetector nativo + fallback
jsQR), sesiones, dashboard con riesgo de pérdida de título (ver D11), modo
offline simulado, y un panel admin con alta manual, import Excel/CSV
(SheetJS), informes CSV y gestión de staff/sesiones. Su propio README ya
documentaba la intención de que **solo `js/store.js` cambie** al pasar a
Firestore real — el resto de capas (vistas, escáner, app shell) se quedan
igual. Este descubrimiento no invalida nada de lo decidido arriba, pero
corrige dos cosas:

- El esquema de datos de `docs/FIRESTORE_SCHEMA.md` ya estaba implementado
  en `js/demo-data.js`/`js/store.js` con dos campos que no estaban en la
  versión anterior del esquema: `config.porcentajeMinimo` y
  `sesiones.fecha`. Añadidos ahora.
- `Store.isInformatica()` en el código ya trata **Informática y
  Presidencia** igual (ambas ven la pestaña Admin), no solo Informática.
  `firestore.rules` y el resto de docs se han corregido para reflejar esto.

**D11. Regla de negocio del título (ECTS) — ya implementada en la demo, se
formaliza aquí:** el curso exige asistir al menos al 80% de las 14 medias
ponencias (`config.porcentajeMinimo`) para obtener el título. Con 14
sesiones, el máximo de faltas permitido es 2 (`Math.floor(14 * 0.2)`); con 2
faltas ya cerradas se marca "en riesgo" (una más y se pierde), con 3+ se
marca "crítico" (título ya perdido). El dashboard de Informática/Presidencia
muestra esta lista para poder avisar a la gente a tiempo.

**D12. Modo admin: login real con email/contraseña (confirmado por Pau,
15/07), sustituyendo el gate solo-de-interfaz que tiene la demo actual.**
La demo (D10) oculta la pestaña Admin a nivel de interfaz según el
`departamento` del usuario elegido en el login, sin ninguna verificación
real — funciona para una demo, pero no es suficiente para proteger
escrituras reales en `sesiones`/`staff`/`config` sin Cloud Functions. Se
mantiene el diseño ya descrito en D4: el staff general sigue con el mismo
login único sin contraseña; al entrar a Admin, Informática/Presidencia
inicia sesión una vez con su cuenta real (la misma del panel `/admin` de la
web). Esto añade un paso de login solo para esas ~4-5 personas, nunca para
el resto del staff.

## 2026-07-15 (pivote — por la tarde, tras ver el flujo funcionando en Xcode/demo)

**⚠️ D13-D18 sustituyen D1-D5, D9 y D12 en todo lo relativo al backend del
evento.** No se borran las decisiones anteriores (quedan como historial de
por qué se llegó hasta aquí), pero a partir de aquí son la referencia
correcta `docs/SHEET_SCHEMA.md` (sustituye a `FIRESTORE_SCHEMA.md`) y las
secciones reescritas de `ARCHITECTURE.md`/`FLOWS.md`/`CLAUDE.md`.

**Motivo del cambio:** Pau enseñó el flujo real que usó en la edición
pasada — un Atajo de iPhone: escanear QR → llamar a una URL de Apps
Script con el número → la hoja de cálculo registra la asistencia. Le
funcionó, es simple, y no le convencía la complejidad que estábamos
montando (Firestore, Auth de dos niveles, custom claims, Cloud
Functions-que-no-son-Cloud-Functions). Decisión: replicar ese mismo patrón
dentro de una PWA (para que lo pueda usar todo el equipo, no solo el
móvil de Pau con el Atajo), en vez de construir un backend nuevo.

**D13. Backend del evento: Google Sheets + Apps Script, no Firestore.**
Una única hoja de cálculo con pestañas `Inscripciones`, `Sesiones`,
`Checkins`, `Staff`, `Config`, y un Web App de Apps Script (container-bound
a la hoja) con varias acciones por parámetro (`checkin`, `stats`, `staff`,
`confirm`). Detalle completo en `docs/SHEET_SCHEMA.md`. El proyecto
Firebase `alfiljuvenil-protocolo` montado esta misma mañana (D1) ya no lo
usa Staff AJapp — queda libre por si `alfil-statics` (la web) lo quiere
para sí, decisión aparte y futura de Pau.

**D14. La app de staff se reduce a 2 pantallas: Escanear y Estadísticas.**
(Más la pantalla de login sin contraseña, que no cuenta como una de las
"2 pantallas" — es un paso previo de una vez, no una sección de
navegación.) Se acabaron las pestañas Sesiones y Admin dentro de la app.

**D15. Sesión activa, staff e inscripciones se gestionan a mano en la
hoja.** No hay pantalla en la app para activar/cerrar una sesión, dar de
alta a alguien del equipo, ni para el alta manual/import Excel de
asistentes — la hoja de cálculo **es** el panel de administración, con
funciones de Apps Script como menús propios donde haga falta automatizar
algo (ej. "Generar informe de asistencia").

**D16. El bug histórico de IDs duplicados (edición XXI) se corrige con
`LockService` de Apps Script**, no con transacciones de Firestore (que ya
no existen). Ver `docs/SHEET_SCHEMA.md`.

**D17. Seguridad simplificada — sin Firebase Auth.** Sin Firestore no hay
reglas que proteger con custom claims; se cae todo el diseño de D4/D12
(login real de modo Admin). El Web App de Apps Script es público por URL;
el control de acceso es "quién tiene la URL guardada en su móvil", igual
que el Atajo de iPhone del año pasado. Aceptable para una herramienta
interna de bajo riesgo — si en algún momento hiciera falta más
seguridad, se puede añadir un parámetro secreto compartido a las
llamadas, pero no es la prioridad ahora.

**D18. Offline: se reutiliza casi tal cual la cola local que ya tenía la
demo** (`getQueue`/`setQueue`/`syncQueue` en `js/store.js`), cambiando qué
significa "sincronizar": en vez de escribir en un array local, cada
elemento de la cola dispara la llamada `?action=checkin` real contra el
Web App cuando vuelve la conexión. No hay persistencia offline nativa de
Firestore que aproveche esto gratis (D3/D4 ya no aplican), así que esta
cola manual pasa de ser "simulación de demo" a ser la pieza real de
producción.

## 2026-07-15 (pivote — tercera vuelta, con el script y la hoja reales)

Pau pasó el script de Apps Script que ya usaba de verdad el año pasado
(`NO-PIN vFinal`, con el Atajo de iPhone) y el link a la hoja real
("MIEMBROS CURSO PROTOCOLO XXI", pestañas `asistentes`/`Config`/
`asistencias`/`tabla`). Esto no era un diseño desde cero — era un sistema
que ya funcionaba. Se ajustan D13-D18 con esta base real:

**D19. `docs/SHEET_SCHEMA.md` y `apps-script/Code.gs` parten del script y
la hoja reales, no de un diseño nuevo.** La única pestaña relevante para
el check-in es `asistentes` (número + nombre, sin DNI/email/menú) —
mucho más simple que la `inscripciones` que se había diseñado por la
mañana para Firestore. Las extensiones sobre el script real son mínimas y
están marcadas como `// AÑADIDO` en el código: `LockService` (necesario
ahora que hay varios móviles a la vez, no un único Atajo), columna
`staff` opcional en `asistencias`, acción `stats` nueva, y respuesta JSON
opcional vía `&format=json` que no rompe el uso del Atajo original.

**D20. La inscripción/roster queda fuera de alcance de este repo.**
Construir la lista `asistentes` (con los números y nombres) sigue siendo
un proceso de Pau con el Excel/scripts de años anteriores, independiente
de Staff AJapp. Esto reemplaza la idea de un puente Google Form → Apps
Script → Firestore/Sheet que se había planteado por la mañana (D5) — ya
no forma parte de lo que construye Claude Code, salvo que se decida lo
contrario más adelante.

**Pendiente de verificar con Pau (no bloqueante, anotado en
`SHEET_SCHEMA.md`):** si los números de `asistentes!A` llevan ceros a la
izquierda o no en la edición XXII, y qué contiene exactamente la pestaña
`tabla` (¿la usa la pantalla Estadísticas o es un informe aparte?).

## 2026-07-15 (cuarta vuelta — Pau rechaza las extensiones de D19)

**D21. Se revierte `apps-script/Code.gs` al script original exacto, sin
ninguna de las 4 extensiones de D19.** Pau fue explícito: "vamos a usar
tal cual esto... lo que haya hecho Claude, quitando las pantallas, no
vale". Se descartan: `LockService`, columna `staff` en `asistencias`,
acción `stats`, y respuesta `format=json`. El archivo vuelve a ser
exactamente el script que Pau ya tenía funcionando (`NO-PIN vFinal`), sin
tocar una línea de la lógica.

**Motivo (interpretado, no verificado con Pau palabra por palabra):**
prioriza usar exactamente lo que ya está probado y funcionando sobre
cualquier mejora no pedida, aunque sea de bajo riesgo. Aplica también
hacia delante: no añadir nada a este script sin que Pau lo pida
explícitamente.

**Lo que sí se mantiene de todo el trabajo anterior:** las pantallas
(UI) que ya se hayan construido en la PWA (Escanear, Estadísticas) — lo
que no vale es lo que se haya hecho *por debajo* sin ceñirse a este
script exacto. Hay que conectar esas pantallas a este endpoint tal cual
es, con `?num=X`.

**Abre una pregunta sin resolver:** el script original no tiene ninguna
acción para leer estadísticas (no había pantalla de Estadísticas en el
Atajo de iPhone). Sin tocar `Code.gs`, no hay forma de que la pantalla
Estadísticas obtenga datos reales. Pendiente de que Pau diga cómo lo
quiere resolver — ver `docs/SHEET_SCHEMA.md`.

## 2026-07-15 (quinta vuelta — Estadísticas resuelto)

**D22. Pau elige la opción 3 para Estadísticas: función de lectura en un
proyecto de Apps Script separado, no dentro de `Code.gs`.** Detalle
técnico importante: un Web App de Apps Script solo puede exponer un
`doGet` por proyecto (no hay rutas tipo Express), así que "archivo
separado" en la práctica es un **proyecto de Apps Script standalone
aparte** (`apps-script/stats-readonly/`), con su propio `doGet`, su
propio deploy y su propia URL `.../exec` — completamente independiente
del de check-in. Abre la misma hoja por `SpreadsheetApp.openById(...)` en
vez de estar vinculado a ella, y **solo lee**, nunca escribe. Cero
cambios sobre `apps-script/Code.gs`.

La PWA acaba llamando a **dos URLs distintas**: una para `?num=X`
(check-in, `apps-script/Code.gs`) y otra para las estadísticas
(`apps-script/stats-readonly/Code.gs`, sin parámetros, siempre GET).

## 2026-07-15 (sexta vuelta — desplegado y conectado)

**D23. Las 2 URLs de Apps Script se despliegan y `js/store.js` se conecta
a ellas.** Pau despliega `apps-script/Code.gs` sobre la hoja real (Web
App, "Yo" / "Cualquier usuario") y `apps-script/stats-readonly/Code.gs`
como proyecto standalone aparte — URLs guardadas en `docs/DEPLOY_URLS.md`
(fuente de verdad). Claude Code hace el trabajo en una rama
(`claude/busy-sinoussi-065fb3`): reescribe `js/store.js` (fetch real a
las 2 URLs, parseo del HTML de check-in per D21, `stats()` async por
polling), recorta `js/views.js`/`js/app.js`/`index.html`/`css/app.css` a
Login+Escanear+Estadísticas (sin Sesiones/Admin/demo-banner/SheetJS), y
añade un server estático de desarrollo (`.claude/static-server.js` +
`launch.json`, puerto 8420) para probar sin hosting.

Esa misma rama arrastraba también cambios sobre `firebase/firestore.rules`
y un `scripts/set-claim.js` nuevo — restos de una versión anterior de la
rama, de antes de que D13 (abandono de Firebase) terminara de aplicarse
ahí. **No se traen a `master`**: Firebase sigue fuera de alcance para
este repo, y esos archivos ya estaban marcados superseded. Solo se
fusionan a `master` los 8 archivos relevantes (`js/store.js`,
`js/views.js`, `js/app.js`, `index.html`, `css/app.css`, `sw.js`,
`.claude/launch.json`, `.claude/static-server.js`) — commit `525e223`.

`apps-script/Code.gs` se verifica sin ninguna diferencia respecto al
commit anterior — sigue exactamente igual que en D21.

**Nota dejada en el propio código:** la lista `STAFF` de `js/store.js` es
un placeholder de 10 nombres de ejemplo (`TODO(Pau)`) — hace falta el
roster real de ~20 personas antes de usarlo en el curso de verdad.

## 2026-07-15 (séptima vuelta — probado en el móvil real, dos bugs encontrados)

Repo subido a GitHub (`https://github.com/paulans17/AJ-app`) y publicado
con GitHub Pages (`https://paulans17.github.io/AJ-app/`) — instalado en
el iPhone de Pau con "Añadir a pantalla de inicio". Al probarlo de
verdad aparecen dos fallos que ni `curl` ni el servidor local habían
revelado:

**D24. El check-in fallaba siempre con "sin cobertura" aunque hubiera
red — causa: CORS, no conexión.** `apps-script/Code.gs` usa
`HtmlService.createHtmlOutput()`, cuyas respuestas no llevan la cabecera
`Access-Control-Allow-Origin` — comprobado comparando cabeceras: la URL
de Estadísticas (`ContentService`) sí la lleva, la de check-in no. Un
navegador real bloquea leer esa respuesta entre dominios (`fetch()` desde
`paulans17.github.io` hacia `script.google.com`), aunque el registro sí
llega a escribirse en `asistencias` — por eso `curl` nunca lo detectó
(CORS es una restricción exclusiva del navegador). La PWA lo interpretaba
como fallo de red y lo mandaba a la cola offline.

**Se rompe la regla de D21 con permiso explícito de Pau**: se cambia
`_html()` en `apps-script/Code.gs` de `HtmlService.createHtmlOutput()` a
`ContentService.createTextOutput().setMimeType(HTML)` — mismo texto de
salida, misma lógica de negocio (nada más de `doGet()` cambia), solo
cambia cómo lo sirve Google por dentro. `ContentService` ya manda la
cabecera CORS (lo prueba que Estadísticas funciona). No debería notarse
ninguna diferencia desde el Atajo de iPhone. **Pendiente**: Pau tiene que
copiar el `Code.gs` actualizado al editor de Apps Script real (vinculado
a la hoja) y redesplegar — el cambio en el repo no toca el script en
producción por sí solo.

**D25. La cámara no detectaba ningún QR en Safari/iOS.** Causa probable:
soporte experimental/incompleto de `BarcodeDetector` en versiones
recientes de Safari — el código asumía "si existe, funciona" y nunca
caía a `jsQR` cuando el nativo estaba presente pero no detectaba nada.
Arreglado en `js/scanner.js` (no toca Apps Script): cada frame prueba
`BarcodeDetector` primero y, si no encuentra nada, prueba `jsQR` también
en el mismo frame, en vez de ser mutuamente excluyentes.

## Pendiente de decidir (no bloqueante para empezar)

- Nombre definitivo del proyecto Firebase nuevo (propuesta en
  `PROJECT_SETUP.md`, a confirmar por Pau) — nota: ya no bloquea Staff
  AJapp (D13), solo relevante si `alfil-statics` lo reutiliza.
- Roster real de ~20 miembros de staff (nombres) para sustituir el
  placeholder de `js/store.js` (D23).
- Confirmar en el móvil que D24 (CORS) y D25 (cámara) quedan resueltos
  tras redesplegar `Code.gs` y publicar el nuevo `js/scanner.js`.
