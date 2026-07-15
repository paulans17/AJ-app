# URLs desplegadas (2026-07-15)

Las dos Web Apps de Apps Script ya están desplegadas sobre la hoja real
("MIEMBROS CURSO PROTOCOLO XXI"). Referencia obligatoria para
`js/store.js` — ver `CLAUDE.md` tarea 3 y 4.

## Check-in (script original, tal cual — D21)

```
https://script.google.com/macros/s/AKfycbz3sICmCU9bvVtYH0ocQVVOpRDTdDq0IiMOtSbwy62tvtHw_4ZDQ97u3F8A3qlQwDoi/exec
```

Uso: `fetch(CHECKIN_URL + "?num=" + codigo)` → GET, respuesta HTML de una
línea a parsear (ver `docs/SHEET_SCHEMA.md`).

## Estadísticas (proyecto separado, solo lectura — D22)

```
https://script.google.com/macros/s/AKfycbz7gRYm8EKaGoKgcpXRB94A63wHpGefMU1aFzfPxqU2MuCHf-ODdy-xuHaswtXjKxL6/exec
```

Uso: `fetch(STATS_URL)` → GET sin parámetros, respuesta JSON
`{session, total, registrados, tasa}`. Polling cada 5-10s con la
pantalla Estadísticas abierta.

## Nota de seguridad (D17, sin cambios)

Ambas URLs son públicas por diseño (control de acceso = "quién tiene la
URL", riesgo aceptado). No son credenciales secretas, pero tampoco hace
falta publicarlas fuera del equipo sin motivo.
