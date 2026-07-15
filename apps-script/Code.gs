/**
 * Web App de la hoja "MIEMBROS CURSO PROTOCOLO XXI/XXII".
 *
 * Base: el script real que Pau ya usaba con el Atajo de iPhone en la
 * edición pasada (comentarios "NO-PIN vFinal" = su versión probada).
 * NO se ha reescrito desde cero — se ha extendido con 4 cosas, marcadas
 * con "// AÑADIDO" para que se distinga claramente de lo original:
 *
 *   1. LockService alrededor de la comprobación de duplicado + el
 *      appendRow. La versión de Atajos no lo necesitaba (un solo usuario,
 *      nunca dos peticiones a la vez); con ~20 personas escaneando en
 *      paralelo desde la PWA, dos escaneos casi simultáneos del mismo
 *      número sí pueden colarse los dos sin lock.
 *   2. Parámetro opcional `staff` -> columna D nueva en `asistencias`
 *      (quién escaneó). Aditivo: si no se manda, se deja vacío.
 *   3. `action=stats` -> nueva acción para la pantalla Estadísticas.
 *   4. `format=json` -> si la petición lo incluye, responde JSON en vez
 *      de HTML. Si no se manda (como en el Atajo original), el
 *      comportamiento es exactamente el de antes.
 *
 * Ver docs/SHEET_SCHEMA.md para el detalle de cada pestaña.
 *
 * INSTALACIÓN: Extensiones > Apps Script desde la propia hoja de cálculo
 * (script container-bound, no hace falta vincularlo a ningún Form aparte
 * para esta parte). Implementar > Nueva implementación > Aplicación web >
 * ejecutar como "Yo", acceso "Cualquier usuario". La URL resultante
 * (.../exec) es la que usa la PWA.
 */

/***** ========================= CONFIG ========================= *****/
const SHEET_ASISTENTES = 'asistentes'; // Nombre de la hoja con la lista numerada
const SHEET_ASISTENCIAS = 'asistencias'; // Hoja donde se registran los escaneos reales
const SHEET_CONFIG = 'Config';
const COL_NUMERO = 1; // Columna A = número de acreditación
const CELL_CURRENT_SESSION = 'B2'; // Sesión activa

/***** ========================== ENDPOINT ========================== *****/
// Ejemplo URL (compatible con el Atajo original):
//   https://script.google.com/macros/s/ID_DEL_SCRIPT/exec?num=0034
// Ejemplo URL (PWA, con las 4 extensiones):
//   .../exec?num=0034&staff=pau&format=json
//   .../exec?action=stats&format=json
function doGet(e) {
  const format = e?.parameter?.format === 'json' ? 'json' : 'html'; // AÑADIDO
  const action = e?.parameter?.action || 'checkin'; // AÑADIDO — 'checkin' es el comportamiento original por defecto

  if (action === 'stats') { // AÑADIDO
    return _stats(format);
  }

  return _checkin(e, format);
}

/***** ========================== CHECK-IN (original + LockService) ========================== *****/
function _checkin(e, format) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const num = e?.parameter?.num ? String(e.parameter.num).trim() : '';
  if (!num) return _respond('invalid', 'Falta ?num', format);

  // Leer sesión activa desde Config
  const cfg = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) return _respond('error', 'Falta hoja "Config"', format);
  const session = cfg.getRange(CELL_CURRENT_SESSION).getDisplayValue().trim();
  if (!session) return _respond('sin_sesion', 'Config!B2 vacío — no hay sesión activa', format);

  // Comprobar que el número existe en asistentes
  const shAsistentes = ss.getSheetByName(SHEET_ASISTENTES);
  if (!shAsistentes) return _respond('error', 'Falta hoja "asistentes"', format);
  const nums = shAsistentes
    .getRange(2, COL_NUMERO, Math.max(shAsistentes.getLastRow() - 1, 0), 1)
    .getValues()
    .flat()
    .map((v) => String(v).trim());

  if (!nums.includes(num)) {
    return _respond('no_encontrado', `Número ${num} no está en "asistentes"`, format);
  }

  const shLog = ss.getSheetByName(SHEET_ASISTENCIAS);
  if (!shLog) return _respond('error', 'Falta hoja "asistencias"', format);

  const staff = e?.parameter?.staff ? String(e.parameter.staff).trim() : ''; // AÑADIDO

  // AÑADIDO: LockService — serializa comprobación de duplicado + escritura
  // para que dos escaneos casi simultáneos del mismo número no se cuelen
  // los dos a la vez (posible con varios móviles a la vez, no lo era con
  // el Atajo de una sola persona).
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // hasta 10s esperando su turno
  } catch (err) {
    return _respond('error', 'Ocupado, inténtalo de nuevo en unos segundos', format);
  }

  try {
    const last = shLog.getLastRow();
    if (last >= 2) {
      const pares = shLog.getRange(2, 1, last - 1, 2).getValues();
      const ya = pares.some((r) => String(r[0]).trim() === num && String(r[1]).trim() === session);
      if (ya) {
        return _respond('duplicado', `Ya estaba registrado · Nº ${num} → ${session}`, format, { num, session });
      }
    }

    const ts = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd HH:mm:ss');
    shLog.appendRow([num, session, ts, staff]); // columna D (staff) añadida al final, no rompe filas antiguas sin ese dato

    return _respond('ok', `Registrado Nº ${num} → ${session} (${ts})`, format, { num, session, ts, staff });
  } finally {
    lock.releaseLock();
  }
}

/***** ========================== STATS (nuevo) ========================== *****/
function _stats(format) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName(SHEET_CONFIG);
  const session = cfg ? cfg.getRange(CELL_CURRENT_SESSION).getDisplayValue().trim() : '';

  const shAsistentes = ss.getSheetByName(SHEET_ASISTENTES);
  const total = shAsistentes ? Math.max(shAsistentes.getLastRow() - 1, 0) : 0;

  let registrados = 0;
  const shLog = ss.getSheetByName(SHEET_ASISTENCIAS);
  if (shLog && session) {
    const last = shLog.getLastRow();
    if (last >= 2) {
      const filas = shLog.getRange(2, 1, last - 1, 2).getValues();
      registrados = filas.filter((r) => String(r[1]).trim() === session).length;
    }
  }

  const tasa = total > 0 ? Math.round((registrados / total) * 1000) / 10 : 0;
  const data = { session, total, registrados, tasa };

  if (format === 'json') {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  return _html(`${session || 'Sin sesión activa'}: ${registrados} de ${total} (${tasa}%)`);
}

/***** ========================== RESPUESTA (HTML original o JSON nuevo) ========================== *****/
function _respond(status, mensaje, format, extra) {
  if (format === 'json') {
    const payload = Object.assign({ status, mensaje }, extra || {});
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  }
  // Comportamiento original (idéntico al script de Atajos, con el sufijo
  // "NO-PIN vFinal" que ya tenía Pau, para no romper nada si se reutiliza).
  return _html(`${mensaje} (NO-PIN vFinal)`);
}

/***** ========================== HTML HELP (original) ========================== *****/
function _html(msg) {
  return HtmlService.createHtmlOutput(
    `<html><body style="font-family:system-ui;padding:12px;font-size:16px"><b>${msg}</b></body></html>`
  );
}
