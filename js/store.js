/* ============================================================
   Staff AJapp — CAPA DE DATOS (D21/D22)
   Dos Web Apps de Apps Script distintos, ninguno tocado por este repo:
   - CHECKIN_URL -> apps-script/Code.gs, TAL CUAL (script real de Pau,
     "NO-PIN vFinal"). Responde HTML de una línea, no JSON — hay que
     parsear el texto (D21).
   - STATS_URL -> apps-script/stats-readonly/Code.gs, proyecto standalone
     aparte, solo lectura. Responde JSON (D22).
   ============================================================ */

const Store = (() => {
  // URLs reales, desplegadas sobre "MIEMBROS CURSO PROTOCOLO XXI" — ver
  // docs/DEPLOY_URLS.md (fuente de verdad, no las cambies aquí sin actualizar
  // también ese archivo).
  const CHECKIN_URL = 'https://script.google.com/macros/s/AKfycbz3sICmCU9bvVtYH0ocQVVOpRDTdDq0IiMOtSbwy62tvtHw_4ZDQ97u3F8A3qlQwDoi/exec';
  const STATS_URL = 'https://script.google.com/macros/s/AKfycbz7gRYm8EKaGoKgcpXRB94A63wHpGefMU1aFzfPxqU2MuCHf-ODdy-xuHaswtXjKxL6/exec';
  const MOCK_CHECKIN = !CHECKIN_URL || CHECKIN_URL === 'URL_CHECKIN_PENDIENTE';
  const MOCK_STATS = !STATS_URL || STATS_URL === 'URL_STATS_PENDIENTE';

  const KEY_QUEUE = 'ajapp-cola';
  const KEY_SESSION = 'ajapp-login';
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);
  const notify = () => listeners.forEach((fn) => fn());

  /* ---------- login (lista fija en el código — no hay fuente de esto
     en el script real ni en la hoja, tarea 5 de CLAUDE.md) ---------- */
  // TODO(Pau): sustituye por el roster real de ~20 personas del staff.
  const STAFF = ['Pau', 'Marta', 'Javier', 'Sara', 'Nacho', 'Elena', 'David', 'Clara', 'Hugo', 'Ainhoa'];
  const staff = () => STAFF;
  function login(nombre) {
    if (!STAFF.includes(nombre)) return null;
    localStorage.setItem(KEY_SESSION, nombre);
    return nombre;
  }
  function logout() { localStorage.removeItem(KEY_SESSION); }
  function currentUser() { return localStorage.getItem(KEY_SESSION); }

  /* ---------- conexión ---------- */
  let simOffline = false;
  const setSimOffline = (v) => { simOffline = v; notify(); };
  const isOnline = () => navigator.onLine && !simOffline;
  const isSimOffline = () => simOffline;

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
    const texto = String(html)
      .replace(/<[^>]+>/g, '')
      .replace(/\s*\(NO-PIN vFinal\)\s*$/i, '')
      .trim();
    let status = 'error';
    if (/ya estaba registrado/i.test(texto)) status = 'duplicado';
    else if (/no está en/i.test(texto)) status = 'no_encontrado';
    else if (/config!b2 vacío/i.test(texto)) status = 'sin_sesion';
    else if (/registrado/i.test(texto)) status = 'ok';
    return { status, mensaje: texto };
  }

  /* ---------- mock local (solo mientras no haya URLs reales desplegadas) ---------- */
  const mockAsistentes = new Map([
    ['1', 'García, Ana'], ['2', 'López, Marcos'], ['3', 'Ruiz, Elena'],
    ['12', 'Sanz, David'], ['34', 'Prieto, Clara'], ['99', 'Vega, Hugo']
  ]);
  let mockSesion = 'Protocolo empresarial (mock)';
  const mockAsistencias = []; // {num, session}

  function mockCheckinHtml(num) {
    if (!mockSesion) return 'Config!B2 vacío (NO-PIN vFinal)';
    if (!mockAsistentes.has(num)) return `Número ${num} no está en "asistentes" (NO-PIN vFinal)`;
    const dup = mockAsistencias.some((a) => a.num === num && a.session === mockSesion);
    if (dup) return `✅ Ya estaba registrado · Nº ${num} → ${mockSesion} (NO-PIN vFinal)`;
    mockAsistencias.push({ num, session: mockSesion });
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return `✅ Registrado Nº ${num} → ${mockSesion} (${ts}) (NO-PIN vFinal)`;
  }
  function mockStats() {
    const registrados = mockAsistencias.filter((a) => a.session === mockSesion).length;
    const total = mockAsistentes.size;
    return { session: mockSesion, total, registrados, tasa: total ? Math.round((registrados / total) * 1000) / 10 : 0 };
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
    if (MOCK_CHECKIN) {
      await new Promise((r) => setTimeout(r, 250)); // simula latencia de red
      return mockCheckinHtml(num);
    }
    const res = await fetch(`${CHECKIN_URL}?num=${encodeURIComponent(num)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  /** Recorre la cola local y dispara ?num=X por cada pendiente, en orden. */
  async function syncQueue() {
    if (!isOnline()) return { synced: 0, pending: getQueue().length };
    const q = getQueue();
    let synced = 0;
    const restantes = [];
    for (const item of q) {
      try {
        await fetchCheckinHtml(item.num);
        synced++;
      } catch (e) {
        restantes.push(item);
      }
    }
    setQueue(restantes);
    return { synced, pending: restantes.length };
  }

  /** Sesión activa + recuento en vivo, para la pantalla Estadísticas (polling, D22). */
  async function stats() {
    if (MOCK_STATS) {
      await new Promise((r) => setTimeout(r, 250));
      return mockStats();
    }
    const res = await fetch(STATS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return {
    onChange,
    staff, login, logout, currentUser,
    checkin, syncQueue, stats,
    getQueue, isOnline, setSimOffline, isSimOffline
  };
})();
