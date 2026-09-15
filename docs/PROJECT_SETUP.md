# Puesta en marcha — checklist para Pau

> Los pasos de Firebase (proyecto, Firestore, Auth, custom claims...) que
> hubo aquí durante el diseño de la mañana del 15/07 se descartaron en el
> pivote a Sheets + Apps Script (D13 en adelante) y se han borrado de este
> archivo — el histórico de esa vía queda en `docs/DECISIONS.md`. Todo lo
> que hace falta de verdad hoy está abajo.

## 0. Lo que hace falta de verdad ahora (Sheets + Apps Script)

**Check-in (script sin tocar, D21):** ✅ desplegado 2026-07-15
- [x] Abrir esa hoja → Extensiones → Apps Script → pegar
      `apps-script/Code.gs` y `apps-script/appsscript.json` (tal cual,
      sin editar nada).
- [x] Implementar → Nueva implementación → Aplicación web → URL obtenida
      y guardada en `docs/DEPLOY_URLS.md`.

**Estadísticas (proyecto aparte, solo lectura, D22):** ✅ desplegado 2026-07-15
- [x] script.google.com → Nuevo proyecto (standalone, NO vinculado a la
      hoja) → pegar `apps-script/stats-readonly/Code.gs` y su
      `appsscript.json`.
- [x] Implementar → Nueva implementación → Aplicación web → segunda URL
      obtenida y guardada en `docs/DEPLOY_URLS.md`.

**Hecho (D23, 2026-07-15):** `js/store.js`/`views.js`/`app.js`/
`index.html`/`css/app.css`/`sw.js` conectados a las dos URLs, recortados
a Escanear+Estadísticas.

**Hecho (2026-09-15):** publicada en GitHub Pages
(`https://paulans17.github.io/AJ-app/`), instalable como PWA desde ahí.
Sin login ni roster de staff (D28) — no importa quién escanea. Logo real
de Pau como icono (D29). Sin ningún mock/demo en el código (D30) — la
única base de datos es la hoja real. Para probar en local sin depender
de GitHub Pages: `node .claude/static-server.js` (puerto 8420) desde el
repo, y en el móvil (misma Wi-Fi) abrir `http://<IP-portátil>:8420`.

**Pendiente ahora:**
- [ ] Probar un check-in real contra la hoja (escanear o escribir un
      número de `asistentes!A`) y confirmar que aparece en `asistencias`
      — el fix de CORS (D24) está desplegado pero no se ha forzado una
      prueba real todavía para no ensuciar la hoja de producción.

**Pendiente de confirmar (no bloqueante):**
- [ ] Si los números de `asistentes!A` de la XXII llevan ceros a la
      izquierda o no (afecta a cómo se comparan en el script — ver nota
      en `docs/SHEET_SCHEMA.md`).
- [ ] Qué contiene la pestaña `tabla` de la hoja.

