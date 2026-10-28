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
 * Con ?tipo=horarios (D31/D36) devuelve JSON de Horarios, agrupado por
 * día en el orden en que aparece cada día en la hoja:
 *   {"dias": [{"dia": "Lunes", "coche": "Maialen + Carolina", "eventos": [
 *     {"hora": "09:00", "tipo": "Recogida", "actividad": "Recogida de Sami",
 *      "personas": ["Berta", "Maialen"], "sorteo": "", "notas": ""}
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

/** Lee la pestaña Horarios (A Día · B Hora · C Tipo · D Actividad ·
 * E Personas · F Sorteo · G Notas), una fila por cosa que pasa (D36).
 * Una fila con Tipo "Coche del día" no es un evento: su Personas (o su
 * Actividad) pasa a ser el aviso del día. Una fila con solo el Día crea
 * ese día vacío. No se ordena nada aquí: la app ordena por hora. */
function getHorarios(ss) {
  const sh = ss.getSheetByName(SHEET_HORARIOS);
  const last = sh ? sh.getLastRow() : 0;
  if (!sh || last < 2) return { dias: [] };

  const filas = sh.getRange(2, 1, last - 1, 7).getDisplayValues();
  const dias = [];
  const porDia = {};
  filas.forEach((r) => {
    const [dia, hora, tipo, actividad, personas, sorteo, notas] = r.map((c) => String(c).trim());
    if (!dia) return;
    if (!porDia[dia]) {
      porDia[dia] = { dia, coche: '', eventos: [] };
      dias.push(porDia[dia]);
    }
    if (!hora && !tipo && !actividad && !personas) return; // solo el día: queda vacío
    if (normalizar(tipo) === 'coche del dia') {
      porDia[dia].coche = personas || actividad;
      return;
    }
    porDia[dia].eventos.push({
      hora, tipo, actividad,
      personas: personas.split(/\s*(?:[+,]|\s+y\s+)\s*/).filter(Boolean),
      sorteo, notas
    });
  });
  return { dias };
}

function normalizar(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function jsonOut(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
