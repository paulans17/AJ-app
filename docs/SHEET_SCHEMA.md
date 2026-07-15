> ⚠️ Reescrito 2026-07-15, cuarta vuelta (D21): Pau pidió usar el script
> **tal cual**, sin ninguna extensión. Las versiones anteriores de este
> documento (que añadían LockService, columna `staff`, acción `stats` y
> respuesta JSON) quedan descartadas. Lo que sigue describe únicamente lo
> que el script real ya hace.

# Modelo de datos — Google Sheet (script original, sin tocar)

Sustituye a `docs/FIRESTORE_SCHEMA.md` (superseded). Hoja real:
["MIEMBROS CURSO PROTOCOLO XXI"](https://docs.google.com/spreadsheets/d/1YDADLLWwA92Gm-_WYPYY4qGxTt5Wx-RIjM7Ju8z9FHE/edit?usp=sharing),
pestañas `asistentes`, `Config`, `asistencias`, `tabla`. Se usa **esta
misma hoja, tal cual, para las pruebas** — no una copia ni una hoja nueva
para la XXII (decisión de Pau, 2026-07-15).

## Pestañas

### `asistentes`
Fila 1 = cabecera (`NÚMERO`, `NOMBRE`). Desde la fila 2: una fila por
persona acreditada.

| Columna | Contenido |
|---|---|
| A — NÚMERO | El número que lleva impreso/en el QR de la acreditación. En la hoja real aparece como número simple (`1`, `2`... `99`), sin ceros a la izquierda visibles en la celda — el script compara como string tal cual viene, así que el número que se escanee/teclee tiene que coincidir exactamente con lo que hay en la celda. |
| B — NOMBRE | `Apellidos, Nombre` |

### `Config`
- **`B2`** = sesión activa en este momento (texto libre). Se edita a mano
  en la propia hoja — no hay pantalla en la app para esto.

### `asistencias`
Fila 1 = cabecera. Desde la fila 2: una fila por cada escaneo válido.

| Columna | Contenido |
|---|---|
| A | Número (igual que `asistentes!A`) |
| B | Sesión (el valor que había en `Config!B2` en el momento del escaneo) |
| C | Timestamp (`yyyy-MM-dd HH:mm:ss`, zona `Europe/Madrid`) |

Sin columna de quién escaneó — el script original no la tiene, no se
añade (D21).

### `tabla`
Existe en la hoja real, contenido sin confirmar todavía.

## El endpoint — exactamente como está, sin extensiones

`apps-script/Code.gs` es el script real de Pau, sin modificar. Un único
`doGet(e)`:

- **Parámetro:** `num` (el número escaneado/tecleado).
- **Lógica:** lee `Config!B2` (sesión activa) → si no hay, responde
  "Config!B2 vacío" → busca `num` en `asistentes!A` → si no está,
  responde "no está en asistentes" → busca en `asistencias` si ya hay una
  fila con ese `num` + esa sesión → si ya existe, responde "Ya estaba
  registrado" → si no, añade una fila nueva a `asistencias` y responde
  "Registrado".
- **Respuesta:** siempre HTML de una línea (pensado para que un Atajo de
  iOS lo lea como notificación), nunca JSON. Todos los mensajes acaban en
  `(NO-PIN vFinal)`.

La PWA tiene que llamar a esta URL con `fetch(...+"?num="+codigo)` y
**interpretar el texto de la respuesta** para decidir qué pantalla de
resultado mostrar (verde/naranja/rojo) — por ejemplo, mirar si el HTML
contiene "Registrado" (sin más) vs "Ya estaba registrado" vs "no está en
asistentes". No hay un campo `status` estructurado; hay que parsear texto.
Es así a propósito (D21) — si en algún momento se necesita algo más
robusto, se decide explícitamente, no se añade por iniciativa propia.

## Estadísticas — resuelto (D22)

Pau eligió la opción 3: una función de lectura nueva, en un **proyecto de
Apps Script separado** (`apps-script/stats-readonly/Code.gs`) — nunca
dentro de `Code.gs`. Un Web App de Apps Script solo expone un `doGet` por
proyecto, así que "archivo separado" es, en la práctica, un proyecto
standalone aparte: se crea en script.google.com como proyecto nuevo (no
vinculado a la hoja), abre la hoja por ID con
`SpreadsheetApp.openById(...)`, y se despliega con su propia URL,
distinta de la de check-in. Es de solo lectura — no escribe nada en
ninguna pestaña.

Devuelve JSON: `{"session": "...", "total": N, "registrados": N, "tasa": N}`.
`total` = filas de `asistentes` (menos la cabecera). `registrados` =
filas de `asistencias` cuya columna B coincide con la sesión activa
(`Config!B2`). La PWA hace *polling* a esta URL cada 5-10s mientras la
pantalla Estadísticas está abierta.

## Qué NO se hace (revertido en D21)

- Nada de `LockService`.
- Nada de columna `staff` en `asistencias`.
- Nada de acción `stats` dentro de `Code.gs`.
- Nada de respuestas JSON — se queda en HTML de texto plano.
