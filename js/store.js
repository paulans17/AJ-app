/* ============================================================
   Staff AJapp — CAPA DE DATOS (Google Sheets + Apps Script, D13-D20)
   Sin Firebase/Firestore. Habla por fetch() GET con el Web App de
   apps-script/Code.gs (ver docs/SHEET_SCHEMA.md). Sin login/roster local:
   no importa quién escanea (decisión de Pau), así que no hay Store.staff
   ni Store.currentUser — solo check-in y estadísticas.
   ============================================================ */

const Store = (() => {
  // TODO(Pau): sustituye por la URL real `.../exec` en cuanto despliegues
  // apps-script/Code.gs como Web App (ver docs/PROJECT_SETUP.md §0). Hasta
  // entonces la app corre contra un mock local (ver más abajo) para poder
  // probar la interfaz sin la hoja real.
  const WEBAPP_URL = 'URL_PENDIENTE';
  const MOCK = !WEBAPP_URL || WEBAPP_URL === 'URL_PENDIENTE';

  const KEY_QUEUE = 'ajapp-cola';
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);
  const notify = () => listeners.forEach((fn) => fn());

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

  /* ---------- mock local (solo mientras WEBAPP_URL no esté configurada) ---------- */
  const mockAsistentes = new Map([
    ['1', 'García, Ana'], ['2', 'López, Marcos'], ['3', 'Ruiz, Elena'],
    ['12', 'Sanz, David'], ['34', 'Prieto, Clara'], ['99', 'Vega, Hugo']
  ]);
  let mockSesion = 'Protocolo empresarial (mock)';
  const mockAsistencias = []; // {num, session}

  function mockCheckin(num) {
    if (!mockSesion) return { status: 'sin_sesion', mensaje: 'No hay ninguna sesión activa' };
    if (!mockAsistentes.has(num)) return { status: 'no_encontrado', mensaje: `Número ${num} no está en "asistentes" (mock)` };
    const dup = mockAsistencias.some((a) => a.num === num && a.session === mockSesion);
    if (dup) return { status: 'duplicado', mensaje: `Ya estaba registrado · Nº ${num} → ${mockSesion} (mock)` };
    mockAsistencias.push({ num, session: mockSesion });
    return { status: 'ok', mensaje: `Registrado Nº ${num} → ${mockSesion} (mock)`, session: mockSesion };
  }
  function mockStats() {
    const registrados = mockAsistencias.filter((a) => a.session === mockSesion).length;
    const total = mockAsistentes.size;
    return { session: mockSesion, total, registrados, tasa: total ? Math.round((registrados / total) * 1000) / 10 : 0 };
  }

  async function callWebApp(params) {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 250)); // simula latencia de red
      return params.action === 'stats' ? mockStats() : mockCheckin(params.num);
    }
    const qs = new URLSearchParams({ ...params, format: 'json' }).toString();
    const res = await fetch(`${WEBAPP_URL}?${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Registra un check-in. Devuelve {status, mensaje, num, ...}.
   * status: ok | duplicado | no_encontrado | sin_sesion | offline_ok | error
   * Sin conexión (o si falla el fetch pese a estar "online"), se encola en
   * localStorage y se reintenta al volver la conexión (ver syncQueue).
   */
  async function checkin(codigo, metodo) {
    const num = String(codigo).trim();
    if (!num) return { status: 'no_encontrado', mensaje: 'Código vacío', num };

    if (getQueue().some((c) => c.num === num)) {
      return { status: 'duplicado', mensaje: 'Ya está en la cola de este móvil, pendiente de sincronizar', num };
    }

    if (!isOnline()) {
      const q = getQueue();
      q.push({ num, metodo: metodo || 'qr', ts: Date.now() });
      setQueue(q);
      return { status: 'offline_ok', mensaje: 'Guardado sin conexión — se sincronizará', num };
    }

    try {
      const r = await callWebApp({ num });
      return { ...r, num };
    } catch (e) {
      // Falla el fetch pese a isOnline() (CORS, timeout, Web App caído) -> a la cola
      const q = getQueue();
      q.push({ num, metodo: metodo || 'qr', ts: Date.now() });
      setQueue(q);
      return { status: 'offline_ok', mensaje: 'No se pudo contactar con la hoja — guardado sin conexión', num };
    }
  }

  /** Recorre la cola local y dispara el check-in real por cada pendiente, en orden. */
  async function syncQueue() {
    if (!isOnline()) return { synced: 0, pending: getQueue().length };
    const q = getQueue();
    let synced = 0;
    const restantes = [];
    for (const item of q) {
      try {
        await callWebApp({ num: item.num });
        synced++;
      } catch (e) {
        restantes.push(item);
      }
    }
    setQueue(restantes);
    return { synced, pending: restantes.length };
  }

  /** Sesión activa + recuento en vivo, para la pantalla Estadísticas (polling). */
  async function stats() {
    return callWebApp({ action: 'stats' });
  }

  return {
    onChange,
    checkin, syncQueue, stats,
    getQueue, isOnline, setSimOffline, isSimOffline
  };
})();
