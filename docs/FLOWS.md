# Flujos — Staff AJapp (PWA)

Diagramas en Mermaid (se ven en GitHub, GitLab, VS Code y en Claude Code).
Basados en la lógica ya construida en Swift (`CheckinManager`,
`QRScannerManager`, `SessionManager`, `AttendeeManager` — carpeta antigua
`Staff AJapp/`, que queda como referencia funcional, no como código a
reutilizar) y en el prototipo Figma Make `dQjrZnwka2UzPESvIG5Gl3` (D9).

## 1. Login de staff (general)

```mermaid
flowchart TD
    A[Abrir PWA] --> B{Ya hay sesión<br/>anónima guardada?}
    B -- sí --> C[Ir a pantalla Inicio]
    B -- no --> D[Firebase Anonymous Auth<br/>signInAnonymously]
    D --> E[Mostrar lista de nombres<br/>leída de staff/]
    E --> F[Elegir mi nombre]
    F --> G[Guardar staffUsername<br/>en almacenamiento local]
    G --> C
```

No hay contraseña ni verificación de identidad — es atribución para saber
quién escaneó, no seguridad (ver `DECISIONS.md` D4). Cualquiera con el
enlace de la PWA podría, en teoría, elegir el nombre de otra persona; se
acepta porque es una herramienta interna de confianza entre ~20 compañeros.

## 2. Escaneo / check-in (con offline)

```mermaid
sequenceDiagram
    participant U as Staff (móvil)
    participant App as PWA
    participant Cache as Firestore local cache
    participant FS as Firestore (servidor)

    U->>App: Abre Escanear
    App->>App: Lee sesión activa (sesiones donde estado == activa)
    U->>App: Escanea QR (o introduce número manual)
    App->>Cache: Busca inscripciones por qrCode
    alt QR no encontrado
        App-->>U: Error "asistente no encontrado"
    else QR encontrado
        App->>Cache: Consulta checkins (sesionId, asistenteId)
        alt Ya existe checkin
            App-->>U: Aviso "ya registrado" (duplicado)
        else No existe
            App->>Cache: Escribe checkin (optimista, local)
            Cache-->>U: Confirmación inmediata en pantalla
            Note over Cache,FS: Si hay red, sync automático.<br/>Si no, queda en cola (hasPendingWrites=true)
            Cache->>FS: Sync cuando vuelve la conexión
        end
    end
```

Registro manual (fallback si el QR no se puede leer): mismo flujo pero
introduciendo el ID `AJ2026-XXXX` a mano en vez de escanear.

**Duplicados offline:** si dos móviles hacen check-in de la misma persona
sin red antes de sincronizar, ambos lo aceptan (no pueden verse entre sí).
Al sincronizar, quedan dos documentos en `checkins` para el mismo
`(sesionId, asistenteId)`. El dashboard (flujo 4) los marca para revisión,
no se borran automáticamente.

## 3. Modo admin (Informática / Presidencia) — activar/cerrar sesión

En la demo actual (D10) esta pestaña se muestra solo si el nombre elegido
en el login tiene `departamento` informática/presidencia, sin más
verificación. El flujo de abajo es el cambio confirmado en D12: añade un
login real solo para estas ~4-5 personas, sin tocar el login del resto.

```mermaid
flowchart TD
    A[Staff con departamento=informatica<br/>o presidencia pulsa la pestaña Admin] --> B[Pantalla pide<br/>email + contraseña]
    B --> C[signInWithEmailAndPassword<br/>sustituye la sesión anónima]
    C --> D{Token tiene custom claim<br/>departamento in informatica,presidencia?}
    D -- no --> E[Acceso denegado<br/>vuelve a modo staff normal]
    D -- sí --> F[Panel admin: lista de 14 sesiones]
    F --> G[Elegir sesión y pulsar<br/>Activar / Cerrar]
    G --> H[Escritura directa a sesiones/estado<br/>permitida por firestore.rules isInformatica]
    H --> I[Dashboard en vivo se actualiza<br/>para todo el staff]
    F --> J[Salir de modo admin]
    J --> K[Vuelve a Anonymous Auth<br/>staffUsername de antes]
```

