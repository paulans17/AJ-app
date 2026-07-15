/* ============================================================
   Staff AJapp — VISTAS
   Réplica 1:1 de la interfaz de la app iOS (Staff AJapp/Views):
   ScanView · SessionsListView · DashboardView · CheckinResultView
   + Login y Admin (no existen en iOS, mismo lenguaje visual)
   ============================================================ */

const Views = (() => {
  const $ = (sel) => document.querySelector(sel);
  const view = () => $('#view');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DEPTOS = { informatica: 'Informática', presidencia: 'Presidencia', cuentas: 'Cuentas', comunicacion: 'Comunicación', redaccion: 'Redacción', diseno: 'Diseño' };
  const iniciales = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const qrURL = (texto, size) => `https://quickchart.io/qr?text=${encodeURIComponent(texto)}&size=${size || 200}&margin=2`;

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

  function modal(html) {
    cerrarModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.id = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}</div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg) cerrarModal(); });
    document.body.appendChild(bg);
  }
  function cerrarModal() { const m = $('#modal-bg'); if (m) m.remove(); }

  /* ============================================================
     RESULTADO — réplica de CheckinResultView.swift
     Pantalla completa verde/naranja/roja, autocierre a los 1,5 s
     ============================================================ */
  function mostrarResultado(r) {
    quitarResultado();
    let tipo = 'error', icono = '✕', titulo = r.mensaje || 'Error';
    if (r.status === 'ok' || r.status === 'offline_ok') { tipo = 'success'; icono = '✓'; titulo = r.status === 'offline_ok' ? 'Registrado (sin conexión)' : 'Acreditación Leída'; }
    else if (r.status === 'duplicado') { tipo = 'duplicate'; icono = '!'; titulo = 'Ya registrado'; }
    else if (r.status === 'pendiente') { tipo = 'error'; icono = '✕'; titulo = 'Inscripción sin confirmar'; }
    else if (r.status === 'no_encontrado') { tipo = 'error'; icono = '✕'; titulo = 'QR no asociado'; }
    else if (r.status === 'sin_sesion') { tipo = 'error'; icono = '✕'; titulo = 'No hay sesión activa'; }

    const num = r.asistente ? r.asistente.id.replace(Store.config().prefijoId, '') : '---';
    const sub = r.asistente ? `${r.asistente.nombre} ${r.asistente.apellidos} · ${r.asistente.id}` : '';

    const div = document.createElement('div');
    div.id = 'result-cover';
    div.className = tipo;
    div.innerHTML = `
      <div class="r-icon">${icono}</div>
      <div class="r-num">${esc(num)}</div>
      <div class="r-title">${esc(titulo)}</div>
      ${sub ? `<div class="r-sub">${esc(sub)}</div>` : ''}`;
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
     LOGIN (no existe en iOS — mismo lenguaje visual)
     ============================================================ */
  function vLogin() {
    const activos = Store.staff().filter((s) => s.activo);
    view().innerHTML = `
      <div class="login-wrap">
        <div class="login-logo">♗</div>
        <h1>Staff AJapp</h1>
        <p class="login-sub">${esc(Store.config().nombreEdicion)}<br>Elige tu usuario — sin contraseña</p>
        ${activos.map((s) => `
          <button class="staff-item" data-login="${esc(s.username)}">
            <span class="avatar">${iniciales(s.nombreCompleto)}</span>
            <span class="meta">${esc(s.nombreCompleto)}<small>@${esc(s.username)}</small></span>
            <span class="dep-tag">${DEPTOS[s.departamento] || s.departamento}</span>
          </button>`).join('')}
        <p class="muted" style="margin-top:12px">El login identifica quién escanea cada QR.</p>
      </div>`;
    view().querySelectorAll('[data-login]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = Store.login(b.dataset.login);
        if (s) { toast(`Hola, ${s.nombreCompleto.split(' ')[0]}`); App.go('escanear'); }
      })
    );
  }

  /* ============================================================
     ESCANEAR — réplica de ScanView.swift
     ============================================================ */
  function vEscanear() {
    Scanner.stop();
    const ses = Store.sesionActiva();
    const cola = Store.getQueue();
    view().innerHTML = `
      <div class="scan-screen">
        <div class="scan-header">
          <div class="gold-caption">Sesión activa</div>
          <div class="session-name">${ses ? esc(ses.nombre) : 'No hay sesión activa'}</div>
        </div>

        <button class="scan-circle" id="btn-cam" ${ses ? '' : 'disabled'}>
          <span class="inner">${ICO.qr}<span>Escanear</span></span>
        </button>

        <div class="scan-hint">
          <div class="h1">Escanea el QR de la acreditación</div>
          <div class="h2">Pulsa el círculo para abrir la cámara</div>
          <button class="btn-plain btn-sm" id="btn-sim" ${ses ? '' : 'disabled'} style="margin-top:6px">Simular escaneo (demo)</button>
        </div>

        <div class="scan-bottom">
          <button class="btn-outline btn-block" id="btn-manual-sheet" ${ses ? '' : 'disabled'}>${ICO.keyboard} Registro Manual por Número</button>
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

    const procesa = (codigo, metodo) => {
      const r = Store.checkin(codigo, metodo);
      mostrarResultado(r);
      if (r.status === 'offline_ok') setTimeout(() => vEscanear(), 1550);
    };

    $('#btn-cam').addEventListener('click', () => abrirCamara(procesa));

    $('#btn-sim').addEventListener('click', () => {
      const ses2 = Store.sesionActiva();
      if (!ses2) return;
      const dentro = new Set(Store.checkinsDeSesion(ses2.id).map((c) => c.asistenteId));
      const enCola = new Set(Store.getQueue().map((c) => c.asistenteId));
      const fuera = Store.inscripciones().filter((a) => a.estado === 'confirmado' && !dentro.has(a.id) && !enCola.has(a.id));
      const a = fuera.length ? fuera[Math.floor(Math.random() * fuera.length)] : Store.inscripciones()[0];
      procesa(a.qrCode, 'qr');
    });

    $('#btn-manual-sheet').addEventListener('click', () => abrirSheetManual(procesa));

    $('#btn-toggle-off').addEventListener('click', () => {
      Store.setSimOffline(!Store.isSimOffline());
      if (!Store.isSimOffline() && Store.getQueue().length) {
        const r = Store.syncQueue();
        if (r.synced) toast(`⇅ ${r.synced} check-ins sincronizados`);
      } else {
        toast(Store.isSimOffline() ? 'Modo sin cobertura activado' : 'Cobertura recuperada');
      }
      vEscanear();
    });
    const bs = $('#btn-sync');
    if (bs) bs.addEventListener('click', () => {
      const r = Store.syncQueue();
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
      onCode(code, 'qr');
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
        <input class="big-num" id="manual-num" placeholder="0000" inputmode="numeric" autocomplete="off" maxlength="4">
        <div class="err-msg" id="manual-err"></div>
        <button class="btn-gold btn-block" id="manual-ok">Confirmar Registro</button>
        <button class="btn-plain btn-block" id="manual-cancel">Cancelar</button>
      </div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg) cerrarSheet(); });
    document.body.appendChild(bg);
    const inp = $('#manual-num');
    inp.focus();
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); });
    const confirmar = () => {
      const v = inp.value.trim();
      if (!v) { $('#manual-err').textContent = 'Introduce un número válido'; return; }
      const codigo = Store.config().prefijoId + v.padStart(4, '0');
      if (!Store.asistente(codigo)) { $('#manual-err').textContent = `No existe el asistente ${codigo}`; return; }
      cerrarSheet();
      onCode(codigo, 'manual');
    };
    $('#manual-ok').addEventListener('click', confirmar);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmar(); });
    $('#manual-cancel').addEventListener('click', cerrarSheet);
    $('#sheet-close').addEventListener('click', cerrarSheet);
  }
  function cerrarSheet() { const s = $('#sheet-bg'); if (s) s.remove(); }

  /* ============================================================
     SESIONES — réplica de SessionsListView.swift
     ============================================================ */
  function vSesiones() {
    const admin = Store.isInformatica();
    const lista = Store.sesiones();
    view().innerHTML = `
      <div class="title-kicker">ALFIL JUVENIL 2026</div>
      <div class="big-title" style="margin-bottom:20px">Todas las Sesiones</div>
      ${lista.map((s) => {
        const st = s.estado === 'activa' ? ['activa', 'Activa'] : s.estado === 'cerrada' ? ['finalizada', 'Finalizada'] : ['noactiva', 'No activa'];
        const n = Store.checkinsDeSesion(s.id).length;
        return `
        <div class="session-card ${s.estado === 'activa' ? 'active' : ''}">
          <div class="sc-top">
            <span class="sc-time">${s.hora}</span>
            <span class="sc-status ${st[0]}">${st[1]}</span>
          </div>
          <div class="sc-name">${esc(s.nombre)}</div>
          <div class="sc-day">Día ${s.dia} · ${n} registrados</div>
          ${admin ? `
          <div class="sc-actions">
            ${s.estado !== 'activa'
              ? `<button class="btn-sm btn-outline" data-act="${s.id}">Activar</button>`
              : `<button class="btn-sm btn-danger-outline" data-cerrar="${s.id}">Cerrar sesión</button>`}
          </div>` : ''}
        </div>`;
      }).join('')}
      ${admin ? '<p class="muted">Al activar una sesión se cierra la anterior — solo puede haber una activa.</p>' : ''}`;

    view().querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      Store.setEstadoSesion(b.dataset.act, 'activa');
      toast('Sesión activada');
      vSesiones();
    }));
    view().querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => {
      Store.setEstadoSesion(b.dataset.cerrar, 'cerrada');
      toast('Sesión cerrada — sus faltas ya cuentan');
      vSesiones();
    }));
  }

  /* ============================================================
     DASHBOARD — réplica de DashboardView.swift
     ============================================================ */
  let liveTimer = null;
  function stopLive() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

  function vDashboard() {
    stopLive();
    const confirmados = Store.inscripciones().filter((a) => a.estado === 'confirmado');
    const ses = Store.sesionActiva();
    const presentes = ses ? Store.checkinsDeSesion(ses.id).length : 0;
    const ausentes = Math.max(0, confirmados.length - presentes);
    const tasa = confirmados.length ? (presentes / confirmados.length) * 100 : 0;
    const riesgo = Store.asistentesEnRiesgo();

    view().innerHTML = `
      <div class="title-kicker">Dashboard</div>
      <div class="big-title" style="margin-bottom:20px">Estadísticas</div>

      <div class="card border-mid">
        <div class="gold-caption" style="margin-bottom:8px">Sesión en curso</div>
        <div style="font-size:20px;font-weight:700">${ses ? esc(ses.nombre) : 'No hay sesión activa'}</div>
      </div>

      <div class="gold-card">
        <div class="gc-title">TOTAL REGISTRADOS</div>
        <div class="gc-num" id="live-num">${presentes}</div>
        <div class="gc-sub">de ${confirmados.length} asistentes</div>
      </div>

      <div class="card">
        <div class="rate-row">
          <span class="rt">Tasa de Asistencia</span>
          <span class="rv" id="live-pct">${tasa.toFixed(1)}%</span>
        </div>
        <div class="progress"><div id="live-bar" style="width:${tasa}%"></div></div>
      </div>

      <div class="mini-grid">
        <div class="mini-card"><div class="mc-title">Presentes</div><div class="mc-num green" id="live-pres">${presentes}</div></div>
        <div class="mini-card"><div class="mc-title">Ausentes</div><div class="mc-num white" id="live-aus">${ausentes}</div></div>
      </div>

      ${ses ? `<button class="btn-outline btn-block" id="btn-live" style="margin-bottom:16px">▶ Simular escaneos de otros móviles (demo)</button>` : ''}

      <div class="card">
        <div class="rate-row" style="margin-bottom:10px">
          <span class="rt">⚠ En riesgo de perder el título</span>
          <span class="rv" style="font-size:17px;color:${riesgo.length ? 'var(--warning)' : 'var(--success)'}">${riesgo.length}</span>
        </div>
        ${riesgo.length ? riesgo.map((a) => `
          <div class="risk-item">
            <span class="avatar" style="width:30px;height:30px;font-size:12px">${iniciales(a.nombre + ' ' + a.apellidos)}</span>
            <span>${esc(a.nombre)} ${esc(a.apellidos)}<br><small class="muted">${a.id} · ${a.asistidas}/${a.cerradas} asistidas</small></span>
            <span class="risk-badge ${a.nivel}">${a.faltas} faltas${a.nivel === 'critico' ? ' — perdido' : ''}</span>
          </div>`).join('') : '<div class="muted">Nadie en riesgo por ahora</div>'}
        <p class="muted" style="margin-top:10px">Mínimo ${Math.round(Store.config().porcentajeMinimo * 100)}% de asistencia — a la ${Store.maxFaltas() + 1}ª falta se pierde el título.</p>
      </div>`;

    const btnLive = $('#btn-live');
    if (btnLive) btnLive.addEventListener('click', () => {
      if (liveTimer) { stopLive(); btnLive.textContent = '▶ Simular escaneos de otros móviles (demo)'; return; }
      btnLive.textContent = '⏸ Parar simulación';
      liveTimer = setInterval(() => {
        const a = Store.simulateExternalCheckin();
        if (!a) { stopLive(); btnLive.textContent = '▶ Simular escaneos de otros móviles (demo)'; return; }
        const s2 = Store.sesionActiva();
        const n = Store.checkinsDeSesion(s2.id).length;
        const pct = confirmados.length ? (n / confirmados.length) * 100 : 0;
        const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
        set('#live-num', n); set('#live-pres', n);
        set('#live-aus', Math.max(0, confirmados.length - n));
        set('#live-pct', pct.toFixed(1) + '%');
        const bar = $('#live-bar'); if (bar) bar.style.width = pct + '%';
      }, 1800);
    });
  }

  /* ============================================================
     ADMIN (no existe en iOS — mismo lenguaje visual)
     ============================================================ */
  let adminTab = 'asistentes';
  let filtro = '';
  let importFilas = null;

  function vAdmin() {
    if (!Store.isInformatica()) { App.go('escanear'); return; }
    const tabs = [['asistentes', 'Asistentes'], ['importar', 'Importar'], ['informes', 'Informes'], ['staff', 'Equipo'], ['config', 'Config']];
    view().innerHTML = `
      <div class="title-kicker">Solo Informática / Presidencia</div>
      <div class="big-title" style="margin-bottom:20px">Admin</div>
      <div class="subtabs">${tabs.map(([id, t]) => `<button class="${adminTab === id ? 'on' : ''}" data-tab="${id}">${t}</button>`).join('')}</div>
      <div id="admin-body"></div>`;
    view().querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { adminTab = b.dataset.tab; vAdmin(); }));
    const body = $('#admin-body');
    ({ asistentes: aAsistentes, importar: aImportar, informes: aInformes, staff: aStaff, config: aConfig }[adminTab])(body);
  }

  /* ---- admin: asistentes ---- */
  function aAsistentes(el) {
    const lista = Store.inscripciones().filter((a) => {
      const t = (a.nombre + ' ' + a.apellidos + ' ' + a.id + ' ' + a.email).toLowerCase();
      return t.includes(filtro.toLowerCase());
    });
    el.innerHTML = `
      <input id="buscar" placeholder="Buscar por nombre, ID o email…" value="${esc(filtro)}">
      <div class="card tbl-scroll">
        <table class="tbl">
          <thead><tr><th>ID</th><th>Asistente</th><th>Modalidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${lista.map((a) => {
              const est = Store.estadoAsistencia(a.id);
              return `<tr>
                <td class="gold-txt">${a.id.replace(Store.config().prefijoId, '')}</td>
                <td>${esc(a.apellidos)}, ${esc(a.nombre)}${a.alergias ? ` <span title="Alergia: ${esc(a.alergias)}">⚠</span>` : ''}<br><small class="muted">${est.asistidas}/${est.cerradas} asistidas${est.nivel !== 'ok' ? ` · <span style="color:${est.nivel === 'critico' ? 'var(--error)' : 'var(--warning)'}">${est.faltas} faltas</span>` : ''}</small></td>
                <td>${a.modalidad === 'curso_cena' ? '🍽 90€' : '65€'}</td>
                <td><span class="tag ${a.estado}">${a.estado}</span></td>
                <td style="white-space:nowrap">
                  <button class="btn-sm btn-outline" data-qr="${a.id}">QR</button>
                  ${a.estado === 'pendiente' ? `<button class="btn-sm btn-outline" data-conf="${a.id}">✔</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="muted">${lista.length} de ${Store.inscripciones().length} inscritos · los QR son los de las acreditaciones impresas</p>
      <button class="btn-gold btn-block" id="btn-nuevo">+ Alta manual de asistente</button>`;

    $('#buscar').addEventListener('input', (e) => { filtro = e.target.value; aAsistentes(el); const v = $('#buscar'); v.focus(); v.setSelectionRange(v.value.length, v.value.length); });
    el.querySelectorAll('[data-qr]').forEach((b) => b.addEventListener('click', () => {
      const a = Store.asistente(b.dataset.qr);
      modal(`
        <h2>${esc(a.nombre)} ${esc(a.apellidos)}</h2>
        <p class="muted">${a.id} · ${a.estado}</p>
        <img class="qr" src="${qrURL(a.qrCode)}" alt="QR ${esc(a.id)}">
        <p class="muted" style="margin:10px 0">Es el QR de su acreditación — escanéalo con otro móvil para probar la app.</p>
        <button class="btn-outline btn-block" onclick="Views.cerrarModal()">Cerrar</button>`);
    }));
    el.querySelectorAll('[data-conf]').forEach((b) => b.addEventListener('click', () => {
      Store.setEstadoAsistente(b.dataset.conf, 'confirmado');
      toast('Inscripción confirmada');
      aAsistentes(el);
    }));
    $('#btn-nuevo').addEventListener('click', () => {
      modal(`
        <h2>Alta manual</h2>
        <label>Nombre</label><input id="f-nombre">
        <label>Apellidos</label><input id="f-apellidos">
        <label>Email</label><input id="f-email" type="email">
        <label>DNI</label><input id="f-dni">
        <label>Menú cena (vacío = solo curso)</label><input id="f-menu" placeholder="ej. Merluza en salsa verde">
        <button class="btn-gold btn-block" id="f-guardar">Crear (genera ID + QR)</button>`);
      $('#f-guardar').addEventListener('click', () => {
        const a = Store.addAsistente({
          nombre: $('#f-nombre').value, apellidos: $('#f-apellidos').value,
          email: $('#f-email').value, dni: $('#f-dni').value, menuCena: $('#f-menu').value,
          estado: 'confirmado'
        });
        cerrarModal();
        toast(`Creado ${a.id}`);
        aAsistentes(el);
      });
    });
  }

  /* ---- admin: importar ---- */
  function aImportar(el) {
    el.innerHTML = `
      <div class="card">
        <p style="margin-bottom:10px">Sube el <b>Excel/CSV de inscripciones</b>. La app mapea las columnas, crea los asistentes y les genera su ID <span class="gold-txt">${esc(Store.config().prefijoId)}XXXX</span> + QR.</p>
        <input type="file" id="file-imp" accept=".csv,.xlsx,.xls">
        <div id="imp-preview"></div>
      </div>
      <p class="muted">Columnas reconocidas: Nombre, Apellidos, FechaNacimiento, Grado/Actividades, MenuCena, DNI, Email, Alergias. Duplicados por DNI/email se omiten.</p>`;

    $('#file-imp').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      let filas = [];
      try {
        if (/\.(xlsx|xls)$/i.test(f.name)) {
          if (!window.XLSX) { toast('Librería Excel no cargada (¿sin conexión?) — usa CSV', true); return; }
          const buf = await f.arrayBuffer();
          const wb = XLSX.read(buf);
          filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        } else {
          filas = parseCSV(await f.text());
        }
      } catch (err) { toast('No se pudo leer el archivo: ' + err.message, true); return; }

      const mapeadas = filas.map(mapearFila).filter((x) => x.nombre || x.apellidos);
      importFilas = mapeadas;
      $('#imp-preview').innerHTML = `
        <hr class="sep">
        <p><b>${mapeadas.length}</b> filas válidas detectadas. Vista previa:</p>
        <div class="import-preview tbl-scroll">
          <table class="tbl"><thead><tr><th>Nombre</th><th>Apellidos</th><th>Email</th><th>Cena</th></tr></thead>
          <tbody>${mapeadas.slice(0, 8).map((x) => `<tr><td>${esc(x.nombre)}</td><td>${esc(x.apellidos)}</td><td>${esc(x.email)}</td><td>${x.menuCena ? 'Sí' : '—'}</td></tr>`).join('')}</tbody></table>
          ${mapeadas.length > 8 ? `<p class="muted">…y ${mapeadas.length - 8} más</p>` : ''}
        </div>
        <button class="btn-gold btn-block" id="btn-imp-ok" style="margin-top:10px">Importar ${mapeadas.length} asistentes</button>`;
      $('#btn-imp-ok').addEventListener('click', () => {
        const n = Store.importAsistentes(importFilas);
        toast(`${n} asistentes importados con su ID y QR`);
        adminTab = 'asistentes';
        vAdmin();
      });
    });
  }

  function parseCSV(text) {
    const sep = text.split('\n')[0].includes(';') ? ';' : ',';
    const lineas = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    const heads = lineas[0].split(sep).map((h) => h.trim());
    return lineas.slice(1).map((l) => {
      const vals = l.split(sep);
      const o = {};
      heads.forEach((h, i) => (o[h] = (vals[i] || '').trim()));
      return o;
    });
  }
  function mapearFila(f) {
    const g = (...keys) => {
      for (const k of Object.keys(f)) {
        const kn = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (keys.some((x) => kn.includes(x))) return String(f[k]).trim();
      }
      return '';
    };
    return {
      nombre: g('nombre'),
      apellidos: g('apellido'),
      fechaNacimiento: g('nacimiento', 'fecha'),
      gradoActividades: g('grado', 'actividad'),
      menuCena: g('menu', 'cena'),
      dni: g('dni'),
      email: g('email', 'correo'),
      alergias: g('alergia'),
      estado: 'confirmado'
    };
  }

  /* ---- admin: informes ---- */
  function aInformes(el) {
    const sesiones = Store.sesiones().filter((s) => s.estado !== 'planificada');
    el.innerHTML = `
      <div class="card">
        <div class="rate-row"><span class="rt">Informe global de asistencia</span></div>
        <p class="muted" style="margin-bottom:10px">Una fila por asistente: sesión a sesión, faltas y si conserva el título.</p>
        <button class="btn-gold btn-block" id="exp-global">⬇ Descargar Excel (CSV)</button>
      </div>
      <div class="card">
        <div class="rate-row"><span class="rt">Informe de una sesión</span></div>
        <select id="exp-ses">${sesiones.map((s) => `<option value="${s.id}">${s.id} — ${esc(s.nombre)}</option>`).join('')}</select>
        <button class="btn-gold btn-block" id="exp-una">⬇ Descargar listado de la sesión</button>
      </div>
      <div class="card">
        <div class="rate-row"><span class="rt">Versión imprimible (PDF)</span></div>
        <p class="muted" style="margin-bottom:10px">Abre el informe en formato de impresión — desde ahí, "Guardar como PDF".</p>
        <button class="btn-outline btn-block" id="exp-pdf">🖨 Abrir vista de impresión</button>
      </div>`;
    $('#exp-global').addEventListener('click', () => { Store.descargarCSV('informe_asistencia_ProtocoloXXII_DEMO.csv', Store.informeAsistencia()); toast('Informe descargado'); });
    $('#exp-una').addEventListener('click', () => { const id = $('#exp-ses').value; Store.descargarCSV(`informe_${id}_DEMO.csv`, Store.informeSesion(id)); toast('Informe descargado'); });
    $('#exp-pdf').addEventListener('click', () => {
      const cerradas = Store.sesiones().filter((s) => s.estado !== 'planificada');
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Informe asistencia — DEMO</title><style>
        body{font-family:Georgia,serif;padding:24px;color:#111}h1{font-size:20px}h1 span{color:#8a6d2f}
        table{border-collapse:collapse;width:100%;font-size:11px;margin-top:12px}td,th{border:1px solid #999;padding:4px 6px;text-align:left}
        .r{color:#b00}.w{color:#a70}</style></head><body>
        <h1>♗ Alfil Juvenil — <span>Informe de asistencia · Curso de Protocolo XXII (DEMO)</span></h1>
        <p>Generado el ${new Date().toLocaleString('es-ES')} · mínimo exigido ${Math.round(Store.config().porcentajeMinimo * 100)}% (máx. ${Store.maxFaltas()} faltas)</p>
        <table><tr><th>ID</th><th>Asistente</th>${cerradas.map((s) => `<th>${s.id}</th>`).join('')}<th>Faltas</th><th>Título</th></tr>
        ${Store.inscripciones().map((a) => {
          const asis = new Set(Store.checkinsDeAsistente(a.id).map((c) => c.sesionId));
          const est = Store.estadoAsistencia(a.id);
          return `<tr><td>${a.id}</td><td>${esc(a.apellidos)}, ${esc(a.nombre)}</td>${cerradas.map((s) => `<td>${asis.has(s.id) ? '✔' : '—'}</td>`).join('')}<td>${est.faltas}</td><td class="${est.nivel === 'critico' ? 'r' : est.nivel === 'riesgo' ? 'w' : ''}">${est.nivel === 'critico' ? 'PERDIDO' : est.nivel === 'riesgo' ? 'EN RIESGO' : 'OK'}</td></tr>`;
        }).join('')}
        </table><script>window.print()<\/script></body></html>`);
      w.document.close();
    });
  }

  /* ---- admin: staff ---- */
  function aStaff(el) {
    el.innerHTML = `
      ${Store.staff().map((s) => `
        <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:10px">
          <span class="avatar">${iniciales(s.nombreCompleto)}</span>
          <span style="flex:1"><div style="font-weight:600">${esc(s.nombreCompleto)} ${s.activo ? '' : '<small class="muted">(baja)</small>'}</div><small class="muted">@${esc(s.username)} · ${DEPTOS[s.departamento]} · ${Store.checkins().filter((c) => c.staffUsername === s.username).length} check-ins</small></span>
          <button class="btn-sm ${s.activo ? 'btn-danger-outline' : 'btn-outline'}" data-tg="${esc(s.username)}">${s.activo ? 'Dar de baja' : 'Reactivar'}</button>
        </div>`).join('')}
      <div class="card">
        <div class="rate-row"><span class="rt">Nueva cuenta</span></div>
        <div class="grid2"><input id="st-user" placeholder="usuario"><input id="st-nombre" placeholder="Nombre completo"></div>
        <select id="st-dep">${Object.entries(DEPTOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        <button class="btn-gold btn-block" id="st-add">Crear cuenta</button>
      </div>
      <p class="muted">Dar de baja no borra el historial: sus check-ins siguen atribuidos.</p>`;
    el.querySelectorAll('[data-tg]').forEach((b) => b.addEventListener('click', () => { Store.toggleStaff(b.dataset.tg); aStaff(el); }));
    $('#st-add').addEventListener('click', () => {
      const u = $('#st-user').value.trim().toLowerCase(), n = $('#st-nombre').value.trim();
      if (!u || !n) { toast('Usuario y nombre obligatorios', true); return; }
      if (Store.addStaff(u, n, $('#st-dep').value)) { toast(`@${u} creado`); aStaff(el); }
      else toast('Ese usuario ya existe', true);
    });
  }

  /* ---- admin: config ---- */
  function aConfig(el) {
    const c = Store.config();
    el.innerHTML = `
      <div class="card">
        <div class="rate-row"><span class="rt">Edición</span></div>
        <div class="grid2">
          <div><label>Edición</label><input value="${esc(c.edicion)}" disabled></div>
          <div><label>Prefijo ID</label><input value="${esc(c.prefijoId)}" disabled></div>
          <div><label>Aforo máximo</label><input value="${c.maxPlazas}" disabled></div>
          <div><label>Asistencia mínima</label><input value="${Math.round(c.porcentajeMinimo * 100)}%" disabled></div>
        </div>
        <p class="muted">En la versión real esto vive en <code>config/general</code> de Firestore y sí es editable.</p>
      </div>
      <div class="card">
        <div class="rate-row"><span class="rt">Demo</span></div>
        <button class="btn-danger-outline btn-block" id="btn-reset">↺ Reiniciar la demo (datos originales)</button>
        <p class="muted" style="margin-top:10px">Vuelve al estado inicial: día 3 del curso, D3_S1 activa.</p>
      </div>
      <div class="card">
        <div class="rate-row"><span class="rt">Arquitectura (para la presentación)</span></div>
        <p class="muted">PWA instalable (0 € · sin App Store) → Firebase <b>prueba-protocolo2627</b>: Firestore + Anonymous Auth + reglas ya desplegadas. Inscripción: Google Form → Apps Script → Firestore. Import Excel de respaldo. Esta demo replica ese esquema en local.</p>
      </div>
      <button class="btn-plain btn-block" id="btn-logout">Cerrar sesión de @${esc(Store.currentUser().username)}</button>`;
    $('#btn-reset').addEventListener('click', () => { Store.reset(); toast('Demo reiniciada'); App.go('escanear'); });
    $('#btn-logout').addEventListener('click', () => { Store.logout(); App.go('login'); });
  }

  return { vLogin, vEscanear, vSesiones, vDashboard, vAdmin, toast, cerrarModal, stopLive, cerrarCamara, cerrarSheet, quitarResultado };
})();
