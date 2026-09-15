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
`index.html`/`css/app.css`/`sw.js` ya están conectados a las dos URLs y
recortados a Login+Escanear+Estadísticas. Para probar en local sin
esperar al hosting: `node .claude/static-server.js` (puerto 8420) desde
el repo, y en el móvil (misma Wi-Fi) abrir `http://<IP-portátil>:8420`.

**Pendiente ahora:**
- [ ] Sustituir el roster placeholder (`STAFF` en `js/store.js`, 10
      nombres de ejemplo) por los ~20 nombres reales del equipo.
- [ ] Probar un check-in real contra la hoja (escanear o escribir un
      número de `asistentes!A`) y confirmar que aparece en `asistencias`.
- [ ] Resolver hosting público (GitHub Pages / Firebase Hosting) para
      poder instalar la PWA en el móvil desde una URL fija, no solo en
      local.

**Pendiente de confirmar (no bloqueante):**
- [ ] Si los números de `asistentes!A` de la XXII llevan ceros a la
      izquierda o no (afecta a cómo se comparan en el script — ver nota
      en `docs/SHEET_SCHEMA.md`).
- [ ] Qué contiene la pestaña `tabla` de la hoja.

