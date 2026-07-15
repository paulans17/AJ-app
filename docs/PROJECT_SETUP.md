# Puesta en marcha — checklist para Pau

Pasos que solo se pueden hacer desde tu máquina / con acceso a la cuenta de
Gmail de Alfil Juvenil. Nada de esto lo puede hacer Claude Code por ti (son
acciones en consolas web o que requieren credenciales tuyas), pero puedes
pegar esta lista en esa sesión para que sepa qué asumir como ya hecho.

## 1. Proyecto Firebase

- [ ] Entrar en [console.firebase.google.com](https://console.firebase.google.com)
      con el Gmail de Alfil Juvenil (no el personal).
- [ ] Crear proyecto nuevo. Nombre propuesto:
      `alfiljuvenil-protocolo` (edítalo si prefieres otro — solo afecta a
      URLs internas, no es visible para el staff).
- [ ] **No activar** Google Analytics si no lo vas a usar (evita ruido).
- [ ] Confirmar que el plan queda en **Spark** (gratuito) — no aceptar
      ninguna sugerencia de pasar a Blaze (D3).

## 2. Firestore

- [ ] Firestore Database → Crear base de datos → modo producción → región
      `eur3 (europe-west)` (más cerca de España que las de EE. UU.).

## 3. Authentication

- [ ] Authentication → Sign-in method → activar **Anonymous**.
- [ ] Authentication → Sign-in method → activar **Email/contraseña**.
- [ ] Crear una cuenta email/contraseña para cada persona de
      Informática/Presidencia que vaya a usar el modo admin (o reutilizar
      las que ya existan del panel `/admin` de la web, si el proyecto es el
      mismo — D2).

## 4. Custom claims (modo admin)

- [ ] Generar una clave de cuenta de servicio: Configuración del proyecto →
      Cuentas de servicio → Generar nueva clave privada. Guarda el JSON
      **fuera del repo** o en una carpeta que esté en `.gitignore`
      (ya cubierto por el `.gitignore` de este repo si la llamas
      `serviceAccountKey.json` dentro de `scripts/`).
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
      de Apps Script del Form (Extensiones → Apps Script).
- [ ] Cambiar `PROJECT_ID` en `Code.gs` al proyecto nuevo.
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
