> ⚠️ Reescrito 2026-07-15, cuarta vuelta (D21): Pau pidió usar el script
> **tal cual**, sin ninguna extensión. Las versiones anteriores de este
> documento (que añadían LockService, columna `staff`, acción `stats` y
> respuesta JSON) quedan descartadas. Lo que sigue describe únicamente lo
> que el script real ya hace.

# Modelo de datos — Google Sheet (script original, sin tocar)

Sustituye al esquema de Firestore original, descartado en el pivote D13
(ver histórico en `docs/DECISIONS.md`). Hoja real:
["MIEMBROS CURSO PROTOCOLO XXI"](https://docs.google.com/spreadsheets/d/1YDADLLWwA92Gm-_WYPYY4qGxTt5Wx-RIjM7Ju8z9FHE/edit?usp=sharing),
pestañas `asistentes`, `Config`, `asistencias`, `tabla`, `Horarios` (D31/D36).
Se usa **esta
misma hoja, tal cual, para las pruebas** — no una copia ni una hoja nueva
para la XXII (decisión de Pau, 2026-07-15).

## Pestañas

### `asistentes`
Fila 1 = cabecera (`NÚMERO`, `NOMBRE`). Desde la fila 2: una fila por
persona acreditada.

| Columna | Contenido |
|---|---|
| A — NÚMERO | El número que lleva impreso/en el QR de la acreditación. **Confirmado en la hoja real (2026-09-15): sin ceros a la izquierda** (`1`, `2`, `3`... `120`...) — el script compara como string tal cual viene, así que el número que se escanee/teclee tiene que coincidir exactamente con lo que hay en la celda. |
| B — NOMBRE | `Apellidos, Nombre` |

### `Config`
- **`B2`** = sesión activa en este momento (texto libre). Se edita a mano
  en la propia hoja — no hay pantalla en la app para esto. Al cambiarla
  salta un aviso push al equipo (D33).
- **`A3`/`B3`** = `AVISAR_HORARIOS` + casilla de verificación (D33). Al
  marcarla, el script avisador manda el aviso "Horarios actualizados" y
  la desmarca sola.

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
**Confirmado (2026-09-15):** es un pivote/resumen — una fila por asistente
(NÚMERO, NOMBRE) y una columna por sesión (agrupadas por evento: "VIBRAS"
→ Inicio/Descanso, "EIP" → Inicio...), con una casilla ✅ si esa persona
asistió a esa sesión concreta. Es un informe de lectura para Pau/staff,
probablemente con fórmulas que leen de `asistencias` — **la app no lo
usa ni lo necesita**: Estadísticas ya calcula el recuento en vivo de la
sesión activa directamente desde `asistencias` + `asistentes` (ver
"Estadísticas — resuelto" más abajo), que es toda la información que
hace falta para esa pantalla.

### `Horarios` (D31/D36)
Fila 1 = cabecera. Desde la fila 2: **una fila por cosa que pasa**. Se edita
a mano en la propia hoja — no hay pantalla en la app para esto, igual
que `Config!B2`. (Hasta D32 eran Día/Hora/Actividad/Notas/Responsable;
D36 lo cambió al formato de abajo — la hoja vieja ya no se lee bien.)

| Columna | Contenido |
|---|---|
| A — Día | Texto libre ("Lunes", "Martes 2"). Cada valor distinto es un día; salen en el orden en que aparecen por primera vez, aunque sus filas no estén seguidas. Los botones de día de la app enseñan sus 3 primeras letras. Una fila con solo el día crea ese día vacío. |
| B — Hora | Una sola hora, formato Hora (09:30). Vacía solo en la fila "Coche del día". La app ordena por esta columna. |
| C — Tipo | Desplegable recomendado: `Llegada Alfil` (naranja), `Recogida` (amarillo, también llegadas de ponentes y trenes), `Alumnos` (gris), `Ponencia` (azul), `Sorteo` (violeta), `Comida` (verde). Un tipo distinto se muestra igual, sin color. Sin tildes ni mayúsculas importa poco. |
| D — Actividad | Texto libre |
| E — Personas | Nombres separados por `+`, coma o " y " (`Berta + Maialen`). De aquí salen solos los botones "Soy…" de la app. Vacía = es para todos. "Álvaro" y "Alvaro" cuentan como la misma persona. |
| F — Sorteo | El premio, solo en filas con sorteo. Sale como etiqueta. |
| G — Notas | Texto libre (tren, a quién anunciar, lugar) |

**Fila "Coche del día":** Tipo = `Coche del día` y Personas (o Actividad) =
quién lleva el coche ese día. No es un evento: se muestra como aviso
arriba del día (a todos, o solo a quien aparece en él si se ha elegido un
nombre).

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

**Horarios (D31/D36):** el mismo `doGet` de este proyecto, llamado con
`?tipo=horarios`, devuelve en cambio
`{"dias": [{"dia": "...", "coche": "...", "eventos": [{"hora": "...", "tipo": "...", "actividad": "...", "personas": ["..."], "sorteo": "...", "notas": "..."}]}]}`,
leyendo la pestaña `Horarios` de arriba. Sin ese parámetro, el
comportamiento de Estadísticas no cambia. No hace polling — se pide una
vez al abrir la pantalla.

## Qué NO se hace (revertido en D21)

- Nada de `LockService`.
- Nada de columna `staff` en `asistencias`.
- Nada de acción `stats` dentro de `Code.gs`.
- Nada de respuestas JSON — se queda en HTML de texto plano.
