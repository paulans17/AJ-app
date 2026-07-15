# Modelo de datos Firestore — Curso de Protocolo XXII

Proyecto Firebase nuevo, propiedad de la cuenta de Alfil Juvenil (ver
`DECISIONS.md` D1), compartido con la web (D2). Este documento cubre solo
las colecciones del evento — las de la web (`web_*`) se documentan en
`alfil-statics/DOCS-ADMIN.md`.

Sustituye al esquema previo de `Staff AJappBd/FIRESTORE_SCHEMA.md`
(proyecto `prueba-protocolo2627`, ahora sandbox descartable). Las
diferencias frente a ese esquema están marcadas con **(cambio)**.

Este esquema ya está implementado (con datos ficticios en `localStorage`)
en `js/demo-data.js` y `js/store.js`, en la raíz de este repo — ver D10 en
`DECISIONS.md`. Al pasar a Firestore real, la estructura de documentos no
cambia; solo cambia dónde viven.

## Colecciones

### `staff`
Un documento por cada uno de los ~20 miembros. ID de documento = username
elegido en el login.

| Campo | Tipo | Notas |
|---|---|---|
| nombreCompleto | string | |
| departamento | string | `presidencia` \| `informatica` \| `cuentas` \| `comunicacion` \| `redaccion` \| `diseno` |
| activo | bool | para dar de baja a alguien sin borrar su historial de check-ins |
| cuentaAdmin | string \| null | **(nuevo)** email de la cuenta real (Auth) si esta persona tiene modo admin — solo relevante para `departamento == "informatica"` o `"presidencia"` |

Escritura: solo Informática/Presidencia (`isStaffAdmin()` en las rules —
ver D4/D12). Se gestiona desde el modo admin de la PWA o desde el panel
`/admin` de la web, a decidir cuál en Claude Code; no hace falta duplicar
la UI en los dos sitios.

### `sesiones`
Un documento por cada una de las 14 sesiones (5 días). ID de documento =
`D{dia}_S{n}` (ej. `D1_S1`).

| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | ej. "Apertura e Inauguración" |
| dia | number | 1-5 |
| fecha | string | **(añadido)** fecha ISO del día, ej. "2026-11-09" — ya está en `js/demo-data.js` |
| hora | string | "09:00" |
| capacidad | number | por defecto = `maxPlazas` de `config/general` |
| estado | string | `planificada` \| `activa` \| `cerrada` |
| asistentesRegistrados | number | contador denormalizado, se incrementa en cada check-in |

Escritura de `estado`/`capacidad`: solo Informática/Presidencia, desde el
modo admin de la PWA.

### `inscripciones`
Un documento por asistente inscrito. ID de documento = `AJ2026-XXXX` (4
cifras, contador correlativo).

| Campo | Tipo | Notas |
|---|---|---|
| nombre | string | |
| apellidos | string | |
| apellidoOrden | string | apellidos en minúsculas y sin acentos, para poder ordenar/paginar |
| fechaNacimiento | timestamp | |
| gradoActividades | string | **(D8: se mantiene este año)** |
| menuCena | string | plato elegido en texto libre; ausencia de valor = "solo curso" |
| dni | string | dato sensible — ver seguridad |
| email | string | |
| alergias | string | **(D8: se mantiene este año)** |
| modalidad | string | `curso_cena` (90€) \| `solo_curso` (65€) |
| precio | number | 90 o 65 |
| estado | string | `pendiente` \| `confirmado` |
| tsInscripcion | timestamp | |
| tsConfirmacion | timestamp \| null | |
| qrCode | string | = ID del documento, es lo que lleva el QR impreso en la acreditación |

Escritura: nunca desde el cliente (app ni web). Solo desde el puente Apps
Script (D5), autenticado con el token OAuth de la cuenta de Alfil Juvenil.

### `checkins`
Colección plana, un documento por cada escaneo válido.

| Campo | Tipo | Notas |
|---|---|---|
| sesionId | string (ref) | |
| asistenteId | string (ref) | |
| staffUsername | string (ref) | quién ha hecho el check-in (dato de atribución, no de auth — ver D4) |
| metodo | string | `qr` \| `manual` |
| timestamp | timestamp | |
| pendienteSync | bool | **(nuevo, solo cliente)** no se guarda en el documento final; se deriva de `snapshot.metadata.hasPendingWrites` en el SDK, se menciona aquí porque afecta al dashboard (ver ARCHITECTURE.md, estrategia offline) |

