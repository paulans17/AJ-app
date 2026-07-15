/**
 * Web App de SOLO LECTURA para la pantalla Estadísticas.
 *
 * Proyecto de Apps Script SEPARADO del check-in (apps-script/Code.gs no
 * se toca — D21). No comparte deploy ni URL con él. Se crea como un
 * script standalone nuevo (no container-bound) en script.google.com,
 * que abre la misma hoja por ID para leer — nunca escribe nada.
 *
 * INSTALACIÓN:
 * 1. script.google.com → Nuevo proyecto.
 * 2. Pega este archivo como Code.gs, y appsscript.json (en esta misma
 *    carpeta) como el manifest del proyecto.
 * 3. Implementar → Nueva implementación → Aplicación web → ejecutar
 *    como "Yo", acceso "Cualquier usuario" → esa URL .../exec es la que
 *    usa la PWA solo para la pantalla Estadísticas (distinta de la URL
 *    de check-in).
 *
 * Ejemplo: https://script.google.com/macros/s/ID_DISTINTO/exec
 * Devuelve JSON: {"session": "...", "total": 99, "registrados": 12, "tasa": 12.1}
 */

const SPREADSHEET_ID = '1YDADLLWwA92Gm-_WYPYY4qGxTt5Wx-RIjM7Ju8z9FHE'; // MIEMBROS CURSO PROTOCOLO XXI — cambiar si se usa otra copia
const SHEET_ASISTENTES = 'asistentes';
const SHEET_ASISTENCIAS = 'asistencias';
const SHEET_CONFIG = 'Config';
const CELL_CURRENT_SESSION = 'B2';

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const cfg = ss.getSheetByName(SHEET_CONFIG);
  const session = cfg ? cfg.getRange(CELL_CURRENT_SESSION).getDisplayValue().trim() : '';

  const shAsistentes = ss.getSheetByName(SHEET_ASISTENTES);
  const total = shAsistentes ? Math.max(shAsistentes.getLastRow() - 1, 0) : 0;

  let registrados = 0;
  const shLog = ss.getSheetByName(SHEET_ASISTENCIAS);
  if (shLog && session) {
    const last = shLog.getLastRow();
    if (last >= 2) {
      // Columna A = num, columna B = sesión (misma estructura que ya usa Code.gs)
      const filas = shLog.getRange(2, 1, last - 1, 2).getValues();
      registrados = filas.filter((r) => String(r[1]).trim() === session).length;
    }
  }

  const tasa = total > 0 ? Math.round((registrados / total) * 1000) / 10 : 0;

  const payload = { session, total, registrados, tasa };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