Solo puede haber una sesión `activa` a la vez (regla de negocio de la app,
no de Firestore — al activar una, la que estaba activa pasa a `cerrada`).

## 4. Dashboard (todos, en vivo)

```mermaid
flowchart LR
    A[sesiones donde estado==activa] --> B[Mostrar nombre, hora, aforo]
    C[checkins donde sesionId==activa] --> D[Contar asistentesRegistrados]
    D --> E[% asistencia = registrados / capacidad]
    C --> F{Mismo asistenteId<br/>más de un checkin?}
    F -- sí --> G[Marcar como posible duplicado<br/>solo visible para Informática/Presidencia]
```

**Riesgo de pérdida de título (D11, ya implementado en la demo como
`asistentesEnRiesgo`):** para cada inscrito confirmado, se cuentan las
faltas solo sobre sesiones ya `cerrada` y se compara con el máximo permitido
(`Math.floor(14 * (1 - porcentajeMinimo))` = 2 faltas):

```mermaid
flowchart TD
    A[Por cada inscrito confirmado] --> B[faltas = sesiones cerradas<br/>sin checkin de esa persona]
    B --> C{faltas > 2?}
    C -- sí --> D[Crítico: título ya perdido]
    C -- no --> E{faltas == 2?}
    E -- sí --> F[En riesgo: una falta más<br/>y pierde el título]
    E -- no --> G[OK]
    D --> H[Visible en Dashboard/Admin<br/>para avisar a la persona]
    F --> H
```

## 5. Inscripción — Google Form → Firestore (D5)

```mermaid
sequenceDiagram
    participant P as Persona interesada
    participant GF as Google Form
    participant AS as Apps Script (Code.gs)
    participant FS as Firestore REST API
    participant Mail as Gmail (MailApp)

    P->>GF: Rellena formulario (nombre, DNI, menú...)
    GF->>AS: Trigger onFormSubmit
    AS->>FS: commit increment(contadorId) [atómico]
    FS-->>AS: nuevo contadorId
    AS->>AS: Compone ID AJ2026-XXXX,<br/>calcula modalidad/precio por menú
    AS->>FS: PATCH inscripciones/{id} (estado=pendiente)
    AS->>Mail: Envía email con QR (QuickChart) + enlace de confirmación
    Mail-->>P: Email recibido
```

## 6. Confirmación de inscripción

```mermaid
sequenceDiagram
    participant P as Persona interesada
    participant AS as Apps Script (doGet, Web App)
    participant FS as Firestore REST API

    P->>AS: Clic en enlace de confirmación del email
    AS->>FS: GET inscripciones/{id}
    alt ya confirmado
        AS-->>P: "Ya estaba confirmada"
    else pendiente
        AS->>FS: PATCH estado=confirmado, tsConfirmacion=now
        AS-->>P: "Confirmada, gracias"
    end
```

## 7. Alta de nuevo miembro de staff

```mermaid
flowchart TD
    A[Informática/Presidencia decide dar de alta<br/>a un nuevo miembro] --> B[Crear documento en staff/<br/>desde modo admin PWA o panel web /admin]
    B --> C{Necesita también<br/>modo admin?}
    C -- no --> D[Fin — ya puede loguearse<br/>como staff general]
    C -- sí --> E{Ya tiene cuenta real<br/>del panel web /admin?}
    E -- sí --> F[Ejecutar scripts/set-claim.js<br/>con su email existente]
    E -- no --> G[Crear cuenta email/password<br/>en Firebase Auth]
    G --> F
    F --> H[Custom claim departamento asignado]
    H --> D
```

`scripts/set-claim.js` se ejecuta localmente (Node + `firebase-admin`),
nunca desde la app ni desplegado — ver `PROJECT_SETUP.md`.
