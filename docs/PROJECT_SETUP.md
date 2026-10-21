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

## 1. Horarios (D31/D32) — hecho

Pestaña `Horarios` creada en la hoja real (Día/Hora/Actividad/Notas/
Responsable) y `apps-script/stats-readonly/Code.gs` actualizado y
redesplegado. Confirmado por Pau en pruebas reales (2026-10).

## 2. Pendiente: avisos push (D33)

Orden de trabajo, con lo que hace falta de Pau en cada paso:

- [ ] **OneSignal:** crear cuenta gratuita en onesignal.com y una app de
      tipo Web ("Custom Code"), con el sitio
      `https://paulans17.github.io/AJ-app/`. Pasar a Claude solo el
      **App ID** (público). La **REST API Key** es secreta: va únicamente
      en el paso siguiente, nunca en el chat ni en el repo.
- [ ] **Hoja:** en la pestaña `Config`, A3 = `AVISAR_HORARIOS` y en B3
      Insertar > Casilla de verificación (desmarcada).
- [ ] **Script avisador:** script.google.com > Nuevo proyecto, pegar
      `apps-script/notificador/Code.gs` y `appsscript.json`; Propiedades
      del script: `ONESIGNAL_APP_ID` y `ONESIGNAL_API_KEY`; ejecutar
      `crearTriggers()` una vez (aceptar permisos) y `probarAviso()`.
      No se despliega como Web App.
- [ ] **App (Claude):** SDK de OneSignal + campana "Activar avisos" +
      `sw.js` + CSP — se hace cuando llegue el App ID.
- [ ] **Prueba real en iPhone:** app instalada desde pantalla de inicio
      (iOS 16.4+), activar avisos, cambiar `Config!B2` y marcar `B3`.
