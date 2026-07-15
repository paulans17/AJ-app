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

## Pregunta abierta: ¿de dónde saca datos la pantalla Estadísticas?

El script no tiene ninguna acción de lectura/estadísticas — el Atajo de
iPhone no tenía pantalla de estadísticas, solo registraba. Sin tocar
`Code.gs`, no hay forma de que la PWA sepa cuántos han registrado
asistencia en la sesión activa. Opciones, todas pendientes de que Pau
elija (ver `DECISIONS.md` D21):

1. **No tocar nada, dejar Estadísticas sin datos reales por ahora**
   (pantalla estática o deshabilitada) hasta que se decida algo.
2. **Leer la hoja directamente en modo solo-lectura**, sin pasar por
   `Code.gs` — Google Sheets permite exportar una hoja pública como JSON
   (`.../gviz/tq?tqx=out:json&sheet=asistencias`) si la hoja está
   compartida como "cualquiera con el enlace puede ver". No modifica el
   script de check-in para nada, es una vía totalmente aparte.
3. **Añadir una función de lectura nueva**, en otro archivo `.gs` dentro
   del mismo proyecto de Apps Script (no dentro de `Code.gs`), para no
   tocar el script que ya funciona.

## Qué NO se hace (revertido en D21)

- Nada de `LockService`.
- Nada de columna `staff` en `asistencias`.
- Nada de acción `stats` dentro de `Code.gs`.
- Nada de respuestas JSON — se queda en HTML de texto plano.
