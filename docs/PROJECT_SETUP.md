# Puesta en marcha — checklist para Pau

Pasos que solo se pueden hacer desde tu máquina / con acceso a la cuenta de
Gmail de Alfil Juvenil. Nada de esto lo puede hacer Claude Code por ti (son
acciones en consolas web o que requieren credenciales tuyas), pero puedes
pegar esta lista en esa sesión para que sepa qué asumir como ya hecho.

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
