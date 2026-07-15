# Staff AJapp (PWA)

App del staff de Alfil Juvenil para el control de asistencia del Curso de
Protocolo: escaneo de QR / registro manual, sesiones en vivo, dashboard con
riesgo de pérdida de título (ECTS), e import Excel/CSV de respaldo.

## Estado

Ya existe una **demo funcional completa** (este mismo repo, construida el
07/07) con datos ficticios en `localStorage` — ver cómo arrancarla y el
guion de demo más abajo. Lo que falta para la versión real: conectar
`js/store.js` a Firestore, el proyecto Firebase de Alfil Juvenil, y el
login real del modo admin. Todo eso está decidido y documentado en `docs/`.

## Empezar por aquí (antes de tocar código)

1. **`docs/DECISIONS.md`** — qué se ha decidido y por qué, con fecha. Es la
   fuente de verdad; si algo aquí contradice el código, manda la decisión
   escrita.
2. **`docs/ARCHITECTURE.md`** — cómo encaja todo: qué ya existe (esta
   demo), qué falta, autenticación de dos niveles, offline.
3. **`docs/FIRESTORE_SCHEMA.md`** — colecciones, campos, quién puede
   escribir cada una. Ya implementado (con datos ficticios) en
   `js/demo-data.js` y `js/store.js`.
4. **`docs/FLOWS.md`** — diagramas de los flujos principales.
5. **`docs/PROJECT_SETUP.md`** — checklist de infraestructura (proyecto
   Firebase, Auth, hosting). Algunos pasos solo los puede hacer Pau.

## Cómo arrancar la demo

Desde esta carpeta:

```bash
python3 -m http.server 8080        # o: npx serve
```

y abre **http://localhost:8080** (en el móvil: la IP del portátil en la
misma Wi-Fi, o despliega la carpeta en Firebase Hosting / GitHub Pages para
probar la instalación real como PWA).

> La cámara solo funciona en `localhost` o HTTPS (requisito de los
> navegadores). Para la demo en local sin cámara está el botón **"Simular
> escaneo"**.

## Guion de demo sugerido (5 min)

La interfaz replica 1:1 la app iOS nativa antigua (carpeta `Staff AJapp/`
en la raíz del proyecto, ya obsoleta como cliente): mismas 3 pestañas
(Sesiones · Escanear · Dashboard), mismo tema negro/dorado
(#0B0B0B / #1A1A1A / #C6A75E), el círculo de escaneo con doble anillo, el
registro manual como hoja inferior y el resultado a pantalla completa
verde/naranja/rojo que se cierra solo a los 1,5 s.

1. **Login** — entra como `pau` (Informática): sin contraseña, solo eliges
   quién eres. El login sirve para saber *quién escanea a quién*.
2. **Escanear** (pestaña por defecto) — situación supuesta: día 3 del
   curso, "Protocolo empresarial" activa. Botón *Simular escaneo* varias
   veces (o cámara con un QR real desde Admin → Asistentes → QR en otro
   móvil). Prueba un duplicado: pantalla naranja "Ya registrado".
3. **Offline** — pulsa *Simular sin cobertura*, escanea dos veces → se
   encolan; pulsa *Recuperar cobertura* → se sincronizan solos.
4. **Dashboard** — tarjeta dorada "TOTAL REGISTRADOS". Activa *Simular
   escaneos de otros móviles*: el contador sube en vivo. Abajo, los
   **asistentes en riesgo**: con 14 medias ponencias y el 80% exigido, a la
   3ª falta se pierde el título (ver `docs/FIRESTORE_SCHEMA.md`, regla
   ECTS).
5. **Sesiones** — lista completa. Informática/Presidencia puede activar la
   siguiente: la anterior se cierra sola.
6. **Admin** (pestaña extra, Informática/Presidencia) — asistentes con
   búsqueda y QR, import Excel/CSV, informes CSV y vista imprimible,
   gestión del equipo. En la demo esta pestaña se abre solo con el nombre
   elegido; en la versión real pedirá además login con email+contraseña
   (ver `docs/DECISIONS.md` D12).

## Qué es real y qué es demo

| | Demo (esto, hoy) | Versión real (ver `docs/`) |
|---|---|---|
| Datos | `localStorage` con seed ficticio (`js/demo-data.js`) | Firestore, proyecto Firebase de Alfil Juvenil (`docs/PROJECT_SETUP.md`) |
| Login staff | lista local | igual (solo usuario) + Anonymous Auth invisible |
| Login admin | ninguno, solo gate de interfaz | email+contraseña real, custom claim `departamento` (D12) |
| Check-ins | array local + cola simulada | colección `checkins` + persistencia offline nativa de Firestore |
| Inscripción | import Excel / alta manual | Google Form → Apps Script → Firestore (`apps-script/Code.gs`) + import Excel de respaldo |
| IDs | contador local | incremento atómico en `config/general` |

El único archivo que cambia de fondo para pasar a real es `js/store.js` —
mismo esquema de datos, misma interfaz pública que ya consumen
`views.js`/`app.js`.

## Piezas relacionadas (fuera de este repo)

- `alfil-statics/` — la web pública + panel `/admin` (PHP), comparte
  proyecto Firebase con esta app (`docs/DECISIONS.md` D2) pero es un
  sistema independiente.
- `Staff AJapp/` — app iOS antigua en Swift, obsoleta como cliente, útil
  solo como referencia de lógica ya pensada.
- `Staff AJappBd/` — backend del proyecto Firebase de **pruebas**
  (`prueba-protocolo2627`), ya no se usa para producción. Su
  `FIRESTORE_SCHEMA.md` es el antecesor directo del de este repo.

## Coste

0 € mientras se siga el plan Spark (sin Cloud Functions — `docs/DECISIONS.md`
D3): PWA (sin App Store ni Google Play), Firebase gratuito, sin servidor
propio.
