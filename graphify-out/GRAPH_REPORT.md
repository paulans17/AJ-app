# Graph Report - .  (2026-07-15)

## Corpus Check
- Corpus is ~16,399 words - fits in a single context window. You may not need a graph.

## Summary
- 89 nodes · 135 edges · 15 communities (8 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 12,000 input · 6,000 output

## Community Hubs (Navigation)
- Decisiones de arquitectura (pivote Sheets)
- Manifest Apps Script — check-in
- Manifest Apps Script — stats
- Integración PWA con Apps Script/Sheets
- Decisiones Firestore (superseded)
- Decisiones finales y docs de gobierno
- Componentes de la demo PWA
- Código app.js / store.js
- Código demo-data.js
- Código scanner.js
- Código views.js
- Código service worker
- Icono 512px
- Service worker (referencia doc)
- Regla ECTS (aislada)

## God Nodes (most connected - your core abstractions)
1. `webapp` - 3 edges
2. `webapp` - 3 edges
3. `oauthScopes` - 2 edges
4. `oauthScopes` - 2 edges
5. `actualizarChips()` - 2 edges
6. `Store` - 2 edges
7. `timeZone` - 1 edges
8. `exceptionLogging` - 1 edges
9. `runtimeVersion` - 1 edges
10. `executeAs` - 1 edges

## Surprising Connections (you probably didn't know these)
- `actualizarChips()` --references--> `Store`  [EXTRACTED]
  js/app.js → js/store.js

## Import Cycles
- None detected.

## Communities (15 total, 7 thin omitted)

### Community 0 - "Decisiones de arquitectura (pivote Sheets)"
Cohesion: 0.20
Nodes (16): D1: Proyecto Firebase nuevo (cuenta AJ), D12: Modo admin con login real email/contraseña, D13: Backend del evento: Google Sheets + Apps Script (no Firestore), D14: App reducida a 2 pantallas, D15: Gestión manual en la hoja, D16: Corrección de IDs duplicados con LockService, D17: Seguridad simplificada sin Firebase Auth, D18: Offline reutiliza la cola local existente (+8 more)

### Community 1 - "Manifest Apps Script — check-in"
Cohesion: 0.20
Nodes (9): dependencies, exceptionLogging, oauthScopes, runtimeVersion, timeZone, webapp, access, executeAs (+1 more)

### Community 2 - "Manifest Apps Script — stats"
Cohesion: 0.20
Nodes (9): dependencies, exceptionLogging, oauthScopes, runtimeVersion, timeZone, webapp, access, executeAs (+1 more)

### Community 3 - "Integración PWA con Apps Script/Sheets"
Cohesion: 0.33
Nodes (10): Apps Script Web App checkin (Code.gs), Apps Script stats-readonly, Cola offline (getQueue/setQueue/syncQueue), js/store.js, Pestaña asistencias, Pestaña asistentes, Pestaña Config (B2), Pestaña tabla (+2 more)

### Community 4 - "Decisiones Firestore (superseded)"
Cohesion: 0.22
Nodes (10): D10: Demo funcional ya existente descubierta, D11: Regla de negocio ECTS formalizada, D2: Proyecto Firebase compartido con la web, D3: Sin plan Blaze, D8: Mantener gradoActividades y alergias, FIRESTORE_SCHEMA.md, README.md, alfil-statics (web + panel /admin) (+2 more)

### Community 5 - "Decisiones finales y docs de gobierno"
Cohesion: 0.47
Nodes (10): D20: Inscripción/roster fuera de alcance, D21: Revertir Code.gs al script original exacto, D22: Estadísticas resueltas con proyecto Apps Script separado, D7: Reset antes del curso real, CLAUDE.md, DECISIONS.md, FLOWS.md, PROJECT_SETUP.md (+2 more)

### Community 6 - "Componentes de la demo PWA"
Cohesion: 0.29
Nodes (7): icon-192.png, icon.svg, js/app.js, js/demo-data.js, js/scanner.js, js/views.js, index.html

### Community 7 - "Código app.js / store.js"
Cohesion: 0.40
Nodes (3): actualizarChips(), App, Store

## Knowledge Gaps
- **19 isolated node(s):** `timeZone`, `dependencies`, `exceptionLogging`, `runtimeVersion`, `executeAs` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `D13: Backend del evento: Google Sheets + Apps Script (no Firestore)` (e.g. with `D14: App reducida a 2 pantallas` and `D15: Gestión manual en la hoja`) actually correct?**
  _`D13: Backend del evento: Google Sheets + Apps Script (no Firestore)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `timeZone`, `dependencies`, `exceptionLogging` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._