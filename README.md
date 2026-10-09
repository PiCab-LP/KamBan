# QANBAN

Gestión de QA sobre una jerarquía de tres niveles:

```
Epic  →  Feature  →  Bug
```

Un Epic agrupa Features, y cada Feature agrupa los Bugs encontrados en él. La app
tiene además un tablero kanban de bugs, notas del equipo y una sección de casos de
prueba en construcción.

> El proyecto nació como gestor de **compañías** y su onboarding (checklists de 6 fases,
> barra de progreso, estado derivado). Todo eso se eliminó en octubre de 2026. Si
> encuentras referencias a compañías o checklists en algún lado, es residuo —
> salvo el campo "Compañía" de Casos de Prueba, que está pendiente de definir
> (ver [HANDOFF.md](HANDOFF.md)).

Trabajo acordado y su estado (las imágenes en los bugs ya están implementadas): [PENDIENTES.md](PENDIENTES.md).
Estado del proyecto y decisiones de diseño: [HANDOFF.md](HANDOFF.md).

## Stack

| Qué | Versión / nota |
|---|---|
| React | 19 |
| Vite | 8 (requiere Node `^20.19` o `≥22.12` — ojo, Node 21 no sirve; probado con Node 24) |
| Tailwind CSS | v4 — configuración vía `@theme` en `src/index.css`. `tailwind.config.js` está vacío y solo existe porque `components.json` (CLI de shadcn) lo referencia |
| shadcn / Radix | componentes en `src/components/ui/` |
| @dnd-kit | drag & drop del tablero de bugs |
| Supabase | `@supabase/supabase-js` con **autenticación real** (email + contraseña) y RLS por rol. Ver [Autenticación y roles](#autenticación-y-roles) |
| react-router-dom | 7 |
| Cloudinary | Evidencia de bugs: imágenes **privadas** (assets `authenticated`). Ver [Imágenes de bugs](#imágenes-de-bugs-cloudinary) |
| Backend (API) | Funciones serverless en `api/` (Vercel). Único sitio con el **secreto de Cloudinary**; firma subidas y URLs de visualización autorizando con el JWT+rol de Supabase |
| Despliegue | Vercel. `vercel.json` reescribe todo a `index.html` **salvo `/api/*`** (las funciones). Variables de entorno en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (cliente) y las de servidor de [Imágenes de bugs](#imágenes-de-bugs-cloudinary) |

## Puesta en marcha

```bash
npm install
```

Crea un archivo `.env` en la raíz (está en `.gitignore`, así que no viene en el repo):

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Ambos valores salen del dashboard de Supabase, en **Project Settings → API**.

```bash
npm run dev
```

**El esquema completo ya está aplicado** en el proyecto remoto de Supabase —incluidas las
migraciones de auth y roles, `created_by`, `full_name` y los estados nuevos del tablero—; si clonas
en otra máquina solo necesitas el `.env`. Las migraciones solo se corren al crear un proyecto desde
cero, en el orden que indica [supabase/README.md](supabase/README.md) (ahí está la tabla completa y
el bootstrap de cuentas).

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción a `dist/` |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run preview` | Sirve el build ya generado |

## Rutas

| Ruta | Pantalla | Roles |
|---|---|---|
| `/login` | Login real con email + contraseña (Supabase Auth) | público |
| `/backlog` | Backlog de QA: una sola tabla (Elemento · Estado · Fecha de creación · Acciones) donde los Features y Bugs son filas anidadas bajo su Epic | qa (edita), viewer (solo lee) |
| `/bugs` | Tablero de Bugs: 5 columnas (Nuevo · En progreso · Bloqueado · Para despliegue · Completado), drag & drop para cambiar estado; al abrir un bug se clasifica (estado, severidad, prioridad) y se asigna | qa (edita), viewer (solo lee) |
| `/mis-bugs` | Mis Bugs: los bugs asignados al Dev; marca su avance (Corregido/Revisado) y comenta | dev |
| `/casos-de-prueba` | Casos de Prueba — navegación Epic → Feature → tabla (drill-down con breadcrumb); la tabla es aún una maqueta | qa |
| `/notes` | Notas del equipo | qa |

`/` redirige según el rol: el Dev a `/mis-bugs`, los demás a `/backlog`. Toda ruta exige sesión
(`ProtectedRoute`); sin ella se va a `/login`. Ver [Autenticación y roles](#autenticación-y-roles).

## Estructura

```
src/
  lib/
    domain.js         Estados, severidades, prioridades y colores. FUENTE ÚNICA.
    position.js       Posiciones fraccionarias para el orden del tablero
    format.js         Fechas, iniciales y colores de avatar
    images.js         Validación, compresión y llamadas al backend de imágenes
    supabaseClient.js Cliente singleton
  hooks/              Toda consulta a Supabase vive aquí, nunca en los componentes
    useEpics · useFeatures · useBugs · useComments · useNotes · useBacklogStats · useProfiles · useBugImages
  pages/              Backlog · BugBoard · MyBugs · TestCases · Notes · Login
  components/
    auth/             ProtectedRoute (guard de sesión y rol)
    backlog/          Jerarquía Epic→Feature→Bug, formularios y comentarios
      TreeRow.jsx     Etiqueta y acciones compartidas de las filas del árbol
      treeLayout.js   Anchos de columna y sangrías del árbol
      CreatedAtField  Selector de fecha de creación de features y bugs
      assignments.jsx Selector de asignación, "Creado por" y chips de asignado
      BugImages.jsx   Subida (drag & drop + click) y galería de imágenes del bug
    testcases/        Tabla de casos de prueba (maqueta) para el drill-down
    notes/            Tarjetas y formulario de notas
    ui/               shadcn + componentes propios compartidos
  context/            ToastContext · ThemeContext · AuthContext
api/                  Funciones serverless de Vercel (Node). NO llevan secretos al cliente
  _lib/               auth.js (verifica JWT + rol) · cloudinary.js (SDK + firma)
  bug-images/         sign-upload · list · delete (ver Imágenes de bugs)
supabase/
  migrations/         Esquema versionado, en orden cronológico
  introspection/      Scripts de solo lectura
```

## Convenciones

**Los datos se piden desde hooks, no desde componentes.** Todos siguen el mismo
contrato: devuelven `{ data, loading, error, fetchX, ...mutaciones }`, lanzan sus
propios toasts, y las mutaciones devuelven `{ success: true }` o
`{ success: false, error }` sin tirar excepciones. `src/hooks/useNotes.js` es la
referencia del patrón.

**`supabase-js` no rechaza la promesa en error**, devuelve `{ data, error }`. Siempre
comprobar `error` explícitamente; un `try/catch` solo no detecta nada.

**Los estados viven en `src/lib/domain.js`**, con sus etiquetas y colores. Esos valores
están duplicados en los `CHECK` del SQL: al cambiar uno hay que cambiar el otro. Es el
precio de usar `text + CHECK` en vez de enums de Postgres, y está anotado en ambos sitios.

**Los colores de estado no usan variables CSS.** Se toman de `domain.js` y se aplican
inline. Antes se interpolaba `var(--status-${id})`, lo que fallaba en silencio (pintaba
transparente) si faltaba un token.

**El backlog es una sola tabla para los tres niveles.** Epics, Features y Bugs son filas de la
misma `<Table>` (`Backlog.jsx`); `EpicExpandedDetail` y `FeatureBugList` no dibujan tabla propia,
devuelven `<tr>`s que se insertan en ella. La primera columna se llama "Elemento" y lleva el
nombre del Epic, Feature o Bug; lo único que cambia entre niveles es su **sangría**
(`treeLayout.js`), su ícono y su fondo. Estado, Fecha y Acciones son las mismas columnas para
todos, así que quedan alineadas sin cálculos. La tabla usa `table-fixed` para que los anchos
no cambien al desplegar filas.

**Los bugs se registran en el Backlog y se clasifican en el Tablero.** El Backlog edita título,
descripción y fecha de creación; el estado, la severidad y la prioridad se ven y cambian únicamente
desde el Tablero de Bugs. `BugFormSheet` tiene un modo para cada sitio (`mode="backlog"` y
`mode="board"`). La **asignación** de QA y Dev sí se puede hacer en los dos (al registrar y al
clasificar). No vuelvas a poner estado/severidad/prioridad en el Backlog: cada una vive en un solo
lugar. Cada bug del Backlog tiene un enlace "Ver en el tablero" (`/bugs?bug=<id>`) que resalta su tarjeta.

**Las fechas de creación son editables.** Features y bugs permiten fijar su fecha de
creación al crearlos o editarlos (`CreatedAtField`). Se guarda en la propia columna
`created_at`; no hay columna aparte. Una fecha distinta de hoy se guarda a las 12:00
locales para que el huso horario no la corra de día (`dateInputToTimestamp` en
`src/lib/format.js`). No se admiten fechas futuras. Los features y bugs se ordenan por
`created_at`, así que cambiar la fecha también cambia su posición en la lista.

**Un Epic o Feature no se puede marcar "Completado" con trabajo pendiente debajo.** Un
Feature exige no tener bugs abiertos (`nuevo`/`en_progreso`/`bloqueado`); un Epic exige todos sus
features en Completado y ningún bug abierto. Se hace cumplir en dos capas: la base la impone con
triggers (`20261006120000_completion_guard.sql`, con el conjunto de "abiertos" actualizado en
`20261007150000`, SQLSTATE `QA001`) y el frontend lo comprueba antes (`src/lib/completionGuard.js`,
llamado desde `useEpics` y `useFeatures`) para avisar con un toast —desde el dropdown— o en línea
—desde el formulario— sin mover el estado. El estado sigue siendo manual: la regla solo niega
valores incoherentes, nunca los calcula.

**Las personas se muestran por su nombre.** Asignados, creador, autor de notas y la barra lateral
usan el `full_name` del perfil (o el correo si no tiene). La regla única vive en `useProfiles`
(`profileDisplayName`), que expone `profilesById` (id → nombre).

**Las acciones de fila siguen siempre la misma gramática**: las constructivas (agregar,
notas) van con texto a la vista; editar y eliminar viven en el menú de tres puntos.
Todas se construyen con `RowActions`.

## Base de datos

```
epics ──┬── features ──┬── bugs ──┬── comments (bug_id)
        │              │          └── notes    (bug_id,     SET NULL)
        │              ├── comments (feature_id)
        │              └── notes    (feature_id, SET NULL)
        └── notes (epic_id, SET NULL)
```

La jerarquía borra en **CASCADE** hacia abajo. Las notas usan **SET NULL**: borrar un
Epic no debe hacer desaparecer notas escritas a mano, simplemente pasan a ser globales.

Detalles completos y decisiones de esquema en [supabase/README.md](supabase/README.md).

## Autenticación y roles

La app usa **Supabase Auth (email + contraseña)** con RLS estricto por rol. No hay registro
público: las cuentas se crean invitándolas desde el **dashboard de Supabase**.

**Tres roles**, guardados en la tabla `profiles` (uno por usuario). El rol lo fija un admin a
mano en el dashboard; toda cuenta nace como `viewer`.

| Rol | Puede |
|---|---|
| `qa` | Todo: crear, editar y borrar Epics, Features, Bugs, Casos y Notas; clasificar y **asignar** bugs. |
| `dev` | Solo ve **sus** bugs asignados (`/mis-bugs`), marca su avance (`dev_status`: Pendiente → Corregido → Revisado) y comenta en ellos. Nada más. |
| `viewer` | Solo lectura de Epics, Features y Bugs. |

**Creador y asignación.** Epics, Features y Bugs guardan quién los creó en **`created_by`**
(`default auth.uid()` en la base, no se confía en el cliente). Aparte del creador, se puede
**asignar**: un Feature a un **QA** (informativo, no cambia qué ve el Dev); un Bug a un **QA
responsable** (verifica y cierra) y a un **Dev** (lo corrige). La asignación del bug se puede hacer
tanto al registrarlo en el Backlog como desde la hoja de clasificación del Tablero; la del feature,
al crearlo o editarlo. Todo es opcional y editable, y solo lo hace QA.

**`dev_status` es independiente del estado del tablero.** El Dev marca su avance; el `status`
(Nuevo · En progreso · Bloqueado · Para despliegue · Completado) lo sigue manejando QA. No se deriva
uno del otro. "Bug abierto" (métrica y regla de completado) = Nuevo / En progreso / Bloqueado.

**El RLS es la barrera real** (`20261006130000_auth_roles.sql`): el Dev a nivel de base solo
puede leer sus bugs y solo cambiar `dev_status` (lo respalda el trigger `guard_dev_bug_update`,
SQLSTATE `QA002`); el Viewer solo lee; QA escribe. El gating de la UI (ocultar botones) es solo
comodidad encima de eso.

> **Bootstrap:** tras aplicar la migración, **todas las cuentas son `viewer`**. Hay que entrar al
> dashboard y poner al menos un `qa` en `profiles` para poder operar. Ahí mismo conviene cargar el
> `full_name` de cada persona; si queda vacío, la UI muestra su correo.

La anon key sigue en el bundle y es pública, pero ya **no** da acceso: `anon` fue revocado y toda
política exige un usuario autenticado con el rol adecuado.

## Imágenes de bugs (Cloudinary)

Un bug puede llevar imágenes de evidencia (hasta **10**, máx. **5 MB** cada una; JPG, PNG, WebP, GIF).
Se suben al **registrar** el bug en el Backlog y se editan (agregar/eliminar) desde el **Tablero**.
Las ve QA (edita), y Dev y Viewer (solo lectura: Dev en "Mis Bugs", Viewer en el detalle del tablero).
Las imágenes **no son públicas**.

**Por qué hay un backend.** Para que una imagen no sea pública, Cloudinary la aloja como asset
`authenticated` y exige una **URL firmada** para verla. Esa firma usa el **API secret**, que no puede
ir en el bundle (`VITE_*` es público). Por eso hay funciones serverless en `api/bug-images/`:

- `sign-upload` (POST, solo QA): firma la subida. El `public_id` (`qanban_bugs/<bug_id>/<ts>-<rand>`) y
  el `type=authenticated` se fijan en el servidor. El navegador sube el archivo **directo** a Cloudinary.
- `list` (GET, autenticado): devuelve las imágenes del bug con URLs firmadas. Consulta con el **token
  del usuario**, así el RLS de `bug_images` decide qué ve cada rol (no se duplica la autorización).
- `delete` (POST, solo QA): borra una imagen (`{ publicId }`) o, al borrar un bug, toda su subcarpeta
  por prefijo (`{ bugId }`).

El cliente comprime en el navegador (`browser-image-compression`) antes de subir y valida tipo/peso;
Cloudinary debe repetir esos límites como segunda barrera.

**Variables de entorno en Vercel** (de **servidor**, NO `VITE_` — nunca llegan al navegador):

```
CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
CLOUDINARY_API_KEY=<tu-api-key>
CLOUDINARY_API_SECRET=<tu-api-secret>
SUPABASE_URL=<misma-url-de-supabase>
SUPABASE_ANON_KEY=<misma-anon-key>
```

En **Cloudinary**: la carpeta es `qanban_bugs`, y hay que permitir la entrega de assets
`authenticated` por URL firmada (Settings → Security). El cliente no necesita ninguna var
`VITE_CLOUDINARY_*`: el `cloud_name` lo devuelve `sign-upload`.

> **Local:** `npm run dev` (Vite) **no** ejecuta las funciones de `api/`. Para probar la subida en
> local usa `vercel dev` (necesita la CLI de Vercel y las variables de arriba en un `.env` local), o
> prueba contra un Preview desplegado en Vercel.
