> ⚠️ Reescrito 2026-07-15 (pivote D13-D18, corregido en D21): flujos
> basados en Google Sheets + Apps Script, usando el script real de Pau
> **tal cual**, sin extensiones (ni LockService, ni columna `staff`, ni
> acción `stats`, ni JSON — ver D21).

# Flujos — Staff AJapp (PWA)

Diagramas en Mermaid. Base: `apps-script/Code.gs` (extensión del script
real `NO-PIN vFinal`) y `docs/SHEET_SCHEMA.md`.

## 1. Login (staff general)

Sin cambios de fondo respecto a lo decidido antes del pivote: sin
contraseña, se elige el nombre de una lista. Lo único que cambia es de
dónde sale esa lista — antes de una colección Firestore, ahora puede ser
tan simple como una lista fija en el propio código de la PWA (no hace
falta una llamada al Web App solo para esto, ~20 nombres no cambian cada
día). Si se prefiere que salga de la hoja, se puede añadir un
`action=staff` al Web App más adelante — no es necesario para el primer
lanzamiento.

```mermaid
flowchart TD
    A[Abrir PWA] --> B{Nombre guardado<br/>en local?}
    B -- sí --> C[Ir a Escanear]
    B -- no --> D[Elegir nombre de una lista]
    D --> E[Guardar staffUsername en local]
    E --> C
```

## 2. Escanear / check-in (con offline)

```mermaid
sequenceDiagram
    participant U as Staff (móvil)
    participant App as PWA
    participant Q as Cola local (localStorage)
    participant WA as Web App Apps Script (script original)

    U->>App: Escanea QR (o número manual)
    App->>App: ¿navigator.onLine?
    alt Sin conexión
        App->>Q: Guarda {num, ts} en cola
        Q-->>U: "Guardado sin conexión — se sincronizará"
    else Con conexión
        App->>WA: GET .../exec?num=X
        WA->>WA: Lee Config!B2 (sesión activa)
        WA->>WA: Comprueba num en "asistentes"
        WA->>WA: Comprueba duplicado (num, sesión) en "asistencias"
        alt Nuevo
            WA->>WA: appendRow en "asistencias"
            WA-->>App: HTML "✅ Registrado Nº X → sesión (ts) (NO-PIN vFinal)"
        else Ya registrado
            WA-->>App: HTML "✅ Ya estaba registrado..."
        else No encontrado / sin sesión
            WA-->>App: HTML "Número X no está en asistentes" / "Config!B2 vacío"
        end
        App->>App: Parsea el texto de la respuesta para decidir el estado
        App-->>U: Pantalla verde/naranja/roja según el texto recibido
    end
```

**Sincronización al volver la conexión:**

```mermaid
flowchart TD
    A[window online event] --> B[Leer cola local]
    B --> C{Cola vacía?}
    C -- sí --> Z[Nada que hacer]
    C -- no --> D[Por cada elemento, en orden:<br/>GET .../exec?num=X]
    D --> E[Quitar de la cola tras la respuesta]
    E --> F{Quedan elementos?}
    F -- sí --> D
    F -- no --> G[Toast: 'N check-ins sincronizados']
```

**Duplicados entre dos móviles distintos sin red:** si ambos escanean al
mismo asistente offline, los dos lo aceptan localmente (no pueden verse
entre sí). Al sincronizar, el primero que llegue al Web App se registra;
el segundo recibe la respuesta "Ya estaba registrado" — el script
original no usa `LockService` (D21), así que en el caso límite de que dos
sincronizaciones lleguen exactamente a la vez existe una ventana de
carrera teórica. No se ha resuelto porque Pau pidió no tocar el script;
queda anotado por si en algún momento se decide lo contrario.

## 3. Estadísticas — pendiente de decidir la fuente de datos (D21)

El script original no tiene ninguna acción de lectura (el Atajo no tenía
pantalla de estadísticas). Sin tocarlo, la pantalla no tiene de dónde
sacar los números. Ver las 3 opciones en `docs/SHEET_SCHEMA.md`
("Pregunta abierta"). Hasta que Pau elija una, esta pantalla no tiene un
flujo de datos definido — no inventar uno.

## 4. Activar/cerrar sesión (fuera de la app — D15)

```mermaid
flowchart LR
    A[Informática/Presidencia] --> B[Abre la hoja de cálculo directamente]
    B --> C[Edita Config!B2<br/>con el nombre de la nueva sesión]
    C --> D[Todo el staff que escanee a partir<br/>de ahora registra contra esa sesión]
```

No hay ninguna pantalla ni login especial para esto en la app — es
exactamente como funcionaba con el Atajo de iPhone, solo que ahora varias
personas leen el mismo `Config!B2` en vez de una sola.

## 5. Inscripción / roster — fuera de alcance de este repo

La construcción de la lista `asistentes` (números + nombres) y cualquier
proceso de inscripción/registro con datos completos (DNI, menú, email...)
es un proceso aparte que Pau ya gestiona con el Excel/scripts de años
anteriores — **no es parte de lo que construye Claude Code en este repo**.
Si en el futuro se decide automatizar esa parte también, se documenta
aquí como una fase nueva.
