/* ============================================================
   Staff AJapp — CAPA DE DATOS (D21/D22/D28/D31)
   Dos Web Apps de Apps Script distintos, ninguno tocado por este repo:
   - CHECKIN_URL -> apps-script/Code.gs, TAL CUAL (script real de Pau,
     "NO-PIN vFinal"). Responde HTML de una línea, no JSON — hay que
     parsear el texto (D21).
   - STATS_URL -> apps-script/stats-readonly/Code.gs, proyecto standalone
     aparte, solo lectura. Responde JSON: sin parámetros, Estadísticas
     (D22); con ?tipo=horarios, los horarios del equipo, pestaña Horarios
     de la misma hoja (D31) — se edita ahí, no aquí.
   Sin login ni roster de staff (D28) — no importa quién escanea. La
   única "base de datos" es la hoja de Google Sheets real; no hay mock
   ni datos de demo en ningún sitio de este archivo.
   ============================================================ */

const Store = (() => {
  // URLs reales, desplegadas sobre "MIEMBROS CURSO PROTOCOLO XXI" — ver
  // docs/DEPLOY_URLS.md (fuente de verdad, no las cambies aquí sin actualizar
  // también ese archivo).
  const CHECKIN_URL = 'https://script.google.com/macros/s/AKfycbz3sICmCU9bvVtYH0ocQVVOpRDTdDq0IiMOtSbwy62tvtHw_4ZDQ97u3F8A3qlQwDoi/exec';
  const STATS_URL = 'https://script.google.com/macros/s/AKfycbz7gRYm8EKaGoKgcpXRB94A63wHpGefMU1aFzfPxqU2MuCHf-ODdy-xuHaswtXjKxL6/exec';

  const KEY_QUEUE = 'ajapp-cola';
  const KEY_STATS_CACHE = 'ajapp-stats-cache';
  const KEY_HORARIOS_CACHE = 'ajapp-horarios-cache';
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);
  const notify = () => listeners.forEach((fn) => fn());

  /* ---------- conexión ---------- */
  const isOnline = () => navigator.onLine;

  /* ---------- cola offline (D18) ---------- */
  function getQueue() {
    try { return JSON.parse(localStorage.getItem(KEY_QUEUE)) || []; } catch (e) { return []; }
  }
  function setQueue(q) {
    localStorage.setItem(KEY_QUEUE, JSON.stringify(q));
    notify();
  }

  /* ---------- parseo de la respuesta HTML del check-in (D21: texto, no JSON) ----------
     El script real responde siempre HTML de una línea, mensajes que acaban en
     "(NO-PIN vFinal)". No hay campo status estructurado — se decide por texto,
     tal como pide docs/SHEET_SCHEMA.md. */
  function parseCheckinHtml(html) {
    // Apps Script sirve HtmlService envuelto en un loader sandboxed
    // (goog.script.init) en vez de HTML plano cuando se le hace fetch()
    // directo — comprobado en real: la URL responde 200 pero el cuerpo es
    // una página de carga con el mensaje escapado dentro (\x3cb\x3e...).
    // Se desescapan las secuencias \xHH y se ancla en "(NO-PIN vFinal)"
    // (sufijo fijo y siempre en texto plano de _html() en Code.gs) para
    // extraer el mensaje real sin depender del formato interno del loader.
    const desescapar = (s) => s
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/');
    // Dos pasadas: los mensajes de error citan nombres de hoja entre
    // comillas (ej. "asistentes"), que quedan doblemente escapados dentro
    // del loader (JSON dentro de un string JS) — una sola pasada no basta.
    const unescaped = desescapar(desescapar(String(html)));
    const m = unescaped.match(/<b>([\s\S]*?\(NO-PIN vFinal\))/i);
    const bruto = m ? m[1] : unescaped.replace(/<[^>]+>/g, '');
    const texto = bruto
      .replace(/\s*\(NO-PIN vFinal\)\s*$/i, '')
      .trim();
    let status = 'error';
    if (/ya estaba registrado/i.test(texto)) status = 'duplicado';
    else if (/no está en/i.test(texto)) status = 'no_encontrado';
    else if (/config!b2 vacío/i.test(texto)) status = 'sin_sesion';
    else if (/registrado/i.test(texto)) status = 'ok';
    return { status, mensaje: texto };
  }

  /**
   * Registra un check-in. Devuelve {status, mensaje, num}.
   * status: ok | duplicado | no_encontrado | sin_sesion | offline_ok | error
   */
  async function checkin(codigo) {
    const num = String(codigo).trim();
    if (!num) return { status: 'no_encontrado', mensaje: 'Código vacío', num };

    if (getQueue().some((c) => c.num === num)) {
      return { status: 'duplicado', mensaje: 'Ya está en la cola de este móvil, pendiente de sincronizar', num };
    }

    if (!isOnline()) {
      const q = getQueue();
      q.push({ num, ts: Date.now() });
      setQueue(q);
      return { status: 'offline_ok', mensaje: 'Guardado sin conexión — se sincronizará', num };
    }

    try {
      const html = await fetchCheckinHtml(num);
      return { ...parseCheckinHtml(html), num };
    } catch (e) {
      // Falla el fetch pese a isOnline() (CORS, timeout, Web App caído) -> a la cola
      const q = getQueue();
      q.push({ num, ts: Date.now() });
      setQueue(q);
      return { status: 'offline_ok', mensaje: 'No se pudo contactar con la hoja — guardado sin conexión', num };
    }
  }

  async function fetchCheckinHtml(num) {
    const res = await fetch(`${CHECKIN_URL}?num=${encodeURIComponent(num)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  /**
   * Recorre la cola local y dispara ?num=X por cada pendiente, en orden.
   * Solo se quita de la cola si la respuesta confirma un estado resuelto
   * (ok o duplicado) — cualquier otra respuesta (sin_sesion, no_encontrado,
   * error de hoja) se queda en la cola y se cuenta aparte como "failed",
   * para no perder el check-in en silencio si p. ej. nadie ha activado
   * todavía la sesión en Config!B2.
   */
  async function syncQueue() {
    if (!isOnline()) return { synced: 0, failed: 0, pending: getQueue().length };
    const q = getQueue();
    let synced = 0;
    let failed = 0;
    const restantes = [];
    for (const item of q) {
      try {
        const html = await fetchCheckinHtml(item.num);
        const r = parseCheckinHtml(html);
        if (r.status === 'ok' || r.status === 'duplicado') {
          synced++;
        } else {
          failed++;
          restantes.push(item);
        }
      } catch (e) {
        restantes.push(item);
      }
    }
    setQueue(restantes);
    return { synced, failed, pending: restantes.length };
  }

  /** Último resultado de stats() guardado, para pintar algo al instante
   * mientras llega el nuevo dato — Apps Script tarda varios segundos
   * (medido: 3-9s) y con "Cargando…" a pantalla vacía se siente roto. */
  function cachedStats() {
    try { return JSON.parse(localStorage.getItem(KEY_STATS_CACHE)); } catch (e) { return null; }
  }

  /** Sesión activa + recuento en vivo, para la pantalla Estadísticas (polling, D22). */
  async function stats() {
    const res = await fetch(STATS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    try { localStorage.setItem(KEY_STATS_CACHE, JSON.stringify(data)); } catch (e) { /* localStorage lleno o bloqueado, no es crítico */ }
    return data;
  }

  /** Último resultado de horarios() guardado — mismo motivo que cachedStats(). */
  function cachedHorarios() {
    try { return JSON.parse(localStorage.getItem(KEY_HORARIOS_CACHE)); } catch (e) { return null; }
  }

  /** Horarios del equipo, pestaña Horarios de la hoja (D31). */
  async function horarios() {
    const res = await fetch(`${STATS_URL}?tipo=horarios`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    try { localStorage.setItem(KEY_HORARIOS_CACHE, JSON.stringify(data)); } catch (e) { /* localStorage lleno o bloqueado, no es crítico */ }
    return data;
  }

  return {
    onChange,
    checkin, syncQueue, stats, cachedStats, horarios, cachedHorarios,
    getQueue, isOnline
  };
})();
