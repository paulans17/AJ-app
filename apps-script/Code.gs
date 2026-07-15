/**
 * Apps Script vinculado al Google Form real de inscripción al Curso de Protocolo.
 *
 * Adaptado de Staff AJappBd/apps-script/Code.gs (proyecto de pruebas
 * prueba-protocolo2627) al proyecto Firebase definitivo de Alfil Juvenil.
 * Ver docs/DECISIONS.md (D1, D3, D5) y docs/ARCHITECTURE.md.
 *
 * NO usa Cloud Functions (exige plan Blaze, descartado en D3). Llama
 * directamente a la API REST de Firestore usando el token OAuth de la
 * cuenta de Google que ejecuta el script -- debe ser una cuenta con acceso
 * de editor/propietario al proyecto Firebase (la cuenta de Alfil Juvenil).
 * Esto es gratis en el plan Spark.
 *
 * INSTALACIÓN:
 * 1. Abre el formulario -> menú de tres puntos -> Editor de secuencia de
 *    comandos (o Extensiones > Apps Script).
 * 2. Pega este archivo como Code.gs, y copia appsscript.json tal cual.
 * 3. Cambia PROJECT_ID más abajo por el ID real del proyecto Firebase
 *    (ver docs/PROJECT_SETUP.md paso 1).
 * 4. Activadores (icono del reloj) -> Añadir activador -> función:
 *    onFormSubmit, evento: Al enviarse el formulario.
 * 5. Para la confirmación: Implementar -> Nueva implementación ->
 *    Aplicación web -> ejecutar como "Yo", acceso "Cualquier usuario".
 *    La URL resultante es el enlace de confirmación del email.
 */

const PROJECT_ID = 'alfiljuvenil-protocolo';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';

function authHeaders_() {
  return {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
  };
}

/**
 * Se dispara al enviar el Form. Genera el ID atómicamente, calcula
 * modalidad/precio, escribe la inscripción en Firestore y manda el email
 * de preinscripción con QR.
 */
function onFormSubmit(e) {
  const r = e.namedValues;
  const val = (campo) => (r[campo] && r[campo][0]) ? r[campo][0] : '';

  const nombre = val('Nombre');
  const apellidos = val('Apellidos');
  const fechaNacimiento = val('FechaNacimiento');
  const gradoActividades = val('Grado o Actividades');
  const menuCena = val('MenuCena');
  const dni = val('DNI');
  const email = val('Email');
  const alergias = val('Alergias');

  const id = generarSiguienteId_();
  const tieneMenu = menuCena.trim().length > 0;
  const modalidad = tieneMenu ? 'curso_cena' : 'solo_curso';
  const precio = tieneMenu ? 90 : 65;
  const apellidoOrden = apellidos
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const doc = {
    fields: {
      nombre: { stringValue: nombre },
      apellidos: { stringValue: apellidos },
      apellidoOrden: { stringValue: apellidoOrden },
      fechaNacimiento: { stringValue: fechaNacimiento },
      gradoActividades: { stringValue: gradoActividades },
      alergias: { stringValue: alergias },
      menuCena: { stringValue: menuCena },
      dni: { stringValue: dni },
      email: { stringValue: email },
      modalidad: { stringValue: modalidad },
      precio: { integerValue: precio },
      estado: { stringValue: 'pendiente' },
      tsInscripcion: { timestampValue: new Date().toISOString() },
      tsConfirmacion: { nullValue: null },
      qrCode: { stringValue: id },
    },
  };

  UrlFetchApp.fetch(FIRESTORE_BASE + '/inscripciones/' + id, {
    method: 'patch',
    headers: authHeaders_(),
    contentType: 'application/json',
    payload: JSON.stringify(doc),
  });

  enviarEmailPreinscripcion_(email, nombre, id);
}

/**
 * Incrementa contadorId de forma atómica usando un "field transform" de
 * Firestore (increment), serializado por el propio servidor aunque lleguen
 * varias inscripciones a la vez.
 */
function generarSiguienteId_() {
  const commitUrl = FIRESTORE_BASE + ':commit';
  const body = {
    writes: [
      {
        transform: {
          document: 'projects/' + PROJECT_ID + '/databases/(default)/documents/config/general',
          fieldTransforms: [
            { fieldPath: 'contadorId', increment: { integerValue: '1' } },
          ],
        },
      },
    ],
  };

  const resp = UrlFetchApp.fetch(commitUrl, {
    method: 'post',
    headers: authHeaders_(),
    contentType: 'application/json',
    payload: JSON.stringify(body),
  });

  const json = JSON.parse(resp.getContentText());
  const nuevoContador = parseInt(json.writeResults[0].transformResults[0].integerValue, 10);

  const config = leerConfig_();
  const prefijo = config.prefijoId || 'AJ2026-';
  return prefijo + String(nuevoContador).padStart(4, '0');
}

function leerConfig_() {
  try {
    const resp = UrlFetchApp.fetch(FIRESTORE_BASE + '/config/general', {
      headers: authHeaders_(),
      muteHttpExceptions: true,
    });
    const json = JSON.parse(resp.getContentText());
    if (!json.fields) return {};
    return {
      prefijoId: json.fields.prefijoId ? json.fields.prefijoId.stringValue : 'AJ2026-',
    };
  } catch (err) {
    return { prefijoId: 'AJ2026-' };
  }
}

function enviarEmailPreinscripcion_(email, nombre, id) {
  const qrUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(id) + '&size=300';
  const confirmUrl = ScriptApp.getService().getUrl() + '?id=' + encodeURIComponent(id);

  MailApp.sendEmail({
    to: email,
    subject: 'Inscripción recibida · ' + id,
    htmlBody:
      '<p>Hola ' + nombre + ',</p>' +
      '<p>Hemos recibido tu inscripción al Curso de Protocolo. Tu número de inscripción es <b>' + id + '</b>.</p>' +
      '<p><img src="' + qrUrl + '" alt="QR ' + id + '"></p>' +
      '<p>Para confirmar tu plaza, haz clic aquí: <a href="' + confirmUrl + '">Confirmar inscripción</a></p>',
  });
}

/**
 * Web App (doGet) -- URL pública de confirmación enlazada desde el email.
 */
function doGet(e) {
  const id = e.parameter.id;
  if (!id) {
    return HtmlService.createHtmlOutput('Falta el parámetro id.');
  }

  const getResp = UrlFetchApp.fetch(FIRESTORE_BASE + '/inscripciones/' + id, {
    headers: authHeaders_(),
    muteHttpExceptions: true,
  });

  if (getResp.getResponseCode() === 404) {
    return HtmlService.createHtmlOutput('Inscripción no encontrada: ' + id);
  }

  const doc = JSON.parse(getResp.getContentText());
  const estadoActual = doc.fields.estado.stringValue;

  if (estadoActual === 'confirmado') {
    return HtmlService.createHtmlOutput('Esta inscripción ya estaba confirmada. ¡Gracias!');
  }

  const updateUrl = FIRESTORE_BASE + '/inscripciones/' + id + '?updateMask.fieldPaths=estado&updateMask.fieldPaths=tsConfirmacion';
  const updateBody = {
    fields: {
      estado: { stringValue: 'confirmado' },
      tsConfirmacion: { timestampValue: new Date().toISOString() },
    },
  };

  UrlFetchApp.fetch(updateUrl, {
    method: 'patch',
    headers: authHeaders_(),
    contentType: 'application/json',
    payload: JSON.stringify(updateBody),
  });

  return HtmlService.createHtmlOutput('Inscripción ' + id + ' confirmada. ¡Gracias!');
}
