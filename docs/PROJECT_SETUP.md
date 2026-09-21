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

**Confirmado por Pau (2026-09-15): el check-in real funciona de punta a
punta.** Probado varias veces contra la hoja real — aparece correctamente
en `asistencias` (D24, el fix de CORS, queda confirmado en producción).
Números sin ceros a la izquierda, y la pestaña `tabla` es un pivote de
solo lectura que la app no necesita (ver `docs/SHEET_SCHEMA.md`) — las
dos dudas pendientes quedan resueltas, nada bloqueante ahora mismo.

## 1. Pendiente: activar Horarios (D31)

La pantalla nueva ya está en el código (`js/views.js`, ruta `horarios`),
pero necesita dos cosas que solo puede hacer Pau, fuera de este repo:

- [ ] Crear la pestaña `Horarios` en la hoja real, con columnas
      Día/Hora/Actividad/Notas (ver `docs/SHEET_SCHEMA.md`) y rellenarla
      con los horarios del equipo.
- [ ] Pegar la versión actualizada de `apps-script/stats-readonly/Code.gs`
      en el proyecto de Apps Script ya desplegado (script.google.com →
      abrir el proyecto de Estadísticas → reemplazar `Code.gs` →
      Implementar → Gestionar implementaciones → lápiz en la
      implementación activa → Nueva versión → Implementar). La URL no
      cambia, así que no hace falta tocar `docs/DEPLOY_URLS.md`.

Hasta que se haga lo segundo, la pantalla Horarios se ve vacía sin dar
error — el script viejo sigue respondiendo lo mismo de siempre.

