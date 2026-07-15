/* ============================================================
   Staff AJapp — ARRANQUE Y NAVEGACIÓN
   Login (sin contraseña) + 2 rutas (D14): escanear (por defecto) ·
   estadisticas.
   ============================================================ */

const App = (() => {
  const routes = {
    login: Views.vLogin,
    escanear: Views.vEscanear,
    estadisticas: Views.vEstadisticas
  };
  let current = 'login';

  function go(route) {
    if (!routes[route]) route = 'escanear';
    // al salir de una vista: apaga cámara, hojas, overlays y polling
    Scanner.stop();
    Views.pararPolling();
    Views.cerrarCamara();
    Views.cerrarSheet();
    Views.quitarResultado();
    Views.quitarCargando();

    const logged = !!Store.currentUser();
    if (!logged) route = 'login';
    if (route === 'login' && logged) route = 'escanear';
    current = route;
    location.hash = route;

    document.getElementById('topbar').classList.toggle('hidden', route === 'login');
    document.getElementById('tabbar').classList.toggle('hidden', route === 'login');
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.route === route));

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

    window.addEventListener('online', async () => {
      actualizarChips();
      const r = await Store.syncQueue();
      if (r.synced || r.failed) Views.toastSync(r);
      if (current === 'escanear') Views.vEscanear();
    });
    window.addEventListener('offline', actualizarChips);

    document.getElementById('user-chip').addEventListener('click', () => {
      const u = Store.currentUser();
      if (!u) return;
      if (confirm(`¿Cerrar sesión de ${u}?`)) {
        Store.logout();
        go('login');
      }
    });

    Store.onChange(actualizarChips);

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
  uc.textContent = u ? u + ' · Salir' : '';
  uc.classList.toggle('hidden', !u);
}

document.addEventListener('DOMContentLoaded', App.init);
