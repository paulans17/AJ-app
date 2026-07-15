/***** ========================= CONFIG ========================= *****/
const SHEET_ASISTENTES = 'asistentes'; // 👈 Nombre de la hoja con la lista numerada
const SHEET_ASISTENCIAS = 'asistencias'; // 👈 Hoja donde se registran los escaneos reales
const SHEET_CONFIG = 'Config';
const COL_NUMERO = 1; // Columna A = número de acreditación
const CELL_CURRENT_SESSION = 'B2'; // Sesión activa

/***** ========================== ENDPOINT ========================== *****/
// Ejemplo URL: https://script.google.com/macros/s/ID_DEL_SCRIPT/exec?num=0034
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const num = e?.parameter?.num ? String(e.parameter.num).trim() : '';
  if (!num) return _html('Falta ?num (NO-PIN vFinal)');

  // Leer sesión activa desde Config
  const cfg = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) return _html('Falta hoja "Config" (NO-PIN vFinal)');
  const session = cfg.getRange(CELL_CURRENT_SESSION).getDisplayValue().trim();
  if (!session) return _html('Config!B2 vacío (NO-PIN vFinal)');

  // Comprobar que el número existe en asistentes
  const shAsistentes = ss.getSheetByName(SHEET_ASISTENTES);
  if (!shAsistentes) return _html('Falta hoja "asistentes" (NO-PIN vFinal)');
  const nums = shAsistentes
    .getRange(2, COL_NUMERO, Math.max(shAsistentes.getLastRow()-1, 0), 1)
    .getValues()
    .flat()
    .map(v => String(v).trim());

  if (!nums.includes(num)) return _html(`Número ${num} no está en "asistentes" (NO-PIN vFinal)`);

  // Registrar asistencia
  const shLog = ss.getSheetByName(SHEET_ASISTENCIAS);
  if (!shLog) return _html('Falta hoja "asistencias" (NO-PIN vFinal)');
  const last = shLog.getLastRow();

  // Evitar duplicados (mismo número + misma sesión)
  if (last >= 2) {
    const pares = shLog.getRange(2, 1, last-1, 2).getValues();
    const ya = pares.some(r => String(r[0]).trim() === num && String(r[1]).trim() === session);
    if (ya) return _html(`✅ Ya estaba registrado · Nº ${num} → ${session} (NO-PIN vFinal)`);
  }

  // Añadir registro
  const ts = Utilities.formatDate(new Date(), "Europe/Madrid", "yyyy-MM-dd HH:mm:ss");
  shLog.appendRow([num, session, ts]);

  return _html(`✅ Registrado Nº ${num} → ${session} (${ts}) (NO-PIN vFinal)`);
}

/***** ========================== HTML HELP ========================== *****/
function _html(msg){
  return HtmlService.createHtmlOutput(
    `<html><body style="font-family:system-ui;padding:12px;font-size:16px"><b>${msg}</b></body></html>`
  );
}
