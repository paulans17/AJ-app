/* ============================================================
   Staff AJapp — VISTAS
   Login (sin contraseña) + 2 pantallas (D14): Escanear · Estadísticas.
   Sin Sesiones/Admin — la sesión activa y el roster se gestionan a mano
   en la hoja (D15). Réplica visual de ScanView.swift / DashboardView.swift.
   ============================================================ */

const Views = (() => {
  const $ = (sel) => document.querySelector(sel);
  const view = () => $('#view');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iniciales = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  // Iconos inline estilo SF Symbols
  const ICO = {
    qr: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><rect x="7.5" y="7.5" width="3.4" height="3.4" rx="0.6"/><rect x="13.1" y="7.5" width="3.4" height="3.4" rx="0.6"/><rect x="7.5" y="13.1" width="3.4" height="3.4" rx="0.6"/><path d="M13.5 13.5h1.4M15.8 15.8h.7M13.5 16.2v-1.2"/></svg>`,
    keyboard: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6 13.5h.01M9.5 13.5h.01M13 13.5h.01M16.5 13.5h.01M8 16h8" stroke-width="2"/></svg>`
  };

  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.className = ''), 2600);
  }

  /* ============================================================
     LOGIN — sin contraseña, lista fija en el código (ver js/store.js)
     ============================================================ */
  function vLogin() {
    view().innerHTML = `
      <div class="login-wrap">
        <div class="login-logo">♗</div>
        <h1>Staff AJapp</h1>
        <p class="login-sub">Curso de Protocolo<br>Elige tu nombre — sin contraseña</p>
        ${Store.staff().map((nombre) => `
          <button class="staff-item" data-login="${esc(nombre)}">
            <span class="avatar">${iniciales(nombre)}</span>
            <span class="meta">${esc(nombre)}</span>
          </button>`).join('')}
        <p class="muted" style="margin-top:12px">Solo identifica quién ha abierto la app en este móvil.</p>
      </div>`;
    view().querySelectorAll('[data-login]').forEach((b) =>
      b.addEventListener('click', () => {
        const nombre = Store.login(b.dataset.login);
        if (nombre) { toast(`Hola, ${nombre}`); App.go('escanear'); }
      })
    );
  }

  /* ============================================================
     RESULTADO — réplica de CheckinResultView.swift
     Pantalla completa verde/naranja/roja, autocierre a los 1,5 s
     ============================================================ */
  function mostrarResultado(r) {
    quitarResultado();
    let tipo = 'error', icono = '✕', titulo = 'Error';
    if (r.status === 'ok' || r.status === 'offline_ok') { tipo = 'success'; icono = '✓'; titulo = r.status === 'offline_ok' ? 'Guardado sin conexión' : 'Registrado'; }
    else if (r.status === 'duplicado') { tipo = 'duplicate'; icono = '!'; titulo = 'Ya registrado'; }
    else if (r.status === 'no_encontrado') { tipo = 'error'; icono = '✕'; titulo = 'Número no encontrado'; }
    else if (r.status === 'sin_sesion') { tipo = 'error'; icono = '✕'; titulo = 'Sin sesión activa'; }

    const num = r.num || '---';

    const div = document.createElement('div');
    div.id = 'result-cover';
    div.className = tipo;
    div.innerHTML = `
      <div class="r-icon">${icono}</div>
      <div class="r-num">${esc(num)}</div>
      <div class="r-title">${esc(titulo)}</div>
      ${r.mensaje ? `<div class="r-sub">${esc(r.mensaje)}</div>` : ''}`;
    div.addEventListener('click', quitarResultado);
    document.body.appendChild(div);
    if (navigator.vibrate) navigator.vibrate(tipo === 'success' ? 80 : [60, 60, 60]);
    div._h = setTimeout(quitarResultado, 1500);
    actualizarChips();
  }
  function quitarResultado() {
    const d = $('#result-cover');
    if (d) { clearTimeout(d._h); d.remove(); }
  }

  /* ============================================================
     ESCANEAR — réplica de ScanView.swift
     ============================================================ */
  function vEscanear() {
    Scanner.stop();
    const cola = Store.getQueue();
    view().innerHTML = `
      <div class="scan-screen">
        <div class="scan-header">
          <div class="gold-caption">Staff AJapp</div>
          <div class="session-name">Curso de Protocolo</div>
        </div>

        <button class="scan-circle" id="btn-cam">
          <span class="inner">${ICO.qr}<span>Escanear</span></span>
        </button>

        <div class="scan-hint">
          <div class="h1">Escanea el QR de la acreditación</div>
          <div class="h2">Pulsa el círculo para abrir la cámara</div>
          <button class="btn-plain btn-sm" id="btn-sim" style="margin-top:6px">Simular escaneo (dev)</button>
        </div>

        <div class="scan-bottom">
          <button class="btn-outline btn-block" id="btn-manual-sheet">${ICO.keyboard} Registro Manual por Número</button>
          <div class="card" style="margin-top:14px;margin-bottom:0">
            <div class="queue-row">
              <span class="pill ${Store.isOnline() ? 'pill-ok' : 'pill-off'}">${Store.isOnline() ? '● en línea' : '○ sin conexión'}</span>
              <span class="muted">${cola.length} en cola</span>
              <button class="btn-sm btn-outline" id="btn-toggle-off">${Store.isSimOffline() ? 'Recuperar cobertura' : 'Simular sin cobertura'}</button>
            </div>
            ${cola.length ? `<button class="btn-gold btn-block btn-sm" id="btn-sync" style="margin-top:10px" ${Store.isOnline() ? '' : 'disabled'}>⇅ Sincronizar ${cola.length} check-ins</button>` : ''}
          </div>
        </div>
      </div>`;

    const procesa = async (codigo) => {
      const r = await Store.checkin(codigo);
      mostrarResultado(r);
      if (r.status === 'offline_ok') setTimeout(() => vEscanear(), 1550);
    };

    $('#btn-cam').addEventListener('click', () => abrirCamara(procesa));

    $('#btn-sim').addEventListener('click', () => {
      const num = String(1 + Math.floor(Math.random() * 50));
      procesa(num);
    });

    $('#btn-manual-sheet').addEventListener('click', () => abrirSheetManual(procesa));

    $('#btn-toggle-off').addEventListener('click', async () => {
      Store.setSimOffline(!Store.isSimOffline());
      if (!Store.isSimOffline() && Store.getQueue().length) {
        const r = await Store.syncQueue();
        if (r.synced) toast(`⇅ ${r.synced} check-ins sincronizados`);
      } else {
        toast(Store.isSimOffline() ? 'Modo sin cobertura activado' : 'Cobertura recuperada');
      }
      vEscanear();
    });
    const bs = $('#btn-sync');
    if (bs) bs.addEventListener('click', async () => {
      const r = await Store.syncQueue();
      toast(r.synced ? `⇅ ${r.synced} check-ins sincronizados` : 'Nada que sincronizar');
      vEscanear();
    });
  }

  /* Cámara a pantalla completa (fullScreenCover de iOS) */
  async function abrirCamara(onCode) {
    cerrarCamara();
    const div = document.createElement('div');
    div.id = 'cam-cover';
    div.innerHTML = `
      <video id="cam" muted playsinline></video>
      <div class="cam-frame"></div>
      <div class="cam-label">Apunta al QR de la acreditación</div>
      <button class="cam-close" id="cam-close">✕</button>`;
    document.body.appendChild(div);
    $('#cam-close').addEventListener('click', cerrarCamara);
    const res = await Scanner.start($('#cam'), (code) => {
      cerrarCamara();
      onCode(code);
    });
    if (!res.ok) {
      cerrarCamara();
      toast(res.error, true);
    }
  }
  function cerrarCamara() {
    Scanner.stop();
    const d = $('#cam-cover');
    if (d) d.remove();
  }

  /* Hoja inferior — réplica de ManualCheckinView.swift */
  function abrirSheetManual(onCode) {
    cerrarSheet();
    const bg = document.createElement('div');
    bg.id = 'sheet-bg';
    bg.className = 'sheet-bg';
    bg.innerHTML = `
      <div class="sheet">
        <div class="grabber"></div>
        <button class="sheet-close" id="sheet-close">✕</button>
        <h2>Registro Manual</h2>
        <p class="sheet-sub">Introduce el número del asistente</p>
        <input class="big-num" id="manual-num" placeholder="0" inputmode="numeric" autocomplete="off" maxlength="6">
        <div class="err-msg" id="manual-err"></div>
        <button class="btn-gold btn-block" id="manual-ok">Confirmar Registro</button>
        <button class="btn-plain btn-block" id="manual-cancel">Cancelar</button>
      </div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg) cerrarSheet(); });
    document.body.appendChild(bg);
    const inp = $('#manual-num');
    inp.focus();
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); });
    const confirmar = () => {
      const v = inp.value.trim();
      if (!v) { $('#manual-err').textContent = 'Introduce un número válido'; return; }
      cerrarSheet();
      onCode(v);
    };
    $('#manual-ok').addEventListener('click', confirmar);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmar(); });
    $('#manual-cancel').addEventListener('click', cerrarSheet);
    $('#sheet-close').addEventListener('click', cerrarSheet);
  }
  function cerrarSheet() { const s = $('#sheet-bg'); if (s) s.remove(); }

  /* ============================================================
     ESTADÍSTICAS — réplica de DashboardView.swift, por polling (D22)
     contra el Web App de solo lectura separado — Sheets no empuja
     cambios en vivo (ver docs/FLOWS.md §3)
     ============================================================ */
  let pollTimer = null;
  function pararPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  async function vEstadisticas() {
    pararPolling();
    view().innerHTML = `
      <div class="title-kicker">Estadísticas</div>
      <div class="big-title" style="margin-bottom:20px">En vivo</div>
      <div id="stats-body"><p class="muted">Cargando…</p></div>`;

    const cargar = async () => {
      const body = $('#stats-body');
      if (!body) return; // ya no estamos en esta vista
      try {
        const s = await Store.stats();
        const tasa = Number(s.tasa) || 0;
        body.innerHTML = `
          <div class="card border-mid">
            <div class="gold-caption" style="margin-bottom:8px">Sesión en curso</div>
            <div style="font-size:20px;font-weight:700">${esc(s.session || 'No hay sesión activa')}</div>
          </div>
          <div class="gold-card">
            <div class="gc-title">TOTAL REGISTRADOS</div>
            <div class="gc-num">${s.registrados || 0}</div>
            <div class="gc-sub">de ${s.total || 0} asistentes</div>
          </div>
          <div class="card">
            <div class="rate-row">
              <span class="rt">Tasa de Asistencia</span>
              <span class="rv">${tasa.toFixed(1)}%</span>
            </div>
            <div class="progress"><div style="width:${tasa}%"></div></div>
          </div>`;
      } catch (e) {
        body.innerHTML = `<p class="muted">No se pudo conectar con la hoja. Reintentando…</p>`;
      }
    };

    await cargar();
    pollTimer = setInterval(cargar, 7000);
  }

  return { vLogin, vEscanear, vEstadisticas, toast, pararPolling, cerrarCamara, cerrarSheet, quitarResultado };
})();
