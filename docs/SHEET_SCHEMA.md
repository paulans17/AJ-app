> ⚠️ Reescrito 2026-07-15 (tarde), segunda vuelta: Pau pasó el script real
> que usó el año pasado (`NO-PIN vFinal`) y el link a la hoja real
> ("MIEMBROS CURSO PROTOCOLO XXI"). Este documento ya no es un diseño
> especulativo — describe la estructura real existente más las extensiones
> mínimas necesarias para que la use un equipo entero desde una PWA en vez
> de un único Atajo de iPhone.

# Modelo de datos — Google Sheet (real, no un diseño desde cero)

Sustituye a `docs/FIRESTORE_SCHEMA.md` (superseded). La hoja real de la
edición XXI tenía 4 pestañas: `asistentes`, `Config`, `asistencias`,
`tabla`. Para la XXII se reutiliza la misma estructura.

## Pestañas ya existentes (edición XXI, confirmadas)

### `asistentes`
Fila 1 = cabecera (`NÚMERO`, `NOMBRE`). Desde la fila 2: una fila por
persona acreditada.

| Columna | Contenido |
|---|---|
| A — NÚMERO | El número que lleva impreso/en el QR de la acreditación. En la hoja de la XXI aparece como número simple (`1`, `2`... `99`), **no** con ceros a la izquierda — aunque el comentario del script de ejemplo usaba `num=0034`. Antes de dar por buena la convención de esta edición, comprobar con qué formato exacto se van a imprimir los QR/acreditaciones de la XXII, y normalizar en el script (quitar ceros a la izquierda a ambos lados antes de comparar) para que dé igual cómo venga. |
| B — NOMBRE | `Apellidos, Nombre` (texto libre, ya así en la hoja real) |

Esta pestaña **es el roster de asistentes** — no tiene DNI, email, menú ni
modalidad. Esos datos (si hacen falta para catering/facturación) viven en
otra hoja de inscripción aparte, no en esta — Staff AJapp no los toca, solo
necesita saber "¿existe este número?" y "¿cómo se llama?".

### `Config`
- **`B2`** = sesión activa en este momento (texto libre, ej. "Protocolo
  empresarial" o el identificador que se use). **Se edita a mano** durante
  el evento — no hay pantalla en la app para cambiarlo (D15). Todo lo que
  se escanea se registra contra el valor que haya en esta celda en ese
  momento.
- Puede tener más celdas de configuración si hace falta (ej. capacidad
  total, aforo) — a día de hoy el script solo lee `B2`.

### `asistencias`
Fila 1 = cabecera. Desde la fila 2: una fila por cada escaneo válido
(nunca duplicados de la misma persona en la misma sesión).

| Columna | Contenido (ya existente) |
|---|---|
| A | Número (mismo valor que `asistentes!A`) |
| B | Sesión (mismo valor que estaba en `Config!B2` en el momento del escaneo) |
| C | Timestamp (`yyyy-MM-dd HH:mm:ss`, zona `Europe/Madrid`) |
| D — **nuevo, propuesto** | `staff` — quién escaneó. La versión de Atajos no lo tenía (tenía sentido, solo la usaba una persona); con varios móviles a la vez sí aporta saber quién registró cada entrada. Es aditivo: si no se manda, se deja en blanco, no rompe nada de lo que ya funciona. |

### `tabla`
Existe en la hoja real pero no se ha revisado su contenido en esta sesión
(el fetch no pudo renderizarla). Probablemente un resumen/pivote de
asistencia por persona y sesión, en la línea del informe ECTS que se
mencionaba en `DECISIONS.md`. Pendiente: que Pau confirme qué hay ahí y si
la pantalla Estadísticas debe leer de esta pestaña o si basta con calcular
el recuento en vivo desde `asistencias` (ver más abajo, es lo que asume
este documento por ahora).

## Web App de Apps Script — extendiendo el script real, no sustituyéndolo

El punto de partida es el script que Pau ya usaba (`NO-PIN vFinal`,
guardado ahora en `apps-script/Code.gs`). La extensión mínima para que
sirva a una PWA con varias personas escaneando a la vez:

1. **`LockService`** alrededor de la comprobación de duplicado + el
   `appendRow` — la versión de Atajos no lo necesitaba (un único usuario,
   nunca dos peticiones a la vez); con ~20 personas escaneando en
   paralelo desde la PWA, dos escaneos casi simultáneos del mismo número
   sí pueden colarse los dos sin lock. Es la única adición que se
   considera obligatoria, no opcional.
2. **Parámetro `staff`** opcional en la llamada, para rellenar la columna
   D nueva de `asistencias`.
3. **`action=stats`** — nueva acción (no tocaba nada de esto el script
   original) para la pantalla Estadísticas: lee `Config!B2` (sesión
   activa), cuenta filas de `asistentes` (total) y de `asistencias` con
   `B == sesión activa` (registrados), calcula `%`. Se llama por *polling*
   (cada 5-10s) mientras esa pantalla está abierta — Sheets no empuja
   cambios en vivo.
4. **Respuesta:** el script original devuelve HTML plano (pensado para
   que un Atajo de iOS lo lea como notificación). La PWA necesita poder
   distinguir programáticamente entre "registrado", "ya estaba
   registrado" y "número no encontrado" para pintar colores/iconos
   distintos, no solo mostrar un texto. Propuesta: añadir un parámetro
   `format=json` que la PWA siempre mande — si está presente, se responde
   JSON (`{status, mensaje}`); si no está (o sea, si alguien sigue usando
   el Atajo de iPhone tal cual), se responde exactamente igual que hasta
   ahora (HTML). Cambio aditivo, no rompe el Atajo existente si alguna vez
   se quiere usar de nuevo como respaldo.

Ver `apps-script/Code.gs` para el código real ya extendido con estos 4
puntos, comentado para que quede claro qué es del script original y qué
se ha añadido.

## Qué NO se replica del diseño Firestore de por la mañana

- Nada de `AJ2026-XXXX` como formato de ID — el número real es el que ya
  usa la hoja (`asistentes!A`, sin prefijo).
- Nada de columnas de inscripción completas (DNI, menú, modalidad,
  alergias) dentro de este sistema — no estaban en la hoja real de
  check-in y no hacen falta para validar un escaneo.
- Nada de `Sesiones` como pestaña con estados por sesión — la sesión
  activa es un único valor en `Config!B2`, tal cual ya funcionaba.
