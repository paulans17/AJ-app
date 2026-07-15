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

  async function start(videoEl, callback) {
    stop();
    video = videoEl;
    onCode = callback;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false
      });
    } catch (e) {
      return { ok: false, error: 'No se pudo acceder a la cámara. Concede el permiso o usa la entrada manual.' };
    }
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true'); // iOS
    await video.play();

    if ('BarcodeDetector' in window) {
      try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
    }
    running = true;
    loop();
    return { ok: true, motor: detector ? 'BarcodeDetector (nativo)' : (window.jsQR ? 'jsQR' : 'ninguno') };
  }

  async function loop() {
    if (!running || !video) return;
    try {
      if (detector) {
        const codes = await detector.detect(video);
        if (codes.length) emit(codes[0].rawValue);
      } else if (window.jsQR && video.videoWidth) {
        const canvas = document.createElement('canvas');
        // reduce resolución para no fundir la CPU del móvil
        const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * 480) || 640;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (code && code.data) emit(code.data);
      }
    } catch (e) { /* frame perdido, seguimos */ }
    if (running) setTimeout(() => requestAnimationFrame(loop), 180);
  }

  function emit(data) {
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
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (video) { video.srcObject = null; video = null; }
    lastCode = ''; lastTime = 0;
  }

  return { start, stop, get running() { return running; } };
})();
