/* ============================================================
   Staff AJapp — CAPA DE DATOS (modo demo)
   En la versión real, este archivo es el ÚNICO que cambia:
   cada función pasa a leer/escribir en Firestore
   (prueba-protocolo2627) en vez de en localStorage.
   ============================================================ */

const Store = (() => {
  const KEY = 'ajapp-demo-v2';
  const KEY_QUEUE = 'ajapp-demo-cola';
  const KEY_SESSION = 'ajapp-demo-login';
  let db = null;
  const listeners = [];

  /* ---------- persistencia ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) { db = null; }
    if (!db) reset();
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
    listeners.forEach((fn) => fn());
  }
  function reset() {
    db = JSON.parse(JSON.stringify(DEMO)); // copia limpia del seed
    localStorage.setItem(KEY, JSON.stringify(db));
    localStorage.removeItem(KEY_QUEUE);
    listeners.forEach((fn) => fn());
  }
  function onChange(fn) { listeners.push(fn); }

  /* ---------- login (solo usuario, sin contraseña) ---------- */
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

  /* ---------- lógica de negocio: faltas / riesgo ----------
     Título ECTS = asistir al menos al 80% de las 14 medias ponencias
     → con 14 sesiones, un máximo de 2 faltas. 3 faltas = título perdido. */
  function maxFaltas() {
    const total = db.sesiones.length;
    return Math.floor(total * (1 - db.config.porcentajeMinimo)); // 14 → 2
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

  /* ---------- check-in (con cola offline) ---------- */
  function getQueue() {
    try { return JSON.parse(localStorage.getItem(KEY_QUEUE)) || []; } catch (e) { return []; }
  }
  function setQueue(q) {
    localStorage.setItem(KEY_QUEUE, JSON.stringify(q));
    listeners.forEach((fn) => fn());
  }

  // Simulación de cobertura: en la demo se puede forzar el modo sin conexión
  let simOffline = false;
  const setSimOffline = (v) => { simOffline = v; listeners.forEach((fn) => fn()); };
  const isOnline = () => navigator.onLine && !simOffline;
  const isSimOffline = () => simOffline;

  /**
   * Registra un check-in. Devuelve {status, asistente, mensaje}.
   * status: ok | duplicado | pendiente | no_encontrado | sin_sesion | offline_ok
   */
  function checkin(codigo, metodo) {
    const ses = sesionActiva();
    if (!ses) return { status: 'sin_sesion', mensaje: 'No hay ninguna media ponencia activa' };
    const a = asistente(String(codigo).trim().toUpperCase());
    if (!a) return { status: 'no_encontrado', mensaje: `Código "${codigo}" no corresponde a ningún inscrito` };
    if (a.estado !== 'confirmado') return { status: 'pendiente', asistente: a, mensaje: 'Inscripción sin confirmar (pago pendiente)' };

    // duplicado: ya en la base o ya en la cola offline
    const dup = db.checkins.some((c) => c.sesionId === ses.id && c.asistenteId === a.id) ||
                getQueue().some((c) => c.sesionId === ses.id && c.asistenteId === a.id);
    if (dup) return { status: 'duplicado', asistente: a, mensaje: 'Ya tiene registrada esta media ponencia' };

    const doc = {
      id: 'ck' + Date.now() + Math.floor(Math.random() * 999),
      sesionId: ses.id,
      asistenteId: a.id,
      staffUsername: currentUser() ? currentUser().username : '?',
      metodo: metodo || 'qr',
      timestamp: new Date().toISOString()
    };

    if (!isOnline()) {
      // SIN COBERTURA → a la cola local, se sincroniza al volver la conexión
      const q = getQueue(); q.push(doc); setQueue(q);
      return { status: 'offline_ok', asistente: a, mensaje: 'Guardado sin conexión — se sincronizará' };
    }
    db.checkins.push(doc);
    const s = sesion(ses.id); s.asistentesRegistrados++;
    save();
    return { status: 'ok', asistente: a, mensaje: 'Asistencia registrada' };
  }

  /** Vuelca la cola offline a la base (en real: batch write a Firestore) */
  function syncQueue() {
    if (!isOnline()) return { synced: 0, pending: getQueue().length };
    const q = getQueue();
    let n = 0;
    q.forEach((doc) => {
      const dup = db.checkins.some((c) => c.sesionId === doc.sesionId && c.asistenteId === doc.asistenteId);
      if (!dup) {
        db.checkins.push(doc);
        const s = sesion(doc.sesionId); if (s) s.asistentesRegistrados++;
        n++;
      }
    });
    setQueue([]);
    save();
    return { synced: n, pending: 0 };
  }

  /**
   * SOLO DEMO: simula que otro miembro del staff (otro móvil) escanea a alguien
   * en la sesión activa — para enseñar el dashboard "en vivo" en la presentación.
   * Devuelve el asistente escaneado o null si ya no queda nadie por entrar.
   */
  function simulateExternalCheckin() {
    const ses = sesionActiva();
    if (!ses) return null;
    const dentro = new Set(checkinsDeSesion(ses.id).map((c) => c.asistenteId));
    const fuera = db.inscripciones.filter((a) => a.estado === 'confirmado' && !dentro.has(a.id));
    if (!fuera.length) return null;
    const a = fuera[Math.floor(Math.random() * fuera.length)];
    const otros = db.staff.filter((s) => s.activo && (!currentUser() || s.username !== currentUser().username));
    const quien = otros[Math.floor(Math.random() * otros.length)];
    db.checkins.push({
      id: 'ck' + Date.now() + Math.floor(Math.random() * 999),
      sesionId: ses.id,
      asistenteId: a.id,
      staffUsername: quien ? quien.username : '?',
      metodo: 'qr',
      timestamp: new Date().toISOString()
    });
    sesion(ses.id).asistentesRegistrados++;
    save();
    return a;
  }

  /* ---------- gestión (admin) ---------- */
  function setEstadoSesion(id, estado) {
    if (estado === 'activa') db.sesiones.forEach((s) => { if (s.estado === 'activa') s.estado = 'cerrada'; });
    const s = sesion(id); if (s) s.estado = estado;
    save();
  }
  function setCapacidadSesion(id, cap) { const s = sesion(id); if (s) s.capacidad = cap; save(); }

  function nuevoIdInscripcion() {
    // En real: incremento atómico de config.contadorId en Firestore (transaction / field transform)
    db.config.contadorId++;
    return db.config.prefijoId + String(db.config.contadorId).padStart(4, '0');
  }
  function addAsistente(datos) {
    const id = nuevoIdInscripcion();
    const conCena = !!(datos.menuCena && datos.menuCena.trim());
    const a = {
      id,
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
      tsInscripcion: new Date().toISOString(),
      qrCode: id
    };
    db.inscripciones.push(a);
    save();
    return a;
  }
  function setEstadoAsistente(id, estado) {
    const a = asistente(id); if (a) { a.estado = estado; if (estado === 'confirmado') a.tsConfirmacion = new Date().toISOString(); }
    save();
  }
  function addStaff(username, nombreCompleto, departamento) {
    if (db.staff.some((s) => s.username === username)) return false;
    db.staff.push({ username, nombreCompleto, departamento, activo: true });
    save();
    return true;
  }
  function toggleStaff(username) {
    const s = db.staff.find((x) => x.username === username);
    if (s) s.activo = !s.activo;
    save();
  }

  /* ---------- import (Excel/CSV) ---------- */
  /** filas = array de objetos ya mapeados {nombre, apellidos, ...}. Devuelve nº creados. */
  function importAsistentes(filas) {
    let n = 0;
    filas.forEach((f) => {
      if (!f.nombre && !f.apellidos) return;
      // evita duplicar por email o dni si ya existe
      if (f.email && db.inscripciones.some((a) => a.email === f.email)) return;
      if (f.dni && db.inscripciones.some((a) => a.dni === f.dni)) return;
      addAsistente(f);
      n++;
    });
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

  load();
  return {
    reset, onChange, save,
    login, logout, currentUser, isInformatica,
    config, staff, sesiones, sesion, sesionActiva, inscripciones, asistente,
    checkins, checkinsDeSesion, checkinsDeAsistente,
    maxFaltas, estadoAsistencia, asistentesEnRiesgo,
    checkin, getQueue, syncQueue, isOnline, setSimOffline, isSimOffline, simulateExternalCheckin,
    setEstadoSesion, setCapacidadSesion, addAsistente, setEstadoAsistente, addStaff, toggleStaff,
    importAsistentes, informeAsistencia, informeSesion, descargarCSV
  };
})();
