/* ============================================================
   Staff AJapp — ESCÁNER QR
   Usa BarcodeDetector (nativo en Chrome/Android) y, si el
   navegador no lo trae (Safari/iOS), cae a jsQR sobre canvas.
   ============================================================ */

const Scanner = (() => {
  let stream = null;
  let running = false;
  let video = null;
  let onCode = null;
  let lastCode = '';
  let lastTime = 0;
  let detector = null;
  // Cada start() abre una "generación". Cualquier bucle o petición de una
  // generación anterior (stop() no cancelaba el setTimeout ni el detect() en
  // vuelo) queda invalidado y no puede disparar un segundo callback.
  let gen = 0;
  let timer = null;
  let fired = false;

  async function start(videoEl, callback) {
    stop();
    const myGen = ++gen;
    fired = false;
    video = videoEl;
    onCode = callback;
    let s;
    try {
      s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false
      });
    } catch (e) {
      return { ok: false, error: 'No se pudo acceder a la cámara. Concede el permiso o usa la entrada manual.' };
    }
    // Si mientras llegaba el permiso se llamó a stop()/start() otra vez
    // (doble toque en el círculo), esta apertura ya no vale: se libera la cámara.
    if (myGen !== gen) { s.getTracks().forEach((t) => t.stop()); return { ok: false, cancelled: true }; }
    stream = s;
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true'); // iOS
    try { await video.play(); } catch (e) { /* el elemento pudo retirarse */ }
    if (myGen !== gen) return { ok: false, cancelled: true };

    if ('BarcodeDetector' in window) {
      try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
    }
    running = true;
    loop(myGen);
    return { ok: true, motor: detector ? 'BarcodeDetector (nativo)' : (window.jsQR ? 'jsQR' : 'ninguno') };
  }

  async function loop(myGen) {
    if (myGen !== gen || !running || !video) return;
    try {
      let found = null;
      // Safari en iOS a veces expone BarcodeDetector pero no detecta nada
      // nunca (soporte experimental/incompleto) — en vez de confiar en que
      // "si existe, funciona", se prueban los dos motores cada frame: si
      // el nativo no encuentra nada, se cae a jsQR igualmente.
      if (detector) {
        try {
          const codes = await detector.detect(video);
          if (codes.length) found = codes[0].rawValue;
        } catch (e) { /* detector presente pero falla -> seguimos a jsQR */ }
      }
      if (!found && window.jsQR && video.videoWidth) {
        const canvas = document.createElement('canvas');
        // reduce resolución para no fundir la CPU del móvil
        const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * 480) || 640;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (code && code.data) found = code.data;
      }
      // detect() es asíncrono: si mientras esperaba se paró o reinició el
      // escáner, este resultado es de una generación vieja y se descarta.
      if (found && myGen === gen) emit(found);
    } catch (e) { /* frame perdido, seguimos */ }
    if (running && myGen === gen) timer = setTimeout(() => requestAnimationFrame(() => loop(myGen)), 180);
  }

  function emit(data) {
    // Un solo código por apertura de cámara: la app cierra la cámara al
    // recibirlo, así que cualquier segundo disparo es un duplicado.
    if (fired) return;
    fired = true;
    const now = Date.now();
    // anti-rebote: el mismo QR delante de la cámara no dispara 10 veces seguidas
    if (data === lastCode && now - lastTime < 2500) return;
    lastCode = data;
    lastTime = now;
    if (navigator.vibrate) navigator.vibrate(80);
    if (onCode) onCode(data);
  }

  function stop() {
    running = false;
    gen++; // invalida bucles y aperturas pendientes
    if (timer) { clearTimeout(timer); timer = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (video) { video.srcObject = null; video = null; }
    lastCode = ''; lastTime = 0;
  }

  return { start, stop };
})();
