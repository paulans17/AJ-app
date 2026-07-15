/* ============================================================
   Staff AJapp — CAPA DE DATOS (Firebase real)
   Firestore (SDK web modular) + Firebase Auth. Mantiene la misma
   interfaz pública que consumían js/views.js y js/app.js: getters
   síncronos que leen de un espejo en memoria, alimentado en vivo por
   onSnapshot. Persistencia offline nativa del SDK (persistentLocalCache),
   sin cola manual — ver docs/ARCHITECTURE.md, "Estrategia offline".
   ============================================================ */

const Store = (() => {
  const SDK_VERSION = '12.16.0';
  const KEY_SESSION = 'ajapp-login';

  const db = { config: {}, staff: [], sesiones: [], inscripciones: [], checkins: [] };
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);
  const notify = () => listeners.forEach((fn) => fn());

  let fs = null;   // { app, firestore, auth, mod: { firestoreFns, authFns } }
  let adminClaimOk = false; // true si la sesión Auth actual es real (no anónima) y con custom claim válido

  /* ---------- helpers ---------- */
  function tsToISO(v) {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    return v;
  }

  async function initFirebase() {
    const [{ initializeApp }, firestoreMod, authMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`)
    ]);
    const cfg = await fetch('firebase/web-config.json').then((r) => r.json());
    const app = initializeApp(cfg);
    const firestore = firestoreMod.initializeFirestore(app, {
      localCache: firestoreMod.persistentLocalCache()
    });
    const auth = authMod.getAuth(app);
    fs = { app, firestore, auth, firestoreMod, authMod };

    await new Promise((resolve) => {
      const unsub = authMod.onAuthStateChanged(auth, (user) => {
        unsub();
        if (user) { resolve(); return; }
        authMod.signInAnonymously(auth).then(resolve).catch(resolve);
      });
    });

    subscribeAll();
    await Promise.all([
      waitFirst('config'), waitFirst('staff'), waitFirst('sesiones'),
      waitFirst('inscripciones'), waitFirst('checkins')
    ]);
  }

  const firstSnapDone = {};
  const firstSnapResolvers = {};
  function waitFirst(key) {
    if (firstSnapDone[key]) return Promise.resolve();
    return new Promise((resolve) => { firstSnapResolvers[key] = resolve; });
  }
  function markFirst(key) {
    if (!firstSnapDone[key]) {
      firstSnapDone[key] = true;
      if (firstSnapResolvers[key]) firstSnapResolvers[key]();
    }
  }

  // Si un listener falla (p.ej. rules aún no desplegadas: permission-denied),
  // no debe dejar Store.ready colgado para siempre — se libera igualmente
  // con esa fuente vacía, y se avisa por consola para que quede claro que es
  // un problema de permisos/red, no un bug silencioso.
  function onErr(key) {
    return (err) => {
      console.error(`Store: fallo leyendo "${key}" —`, err.code || err.message || err);
      markFirst(key);
      notify();
    };
  }

  function subscribeAll() {
    const { firestoreMod: F, firestore } = fs;

    F.onSnapshot(F.doc(firestore, 'config', 'general'), (snap) => {
      db.config = snap.exists() ? snap.data() : {};
      markFirst('config');
      notify();
    }, onErr('config'));

    F.onSnapshot(F.collection(firestore, 'staff'), (snap) => {
      db.staff = snap.docs.map((d) => ({ username: d.id, ...d.data() }));
      markFirst('staff');
      notify();
    }, onErr('staff'));

    F.onSnapshot(F.collection(firestore, 'sesiones'), (snap) => {
      db.sesiones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      markFirst('sesiones');
      notify();
    }, onErr('sesiones'));

    F.onSnapshot(F.collection(firestore, 'inscripciones'), (snap) => {
      db.inscripciones = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, ...data,
          fechaNacimiento: tsToISO(data.fechaNacimiento),
          tsInscripcion: tsToISO(data.tsInscripcion),
          tsConfirmacion: tsToISO(data.tsConfirmacion)
        };
      });
      markFirst('inscripciones');
      notify();
    }, onErr('inscripciones'));

    F.onSnapshot(F.collection(firestore, 'checkins'), { includeMetadataChanges: true }, (snap) => {
      db.checkins = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' });
        return {
          id: d.id, ...data,
          timestamp: tsToISO(data.timestamp),
          pendienteSync: d.metadata.hasPendingWrites
        };
      });
      markFirst('checkins');
      notify();
    }, onErr('checkins'));
  }

  const ready = initFirebase();

  /* ---------- login staff (solo usuario, sin contraseña — D4) ---------- */
  function login(username) {
    const s = db.staff.find((x) => x.username === username && x.activo);
    if (!s) return null;
    localStorage.setItem(KEY_SESSION, username);
    return s;
  }
  function logout() { localStorage.removeItem(KEY_SESSION); }
  function currentUser() {
    const u = localStorage.getItem(KEY_SESSION);
    return u ? db.staff.find((x) => x.username === u) : null;
  }
  const isInformatica = () => {
    const u = currentUser();
    return !!u && (u.departamento === 'informatica' || u.departamento === 'presidencia');
  };

  /* ---------- modo admin real (D12) ---------- */
  const isAdminAuthenticated = () => adminClaimOk;

  async function adminLogin(email, password) {
    const { authMod: A, auth } = fs;
    try {
      const cred = await A.signInWithEmailAndPassword(auth, email, password);
      const tok = await cred.user.getIdTokenResult(true);
      const dep = tok.claims.departamento;
      if (dep === 'informatica' || dep === 'presidencia') {
        adminClaimOk = true;
        notify();
        return { ok: true };
      }
      await A.signOut(auth);
      await A.signInAnonymously(auth);
      adminClaimOk = false;
      notify();
      return { ok: false, error: 'Esta cuenta no tiene permisos de Informática/Presidencia' };
    } catch (e) {
      return { ok: false, error: 'Email o contraseña incorrectos' };
    }
  }

  async function exitAdminMode() {
    const { authMod: A, auth } = fs;
    adminClaimOk = false;
    try { await A.signOut(auth); } catch (e) { /* noop */ }
    try { await A.signInAnonymously(auth); } catch (e) { /* noop */ }
    notify();
  }

  /* ---------- getters ---------- */
  const config = () => db.config;
  const staff = () => db.staff;
  const sesiones = () => [...db.sesiones].sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora));
  const sesion = (id) => db.sesiones.find((s) => s.id === id);
  const sesionActiva = () => db.sesiones.find((s) => s.estado === 'activa') || null;
  const inscripciones = () => [...db.inscripciones].sort((a, b) => a.apellidoOrden.localeCompare(b.apellidoOrden));
  const asistente = (id) => db.inscripciones.find((a) => a.id === id || a.qrCode === id);
  const checkins = () => db.checkins;
  const checkinsDeSesion = (sesId) => db.checkins.filter((c) => c.sesionId === sesId);
  const checkinsDeAsistente = (aId) => db.checkins.filter((c) => c.asistenteId === aId);

  /* ---------- lógica de negocio: faltas / riesgo (D11) ---------- */
  function maxFaltas() {
    const total = db.sesiones.length;
    return Math.floor(total * (1 - db.config.porcentajeMinimo));
  }
  function estadoAsistencia(aId) {
    const cerradas = db.sesiones.filter((s) => s.estado === 'cerrada');
    const asistidas = new Set(checkinsDeAsistente(aId).map((c) => c.sesionId));
    const faltas = cerradas.filter((s) => !asistidas.has(s.id)).length;
    const max = maxFaltas();
    let nivel = 'ok';
    if (faltas > max) nivel = 'critico';
    else if (faltas === max) nivel = 'riesgo';
    return { faltas, max, nivel, asistidas: asistidas.size, cerradas: cerradas.length };
  }
  function asistentesEnRiesgo() {
    return db.inscripciones
      .filter((a) => a.estado === 'confirmado')
      .map((a) => ({ ...a, ...estadoAsistencia(a.id) }))
      .filter((a) => a.nivel !== 'ok')
      .sort((x, y) => y.faltas - x.faltas);
  }

  /* ---------- conexión ---------- */
  let simOffline = false;
  const setSimOffline = (v) => { simOffline = v; notify(); };
  const isOnline = () => navigator.onLine && !simOffline;
  const isSimOffline = () => simOffline;
  const getQueue = () => db.checkins.filter((c) => c.pendienteSync);
  function syncQueue() {
    return { synced: getQueue().length, pending: 0 };
  }

  /**
   * Registra un check-in. Devuelve {status, asistente, mensaje}.
   * status: ok | duplicado | pendiente | no_encontrado | sin_sesion | offline_ok
   * Escritura optimista contra Firestore (persistentLocalCache encola sola
   * si no hay red) — no se espera el roundtrip al servidor.
   */
  function checkin(codigo, metodo) {
    const ses = sesionActiva();
    if (!ses) return { status: 'sin_sesion', mensaje: 'No hay ninguna media ponencia activa' };
    const a = asistente(String(codigo).trim().toUpperCase());
    if (!a) return { status: 'no_encontrado', mensaje: `Código "${codigo}" no corresponde a ningún inscrito` };
    if (a.estado !== 'confirmado') return { status: 'pendiente', asistente: a, mensaje: 'Inscripción sin confirmar (pago pendiente)' };

    const dup = db.checkins.some((c) => c.sesionId === ses.id && c.asistenteId === a.id);
    if (dup) return { status: 'duplicado', asistente: a, mensaje: 'Ya tiene registrada esta media ponencia' };

    const { firestoreMod: F, firestore } = fs;
    F.addDoc(F.collection(firestore, 'checkins'), {
      sesionId: ses.id,
      asistenteId: a.id,
      staffUsername: currentUser() ? currentUser().username : '?',
      metodo: metodo || 'qr',
      timestamp: F.serverTimestamp()
    }).catch(() => {});

    if (!isOnline()) {
      return { status: 'offline_ok', asistente: a, mensaje: 'Guardado sin conexión — se sincronizará' };
    }
    return { status: 'ok', asistente: a, mensaje: 'Asistencia registrada' };
  }

  /* ---------- gestión (admin) ---------- */
  function setEstadoSesion(id, estado) {
    const { firestoreMod: F, firestore } = fs;
    const batch = F.writeBatch(firestore);
    if (estado === 'activa') {
      db.sesiones.forEach((s) => {
        if (s.estado === 'activa' && s.id !== id) batch.update(F.doc(firestore, 'sesiones', s.id), { estado: 'cerrada' });
      });
    }
    batch.update(F.doc(firestore, 'sesiones', id), { estado });
    batch.commit().catch(() => {});
  }
  function setCapacidadSesion(id, cap) {
    const { firestoreMod: F, firestore } = fs;
    F.updateDoc(F.doc(firestore, 'sesiones', id), { capacidad: cap }).catch(() => {});
  }

  /** Incremento atómico real de config.contadorId + creación del documento. */
  async function addAsistente(datos) {
    const { firestoreMod: F, firestore } = fs;
    const conCena = !!(datos.menuCena && datos.menuCena.trim());
    const configRef = F.doc(firestore, 'config', 'general');
    const nuevoId = await F.runTransaction(firestore, async (tx) => {
      const snap = await tx.get(configRef);
      const cfg = snap.data();
      const contador = (cfg.contadorId || 0) + 1;
      const id = cfg.prefijoId + String(contador).padStart(4, '0');
      tx.update(configRef, { contadorId: contador });
      tx.set(F.doc(firestore, 'inscripciones', id), {
        nombre: datos.nombre || '',
        apellidos: datos.apellidos || '',
        apellidoOrden: (datos.apellidos || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(),
        fechaNacimiento: datos.fechaNacimiento || '',
        gradoActividades: datos.gradoActividades || '',
        menuCena: datos.menuCena || '',
        dni: datos.dni || '',
        email: datos.email || '',
        alergias: datos.alergias || '',
        modalidad: conCena ? 'curso_cena' : 'solo_curso',
        precio: conCena ? 90 : 65,
        estado: datos.estado || 'pendiente',
        tsInscripcion: F.serverTimestamp(),
        tsConfirmacion: null,
        qrCode: id
      });
      return id;
    });
    return { id: nuevoId };
  }
  function setEstadoAsistente(id, estado) {
    const { firestoreMod: F, firestore } = fs;
    const patch = { estado };
    if (estado === 'confirmado') patch.tsConfirmacion = F.serverTimestamp();
    F.updateDoc(F.doc(firestore, 'inscripciones', id), patch).catch(() => {});
  }
  function addStaff(username, nombreCompleto, departamento) {
    if (db.staff.some((s) => s.username === username)) return false;
    const { firestoreMod: F, firestore } = fs;
    F.setDoc(F.doc(firestore, 'staff', username), { nombreCompleto, departamento, activo: true, cuentaAdmin: null }).catch(() => {});
    return true;
  }
  function toggleStaff(username) {
    const s = db.staff.find((x) => x.username === username);
    if (!s) return;
    const { firestoreMod: F, firestore } = fs;
    F.updateDoc(F.doc(firestore, 'staff', username), { activo: !s.activo }).catch(() => {});
  }

  /* ---------- import (Excel/CSV) ---------- */
  /** filas = array de objetos ya mapeados {nombre, apellidos, ...}. Devuelve nº creados. */
  async function importAsistentes(filas) {
    let n = 0;
    for (const f of filas) {
      if (!f.nombre && !f.apellidos) continue;
      if (f.email && db.inscripciones.some((a) => a.email === f.email)) continue;
      if (f.dni && db.inscripciones.some((a) => a.dni === f.dni)) continue;
      await addAsistente(f);
      n++;
    }
    return n;
  }

  /* ---------- export ---------- */
  function csvEscape(v) {
    v = v == null ? '' : String(v);
    return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCSV(headers, rows) {
    return [headers.join(';'), ...rows.map((r) => r.map(csvEscape).join(';'))].join('\n');
  }
  function informeAsistencia() {
    const cerradas = db.sesiones.filter((s) => s.estado !== 'planificada');
    const headers = ['ID', 'Apellidos', 'Nombre', 'Estado', ...cerradas.map((s) => s.id), 'Asistidas', 'Faltas', 'Título'];
    const rows = inscripciones().map((a) => {
      const asistidas = new Set(checkinsDeAsistente(a.id).map((c) => c.sesionId));
      const est = estadoAsistencia(a.id);
      return [
        a.id, a.apellidos, a.nombre, a.estado,
        ...cerradas.map((s) => (asistidas.has(s.id) ? 'SÍ' : '—')),
        est.asistidas, est.faltas,
        est.nivel === 'critico' ? 'PERDIDO' : est.nivel === 'riesgo' ? 'EN RIESGO' : 'OK'
      ];
    });
    return toCSV(headers, rows);
  }
  function informeSesion(sesId) {
    const cks = checkinsDeSesion(sesId);
    const headers = ['ID', 'Apellidos', 'Nombre', 'Hora', 'Método', 'Escaneado por'];
    const rows = cks.map((c) => {
      const a = asistente(c.asistenteId) || {};
      return [c.asistenteId, a.apellidos || '?', a.nombre || '?', (c.timestamp || '').slice(11, 16), c.metodo, c.staffUsername];
    });
    return toCSV(headers, rows);
  }
  function descargarCSV(nombre, contenido) {
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return {
    ready, onChange,
    login, logout, currentUser, isInformatica,
    isAdminAuthenticated, adminLogin, exitAdminMode,
    config, staff, sesiones, sesion, sesionActiva, inscripciones, asistente,
    checkins, checkinsDeSesion, checkinsDeAsistente,
    maxFaltas, estadoAsistencia, asistentesEnRiesgo,
    checkin, getQueue, syncQueue, isOnline, setSimOffline, isSimOffline,
    setEstadoSesion, setCapacidadSesion, addAsistente, setEstadoAsistente, addStaff, toggleStaff,
    importAsistentes, informeAsistencia, informeSesion, descargarCSV
  };
})();
