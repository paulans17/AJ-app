# Staff AJapp (PWA)

App del staff de Alfil Juvenil para el control de asistencia del Curso de
Protocolo: escaneo de QR o registro manual por número, y una pantalla de
estadísticas en vivo. Evolución directa de un Atajo de iPhone que Pau ya
usaba en la edición pasada, ahora como PWA para que la use todo el equipo
a la vez desde sus móviles.

## Empezar por aquí (antes de tocar código)

1. **`docs/DECISIONS.md`** — qué se ha decidido y por qué, con fecha. Es la
   fuente de verdad; si algo aquí contradice el código, manda la decisión
   escrita.
2. **`docs/ARCHITECTURE.md`** — cómo encaja todo: stack, offline,
   seguridad, estructura del repo.
3. **`docs/SHEET_SCHEMA.md`** — pestañas de la hoja de cálculo y el
   endpoint real del Web App de check-in.
4. **`docs/FLOWS.md`** — diagramas de los flujos principales.
5. **`docs/DEPLOY_URLS.md`** — URLs reales de los dos Web Apps desplegados.
6. **`docs/PROJECT_SETUP.md`** — checklist de infraestructura pendiente.

## Cómo arrancar en local

Desde esta carpeta:

```bash
python3 -m http.server 8080        # o: npx serve, o node .claude/static-server.js
```

y abre **http://localhost:8080**. En el móvil (misma Wi-Fi): la IP del
portátil en vez de `localhost`.

> La cámara solo funciona en `localhost` o HTTPS (requisito de los
> navegadores). Sin cámara, usa el botón **"Registro Manual por Número"**.

## Las 3 pantallas

1. **Login** — sin contraseña, eliges tu nombre de una lista fija
   (`STAFF` en `js/store.js`). Solo identifica quién ha abierto la app en
   ese móvil, no es autenticación real.
2. **Escanear** (por defecto) — escanea el QR de la acreditación o
   introduce el número a mano. La sesión activa se lee de `Config!B2` en
   la hoja (se edita ahí directamente, no hay pantalla para esto). Mientras
   se resuelve el check-in se ve un overlay de carga; el resultado se
   muestra a pantalla completa (verde/naranja/rojo) durante 2 segundos.
   Sin conexión, el check-in se guarda en una cola local y se sincroniza
   solo al recuperar cobertura.
3. **Estadísticas** — sesión en curso, total registrados y tasa de
   asistencia, actualizado por *polling* cada pocos segundos contra un
   segundo Web App de solo lectura.

## Backend: Google Sheets + Apps Script, sin servidor propio

- **Check-in**: `apps-script/Code.gs`, el script real de Pau, sin ninguna
  extensión (ver `docs/DECISIONS.md` D21) — **no se toca sin permiso
  explícito**.
- **Estadísticas**: `apps-script/stats-readonly/`, proyecto standalone
  aparte, solo lectura.
- El roster de asistentes (`asistentes` en la hoja) lo gestiona Pau con
  su Excel/scripts de siempre, fuera de este repo (D20).

## Piezas relacionadas (fuera de este repo)

- `alfil-statics/` — la web pública, proyecto totalmente independiente.
- `Staff AJapp/` — app iOS antigua en Swift, obsoleta como cliente, solo
  referencia de diseño visual (paleta y layout de la pantalla de escaneo).

## Coste

0 € — PWA (sin App Store ni Google Play), Google Sheets + Apps Script
gratuitos, sin servidor ni base de datos propia que mantener.
