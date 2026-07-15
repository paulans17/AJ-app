/* ============================================================
   Staff AJapp — ARRANQUE Y NAVEGACIÓN
   2 rutas (D14): escanear (por defecto) · estadisticas. Sin login.
   ============================================================ */

const App = (() => {
  const routes = {
    escanear: Views.vEscanear,
    estadisticas: Views.vEstadisticas
  };
  let current = 'escanear';

  function go(route) {
    if (!routes[route]) route = 'escanear';
    // al salir de una vista: apaga cámara, hojas, overlays y polling
    Scanner.stop();
    Views.pararPolling();
    Views.cerrarCamara();
    Views.cerrarSheet();
    Views.quitarResultado();

    current = route;
    location.hash = route;

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
      if (r.synced) Views.toast(`⇅ Conexión recuperada — ${r.synced} check-ins sincronizados`);
      if (current === 'escanear') Views.vEscanear();
    });
    window.addEventListener('offline', actualizarChips);

    Store.onChange(actualizarChips);

    const hash = location.hash.replace('#', '');
    go(hash === 'estadisticas' ? 'estadisticas' : 'escanear');
  }

  return { go, init };
})();

/** Actualiza los indicadores de la barra superior (conexión, cola) */
function actualizarChips() {
  const net = document.getElementById('net-status');
  const qb = document.getElementById('queue-badge');
  if (!net) return;
  const online = Store.isOnline();
  net.textContent = online ? '● en línea' : '○ sin conexión';
  net.className = 'pill ' + (online ? 'pill-ok' : 'pill-off');
  const q = Store.getQueue().length;
  qb.textContent = '⇅ ' + q;
  qb.classList.toggle('hidden', q === 0);
}

document.addEventListener('DOMContentLoaded', App.init);
