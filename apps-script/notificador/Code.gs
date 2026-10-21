/**
 * NOTIFICADOR de avisos push (D33). Proyecto de Apps Script TERCERO, standalone,
 * SIN despliegue como Web App (no tiene URL pública): solo se ejecuta por
 * triggers de la hoja. No toca apps-script/Code.gs (check-in) ni
 * apps-script/stats-readonly/ (Estadísticas/Horarios, solo lectura).
 *
 * QUÉ HACE
 * - Cambias Config!B2 (sesión activa)  -> aviso "ya podéis pasar asistencia".
 * - Marcas la casilla Config!B3        -> aviso "horarios actualizados"
 *   y la casilla se desmarca sola.
 * Los avisos los reparte OneSignal a todos los móviles que activaron avisos.
 *
 * INSTALACIÓN (una sola vez, con la cuenta dueña de la hoja):
 * 1. En la hoja, pestaña Config: A3 = AVISAR_HORARIOS, y en B3 Insertar >
 *    Casilla de verificación (desmarcada).
 * 2. script.google.com -> Nuevo proyecto. Pega este archivo como Code.gs y
 *    appsscript.json (en esta carpeta) como manifest (Configuración del
 *    proyecto > "Mostrar el archivo de manifiesto appsscript.json").
 * 3. Configuración del proyecto > Propiedades del script > añade:
 *      ONESIGNAL_APP_ID  = el App ID de OneSignal (público)
 *      ONESIGNAL_API_KEY = la REST API Key de OneSignal (SECRETA: solo aquí,
 *                          nunca en el repo ni en el chat)
 * 4. Ejecuta crearTriggers() una vez y acepta los permisos.
 * 5. Ejecuta probarAviso() para comprobar que llega una notificación.
 */

const SPREADSHEET_ID = '1YDADLLWwA92Gm-_WYPYY4qGxTt5Wx-RIjM7Ju8z9FHE'; // MIEMBROS CURSO PROTOCOLO XXI
const SHEET_CONFIG = 'Config';
const CELL_SESION = 'B2';
const CELL_AVISAR_HORARIOS = 'B3';
const APP_URL = 'https://paulans17.github.io/AJ-app/';
const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';

/** Instala el trigger de edición. Idempotente: borra los anteriores. */
function crearTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('alEditar').forSpreadsheet(SPREADSHEET_ID).onEdit().create();
}

/** Trigger instalable. Solo salta con ediciones manuales en la hoja. */
function alEditar(e) {
  if (!e || !e.range) return;
  if (e.range.getSheet().getName() !== SHEET_CONFIG) return;
  const celda = e.range.getA1Notation();

  if (celda === CELL_SESION) {
    const nueva = String(e.value || '').trim();
    const anterior = String(e.oldValue || '').trim();
    if (!nueva || nueva === anterior) return; // vaciada o sin cambio real
    enviar('Sesión activa', nueva + ' — ya podéis pasar asistencia', APP_URL + '#escanear');
  } else if (celda === CELL_AVISAR_HORARIOS) {
    if (String(e.value).toUpperCase() !== 'TRUE') return;
    enviar('Horarios actualizados', 'Hay cambios en los horarios del equipo', APP_URL + '#horarios');
    e.range.setValue(false); // un setValue por código no vuelve a disparar el trigger
  }
}

/** Para probar desde el editor sin tocar la hoja. */
function probarAviso() {
  enviar('Prueba', 'Si ves esto, los avisos funcionan', APP_URL);
}

function enviar(titulo, texto, url) {
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty('ONESIGNAL_APP_ID');
  const apiKey = props.getProperty('ONESIGNAL_API_KEY');
  if (!appId || !apiKey) {
    throw new Error('Faltan ONESIGNAL_APP_ID / ONESIGNAL_API_KEY en Propiedades del script');
  }
  const res = UrlFetchApp.fetch(ONESIGNAL_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Key ' + apiKey },
    payload: JSON.stringify({
      app_id: appId,
      target_channel: 'push',
      included_segments: ['Subscribed Users'],
      headings: { en: titulo, es: titulo },
      contents: { en: texto, es: texto },
      url: url
    }),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('OneSignal ' + code + ': ' + res.getContentText());
  }
}
