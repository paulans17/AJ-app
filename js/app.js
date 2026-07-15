/* ============================================================
   Staff AJapp — ARRANQUE Y NAVEGACIÓN
   ============================================================ */

const App = (() => {
  // Réplica de MainTabView.swift: Sesiones · Escanear (por defecto) · Dashboard
  const routes = {
    login: Views.vLogin,
    escanear: Views.vEscanear,
    sesiones: Views.vSesiones,
    dashboard: Views.vDashboard,
    admin: Views.vAdmin
  };
  let current = 'login';

  function go(route) {
    if (!routes[route]) route = 'escanear';
    // al salir de una vista: apaga cámara, hojas, overlays y simulación en vivo
    Scanner.stop();
    Views.stopLive();
    Views.cerrarModal();
    Views.cerrarCamara();
    Views.cerrarSheet();
    Views.quitarResultado();

    const logged = !!Store.currentUser();
    if (!logged) route = 'login';
    if (route === 'login' && logged) route = 'escanear';
    current = route;
    location.hash = route;

    document.getElementById('topbar').classList.toggle('hidden', route === 'login');
    document.getElementById('tabbar').classList.toggle('hidden', route === 'login');
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.route === route));
    document.getElementById('tab-admin').classList.toggle('hidden', !Store.isInformatica());

    routes[route]();
    actualizarChips();
    window.scrollTo(0, 0);
  }

  function init() {
    // service worker (solo funciona bien servido por http, no con file://)
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    document.querySelectorAll('#tabbar button').forEach((b) =>
      b.addEventListener('click', () => go(b.dataset.route))
    );

    window.addEventListener('online', () => {
      actualizarChips();
      const r = Store.syncQueue();
      if (r.synced) Views.toast(`⇅ Conexión recuperada — ${r.synced} check-ins sincronizados`);
      if (current === 'escanear') Views.vEscanear();
    });
    window.addEventListener('offline', actualizarChips);

    Store.onChange(() => {
      actualizarChips();
      // No se re-renderiza mientras hay cámara/hoja abierta (evita cortar un
      // escaneo en curso) ni la pantalla de escanear (gestiona su propio ciclo
      // de vida de cámara) — el resto de vistas se refrescan solas al
      // converger el espejo de Firestore.
      const overlayAbierto = document.getElementById('cam-cover') || document.getElementById('sheet-bg');
      if (current !== 'escanear' && !overlayAbierto && routes[current]) routes[current]();
    });

    const hash = location.hash.replace('#', '');
    go(Store.currentUser() ? (hash || 'escanear') : 'login');
  }

  return { go, init };
})();

/** Actualiza los indicadores de la barra superior (conexión, cola, usuario) */
function actualizarChips() {
  const net = document.getElementById('net-status');
  const qb = document.getElementById('queue-badge');
  const uc = document.getElementById('user-chip');
  if (!net) return;
  const online = Store.isOnline();
  net.textContent = online ? '● en línea' : '○ sin conexión';
  net.className = 'pill ' + (online ? 'pill-ok' : 'pill-off');
  const q = Store.getQueue().length;
  qb.textContent = '⇅ ' + q;
  qb.classList.toggle('hidden', q === 0);
  const u = Store.currentUser();
  uc.textContent = u ? '@' + u.username : '';
  uc.classList.toggle('hidden', !u);
}

document.addEventListener('DOMContentLoaded', () => {
  Store.ready.then(App.init).catch((e) => { console.error('Store.ready falló:', e); App.init(); });
});
