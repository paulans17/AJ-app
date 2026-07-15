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

## Pendiente de decidir (no bloqueante para empezar)

- Nombre definitivo del proyecto Firebase nuevo (propuesta en
  `PROJECT_SETUP.md`, a confirmar por Pau).
- Roster real de ~20 miembros de staff (nombres + username + departamento)
  — sigue pendiente desde el 03/07.
- Dominio/hosting final de la PWA (Firebase Hosting cubre esto gratis en
  Spark; falta decidir si se usa un subdominio de alfiljuvenil.es o el
  dominio `.web.app` por defecto).