Antes de crear un check-in, la app consulta si ya existe `(sesionId,
asistenteId)`. Si el dispositivo está offline esa comprobación solo usa la
caché local — ver limitación conocida en `ARCHITECTURE.md`.

Inmutable: nadie edita ni borra un check-in ya creado (ni siquiera
Informática). Un check-in erróneo se corrige creando un registro de
corrección aparte (a definir formato exacto en Claude Code si hace falta:
p. ej. `metodo: "correccion"` con referencia al check-in que anula).

### `config/general`
Documento único con los ajustes globales.

| Campo | Tipo | Notas |
|---|---|---|
| edicion | string | "XXII" |
| prefijoId | string | "AJ2026-" |
| contadorId | number | último número de inscripción usado |
| maxPlazas | number | 130 (confirmado 2026-07-03, variable hasta ese máximo) |
| porcentajeMinimo | number | **(añadido)** 0.8 — % mínimo de asistencia para el título (ECTS), ver más abajo |
| timezone | string | "Europe/Madrid" |

Escritura: solo Informática/Presidencia (para ajustar `maxPlazas` en vivo si
hace falta); `contadorId` lo incrementa el puente Apps Script vía field
transform atómico (`increment`), no un cliente.

## Regla de negocio: título perdido por faltas (D11)

Para obtener el título del curso hay que asistir al menos al
`porcentajeMinimo` (80%) de las 14 sesiones. Con 14 sesiones, el máximo de
faltas permitido es `Math.floor(14 * (1 - 0.8))` = 2. Se calcula por
asistente, solo sobre sesiones ya `cerrada` (no cuenta lo que aún no ha
pasado):

- **0-1 faltas:** OK.
- **2 faltas (== máximo):** en riesgo — una falta más y pierde el título.
- **3+ faltas:** crítico — título ya perdido.

Ya implementado en `js/store.js` (`maxFaltas`, `estadoAsistencia`,
`asistentesEnRiesgo`) contra los datos de demo — la versión Firestore debe
calcular esto mismo a partir de `checkins` + `sesiones` reales. Es una
lectura derivada, no un campo que se guarde en Firestore.

## Inscripción: Google Form → Firestore (D5)

Sin cambios de fondo respecto al diseño anterior, solo cambia el
`PROJECT_ID` en `apps-script/Code.gs` al proyecto nuevo. Flujo completo en
`FLOWS.md`.

## Seguridad

Ver `firebase/firestore.rules` — reescritas para el modelo de dos niveles
de D4 (sin depender de Cloud Functions). Resumen:

- Cualquier cliente autenticado (anónimo o real) puede leer `staff`,
  `sesiones`, `inscripciones`, `config`.
- Cualquier cliente autenticado puede **crear** `checkins` (con los campos
  obligatorios); nunca editar ni borrar.
- Solo clientes con `request.auth.token.departamento` en
  `["informatica", "presidencia"]` (cuenta real, no anónima — ver D12)
  pueden escribir en `staff`, `sesiones`, `config`.
- `inscripciones` nunca se escribe desde un cliente — ver arriba.

## Resueltos desde la última revisión (03/07 → 15/07)

- ~~¿Mantenemos `gradoActividades` y `alergias`?~~ → Sí (D8).
- ~~¿El formulario sigue siendo Google Form?~~ → Sí (D5).
- ~~¿Cómo se protege `cambiarEstadoSesion` sin Cloud Functions?~~ → Rules +
  custom claims (D4).
- ~~¿Informática y Presidencia tienen el mismo nivel de admin?~~ → Sí,
  ambas (D10, ya así en el código de la demo).
- ~~¿El modo admin usa el mismo login sin contraseña que el resto?~~ → No,
  login real aparte solo para esas ~4-5 personas (D12).

## Pendiente

- Roster real de staff (nombres, username, departamento) para poblar
  `staff` — sigue pendiente desde 03/07.
- Confirmar si `staff`/`sesiones` se editan desde el modo admin de la PWA,
  desde el panel `/admin` de la web, o desde ambos.
