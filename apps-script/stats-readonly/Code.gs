/**
 * Web App de SOLO LECTURA para las pantallas Estadísticas y Horarios.
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
 *    usa la PWA para Estadísticas y Horarios (distinta de la URL de
 *    check-in). Si ya tenías este proyecto desplegado (D22), solo hace
 *    falta pegar la versión nueva del archivo y crear una nueva versión
 *    de la implementación existente (Implementar → Gestionar
 *    implementaciones → lápiz → Nueva versión) — la URL no cambia.
 *
 * Ejemplo: https://script.google.com/macros/s/ID_DISTINTO/exec
 * Por defecto (sin parámetros) devuelve JSON de Estadísticas:
 *   {"session": "...", "total": 99, "registrados": 12, "tasa": 12.1}
 * Con ?tipo=horarios (D31/D32) devuelve JSON de Horarios, agrupado por
 * día en el mismo orden en que aparecen las filas en la hoja:
 *   {"dias": [{"dia": "Jueves 25", "franjas": [
 *     {"hora": "09:00–10:30", "actividad": "Recepción", "notas": "...", "responsable": "..."}
 *   ]}]}
 */

const SPREADSHEET_ID = '1YDADLLWwA92Gm-_WYPYY4qGxTt5Wx-RIjM7Ju8z9FHE'; // MIEMBROS CURSO PROTOCOLO XXI — cambiar si se usa otra copia
const SHEET_ASISTENTES = 'asistentes';
const SHEET_ASISTENCIAS = 'asistencias';
const SHEET_CONFIG = 'Config';
const CELL_CURRENT_SESSION = 'B2';
const SHEET_HORARIOS = 'Horarios';

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (e && e.parameter && e.parameter.tipo === 'horarios') {
    return jsonOut(getHorarios(ss));
  }

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

  return jsonOut({ session, total, registrados, tasa });
}

/** Lee la pestaña Horarios (Día/Hora/Actividad/Notas/Responsable) y
 * agrupa filas consecutivas del mismo día — el orden de la hoja es el
 * orden de salida, no se reordena nada (D31/D32, mismo criterio que
 * Config!B2: edita celdas, no hace falta tocar código). */
function getHorarios(ss) {
  const sh = ss.getSheetByName(SHEET_HORARIOS);
  const last = sh ? sh.getLastRow() : 0;
  if (!sh || last < 2) return { dias: [] };

  const filas = sh.getRange(2, 1, last - 1, 5).getDisplayValues();
  const dias = [];
  let actual = null;
  filas.forEach((r) => {
    const dia = String(r[0]).trim();
    const hora = String(r[1]).trim();
    const actividad = String(r[2]).trim();
    const notas = String(r[3]).trim();
    const responsable = String(r[4]).trim();
    if (!dia && !hora && !actividad) return; // fila vacía, se ignora
    if (!actual || actual.dia !== dia) {
      actual = { dia, franjas: [] };
      dias.push(actual);
    }
    actual.franjas.push({ hora, actividad, notas, responsable });
  });
  return { dias };
}

function jsonOut(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
