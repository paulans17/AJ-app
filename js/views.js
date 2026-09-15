/* ============================================================
   Staff AJapp — VISTAS
   2 pantallas (D14/D28): Escanear · Estadísticas. Sin login ni roster de
   staff (D28) — no importa quién escanea. Sin Sesiones/Admin — la sesión
   activa se gestiona a mano en la hoja (D15). Réplica visual de
   ScanView.swift / DashboardView.swift.
   ============================================================ */

const Views = (() => {
  const $ = (sel) => document.querySelector(sel);
  const view = () => $('#view');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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

  /** Mensaje consistente tras sincronizar la cola offline (ver Store.syncQueue). */
  function toastSync(r) {
    if (r.synced && r.failed) toast(`⇅ ${r.synced} sincronizados, ${r.failed} no se pudieron registrar — revisa la hoja`, true);
    else if (r.synced) toast(`⇅ ${r.synced} check-ins sincronizados`);
    else if (r.failed) toast(`⚠ ${r.failed} check-ins no se pudieron registrar — revisa la hoja`, true);
    else toast('Nada que sincronizar');
  }

  /* ============================================================
     CARGANDO — overlay bloqueante mientras se resuelve el check-in
     (fetch al Web App). Sin él, la app parecía "no estática": el
     usuario podía tocar otra vez el círculo, la cámara o la tab bar
     mientras la petición seguía en vuelo.
     ============================================================ */
  function mostrarCargando() {
    quitarCargando();
    const div = document.createElement('div');
    div.id = 'loading-cover';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.innerHTML = `<div class="spinner" aria-hidden="true"></div><span class="loading-label">Registrando…</span>`;
    document.body.appendChild(div);
  }
  function quitarCargando() {
    const d = $('#loading-cover');
    if (d) d.remove();
  }

  /* ============================================================
     RESULTADO — réplica de CheckinResultView.swift
     Pantalla completa verde/naranja/roja, autocierre a los 2 s
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
    div._h = setTimeout(quitarResultado, 2000);
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
    view().innerHTML = `
      <div class="scan-screen">
        <div class="scan-header">
          <div class="gold-caption">Registro de Asistencias</div>
          <div class="session-name">Curso de Protocolo</div>
        </div>

        <div class="scan-middle">
          <button class="scan-circle" id="btn-cam">
            <span class="inner">${ICO.qr}<span>Escanear</span></span>
          </button>

          <div class="scan-hint">
            <div class="h1">Escanea el QR de la acreditación</div>
            <div class="h2">Pulsa el círculo para abrir la cámara</div>
          </div>
        </div>

        <div class="scan-bottom">
          <button class="btn-outline btn-block" id="btn-manual-sheet">${ICO.keyboard} Registro Manual por Número</button>
        </div>
      </div>`;

    const procesa = async (codigo) => {
      mostrarCargando();
      const r = await Store.checkin(codigo);
      quitarCargando();
      mostrarResultado(r);
      if (r.status === 'offline_ok') setTimeout(() => vEscanear(), 2050);
    };

    $('#btn-cam').addEventListener('click', () => abrirCamara(procesa));

    $('#btn-manual-sheet').addEventListener('click', () => abrirSheetManual(procesa));
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
      <button class="cam-close" id="cam-close" aria-label="Cerrar cámara">✕</button>`;
    document.body.appendChild(div);
    $('#cam-close').addEventListener('click', cerrarCamara);
    const res = await Scanner.start($('#cam'), (code) => {
      cerrarCamara();
      onCode(code);
    });
    if (!res.ok) {
      cerrarCamara();
      toast(res.error, true);
    } else {
      // Diagnóstico visible: qué motor de escaneo se está usando de verdad
      // en este móvil, sin necesitar consola remota.
      const lbl = $('.cam-label');
      if (lbl) lbl.textContent = `Apunta al QR de la acreditación · ${res.motor}`;
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
        <button class="sheet-close" id="sheet-close" aria-label="Cerrar">✕</button>
        <h2>Registro Manual</h2>
        <label for="manual-num" class="sheet-sub" style="text-transform:none;font-size:15px">Introduce el número del asistente</label>
        <input class="big-num" id="manual-num" placeholder="0" inputmode="numeric" autocomplete="off" maxlength="6" aria-describedby="manual-err">
        <div class="err-msg" id="manual-err" role="alert" aria-live="assertive"></div>
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
  let pollEnVuelo = false;
  function pararPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } pollEnVuelo = false; }

  /** HTML de las tarjetas de Estadísticas. esCache=true añade un aviso de
   * que es el último dato conocido, no el actual. */
  function pintarStats(s, esCache) {
    const tasa = Number(s.tasa) || 0;
    const anchoBarra = Math.max(0, Math.min(100, tasa)); // la tasa real puede salirse de 0-100 si la hoja tiene datos inconsistentes; el ancho visual no
    return `
      ${esCache ? '<p class="muted" style="margin-bottom:10px">Último dato conocido — actualizando…</p>' : ''}
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
        <div class="progress"><div style="width:${anchoBarra}%"></div></div>
      </div>`;
  }

  async function vEstadisticas() {
    pararPolling();
    // Pinta el último dato conocido al instante en vez de un "Cargando…" a
    // pantalla vacía — Apps Script tarda varios segundos (D22, medido
    // 3-9s), y sin esto la pantalla se siente rota cada vez que se abre.
    const cache = Store.cachedStats();
    view().innerHTML = `
      <div class="title-kicker">Estadísticas</div>
      <div class="big-title" style="margin-bottom:20px">En vivo</div>
      <div id="stats-body">${cache ? pintarStats(cache, true) : '<p class="muted">Cargando… (Apps Script puede tardar unos segundos)</p>'}</div>`;

    const cargar = async () => {
      // Apps Script puede tardar más que los 7s del intervalo (visto hasta
      // 6-12s en real) — sin esta guarda, cada tick lanzaba una petición
      // nueva encima de la anterior sin terminar, y se amontonaban.
      if (pollEnVuelo) return;
      pollEnVuelo = true;
      const body = $('#stats-body');
      if (!body) { pollEnVuelo = false; return; } // ya no estamos en esta vista
      try {
        const s = await Store.stats();
        body.innerHTML = pintarStats(s, false);
      } catch (e) {
        // Si ya había datos en pantalla (de caché o de una carga anterior),
        // se dejan tal cual en vez de taparlos con un mensaje de error por
        // un fallo puntual de un solo tick de polling.
        if (!Store.cachedStats()) body.innerHTML = `<p class="muted">No se pudo conectar con la hoja. Reintentando…</p>`;
      } finally {
        pollEnVuelo = false;
      }
    };

    await cargar();
    pollTimer = setInterval(cargar, 7000);
  }

  return { vEscanear, vEstadisticas, toast, toastSync, pararPolling, cerrarCamara, cerrarSheet, quitarResultado, quitarCargando };
})();
