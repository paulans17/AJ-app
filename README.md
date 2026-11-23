# AJ App · Control de asistencia por QR

PWA que usa el staff de **Alfil Juvenil** para pasar asistencia en el **Curso de Protocolo** (unos 130 alumnos por edición). Escaneas el QR de la acreditación desde el móvil y en un segundo queda registrado en Google Sheets.

Empezó como un Atajo de iPhone que solo podía usar una persona. Lo pasé a PWA para que todo el equipo pudiera escanear a la vez desde su propio móvil, sin instalar nada desde la tienda de apps.

🔗 **App:** https://paulans17.github.io/AJ-app/

## Qué hace

- **Escanear**: lee el QR con la cámara o deja meter el número a mano. El resultado sale a pantalla completa (verde = registrado, naranja = ya estaba, rojo = error).
- **Funciona sin conexión**: si no hay cobertura, el check-in se guarda en una cola local y se envía solo al volver la red.
- **Estadísticas en vivo**: sesión activa, número de registrados y tasa de asistencia.
- **Horarios del equipo**: agenda del día por colores, filtro "Soy…" para ver solo lo tuyo y una línea que marca la hora actual.
- **Avisos push** (en marcha): script que avisa con OneSignal cuando cambia la sesión o se actualizan los horarios.

## Cómo está hecho

| Parte | Tecnología |
|---|---|
| Front | HTML, CSS y JavaScript vanilla, PWA con Service Worker |
| Lector de QR | [jsQR](https://github.com/cozmo/jsQR) |
| Backend | Google Apps Script: check-in, estadísticas y horarios (solo lectura) y notificador |
| Base de datos | Google Sheets |
| Hosting | GitHub Pages |

No tiene servidor propio, así que no cuesta nada mantenerla: todo funciona con los planes gratuitos.

```
├── index.html, manifest.webmanifest, sw.js
├── css/app.css
├── js/
│   ├── app.js       → rutas y arranque
│   ├── views.js     → las 3 pantallas
│   ├── scanner.js   → cámara + jsQR
│   └── store.js     → llamadas a Apps Script y cola offline
└── apps-script/
    ├── Code.gs            → check-in
    ├── stats-readonly/    → estadísticas y horarios (solo lectura)
    └── notificador/       → avisos push
```

## Probarla en local

```bash
python3 -m http.server 8080
```

Abre `http://localhost:8080`. La cámara solo funciona en `localhost` o con HTTPS. Si no tienes cámara, usa el registro manual por número.
