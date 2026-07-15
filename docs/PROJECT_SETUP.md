# Puesta en marcha — checklist para Pau

> ⚠️ **Mayormente superseded (2026-07-15, pivote D13-D18).** Los pasos 1-8
> de abajo eran para el backend Firebase que se descartó. Se dejan tal
> cual como registro de lo que ya se hizo (no hace falta deshacerlo, el
> proyecto Firebase sigue existiendo por si la web lo quiere usar). **Lo
> único que hace falta ahora está en la nueva sección 0, más abajo del
> todo.**

## 0. Lo que hace falta de verdad ahora (Sheets + Apps Script)

**Check-in (script sin tocar, D21):**
- [ ] Confirmar que la hoja real ("MIEMBROS CURSO PROTOCOLO XXI",
      usada tal cual para las pruebas) tiene las pestañas `asistentes`,
      `Config`, `asistencias` con la estructura de `docs/SHEET_SCHEMA.md`.
- [ ] Abrir esa hoja → Extensiones → Apps Script → pegar
      `apps-script/Code.gs` y `apps-script/appsscript.json` (tal cual,
      sin editar nada).
- [ ] Implementar → Nueva implementación → Aplicación web → ejecutar como
      "Yo", acceso "Cualquier usuario" → copiar la URL `.../exec`
      resultante y pasársela a Claude Code.

**Estadísticas (proyecto aparte, solo lectura, D22):**
- [ ] script.google.com → Nuevo proyecto (standalone, NO vinculado a la
      hoja) → pegar `apps-script/stats-readonly/Code.gs` y su
      `appsscript.json`.
- [ ] Implementar → Nueva implementación → Aplicación web → misma
      configuración → copiar esta **segunda** URL `.../exec` (distinta de
      la de check-in) y pasársela también a Claude Code.

**Pendiente de confirmar (no bloqueante):**
- [ ] Si los números de `asistentes!A` de la XXII llevan ceros a la
      izquierda o no (afecta a cómo se comparan en el script — ver nota
      en `docs/SHEET_SCHEMA.md`).
- [ ] Qué contiene la pestaña `tabla` de la hoja.

## Pasos antiguos (Firebase, ya no bloquean nada) — histórico

## 1. Proyecto Firebase ✅ (hecho 2026-07-15)

- [x] Proyecto creado con el Gmail de Alfil Juvenil: **`alfiljuvenil-protocolo`**.
- [x] Config de la app Web ya guardada en `firebase/web-config.json` (no es
      secreta, va en git).
- [ ] Confirmar que el plan queda en **Spark** (gratuito) — no aceptar
      ninguna sugerencia de pasar a Blaze (D3).

## 2. Firestore

- [ ] Firestore Database → Crear base de datos → modo producción → región
      `eur3 (europe-west)` (más cerca de España que las de EE. UU.). Si no
      lo has hecho todavía, hazlo antes de que Claude Code intente leer o
      escribir nada.

## 3. Authentication ✅ (hecho 2026-07-15)

- [x] Authentication → Sign-in method → **Anonymous** activado.
- [x] Authentication → Sign-in method → **Email/contraseña** activado.
- [ ] Crear una cuenta email/contraseña para cada persona de
      Informática/Presidencia que vaya a usar el modo admin (o reutilizar
      las que ya existan del panel `/admin` de la web, si el proyecto es el
      mismo — D2). De momento solo hay una cuenta de prueba (Pau).

## 4. Custom claims (modo admin) ✅ (clave generada 2026-07-15)

- [x] Clave de cuenta de servicio generada y guardada en
      `scripts/serviceAccountKey.json` (protegida por `.gitignore` — no se
      sube a git).
- [ ] Ejecutar `node scripts/set-claim.js <email> informatica` por cada
      cuenta admin (el script se escribe en Claude Code junto con el resto
      de la app — de momento solo está documentado el flujo).

## 5. Reglas de Firestore

- [ ] Con Firebase CLI instalado (`npm install -g firebase-tools`) y
      `firebase login` hecho:
      ```
      cd staff-ajapp-pwa/firebase
      firebase deploy --only firestore:rules
      ```
      Esto funciona en plan Spark (el deploy de rules no requiere Blaze,
      solo el de Cloud Functions).

## 6. Datos iniciales

- [ ] Crear `config/general` con `edicion`, `prefijoId`, `contadorId: 0`,
      `maxPlazas: 130`, `timezone: "Europe/Madrid"`.
- [ ] Cargar las 14 `sesiones` (día, hora, nombre, capacidad, estado
      inicial `planificada`).
- [ ] Cargar el roster real de `staff` (pendiente de que nos pases la lista
      definitiva de ~20 nombres + departamento).

## 7. Google Form + Apps Script

- [ ] Reutilizar el Form o crear uno nuevo para la edición real (mismos
      campos: Nombre, Apellidos, FechaNacimiento, Grado o Actividades,
      MenuCena, DNI, Email, Alergias).
- [ ] Copiar `apps-script/Code.gs` y `apps-script/appsscript.json` al editor
      de Apps Script del Form (Extensiones → Apps Script). `PROJECT_ID` ya
      está puesto a `alfiljuvenil-protocolo` en el archivo, no hace falta
      tocarlo.
- [ ] Configurar el trigger `onFormSubmit`.
- [ ] Publicar como aplicación web (`doGet`) para la URL de confirmación.

## 8. Hosting de la PWA

- [ ] `firebase init hosting` dentro del repo (cuando exista el build de la
      app, se hace en Claude Code).
- [ ] `firebase deploy --only hosting`.
- [ ] Decidir dominio: `.web.app` por defecto, o subdominio propio de
      alfiljuvenil.es (pendiente, ver `DECISIONS.md`).

## 9. Antes de que empiece el curso real (D7)

- [ ] Vaciar la colección `inscripciones` (borrar todos los documentos de
      prueba).
- [ ] Vaciar la colección `checkins`.
- [ ] Poner `contadorId` de vuelta a `0` en `config/general`.
- [ ] Revisar que `staff` y `sesiones` tienen los datos reales definitivos
      (no los de prueba).
- [ ] Revisar que las inscripciones reales del Form real empiezan a caer
      limpias, con `AJ2026-0001` como primer ID.
