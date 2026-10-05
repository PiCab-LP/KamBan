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

Trabajo acordado que aún no se hace (p. ej. imágenes en los bugs): [PENDIENTES.md](PENDIENTES.md).
Estado del proyecto y decisiones de diseño: [HANDOFF.md](HANDOFF.md).

## Stack

| Qué | Versión / nota |
|---|---|
| React | 19 |
| Vite | 8 (requiere Node `^20.19` o `≥22.12` — ojo, Node 21 no sirve; probado con Node 24) |
| Tailwind CSS | v4 — configuración vía `@theme` en `src/index.css`. `tailwind.config.js` está vacío y solo existe porque `components.json` (CLI de shadcn) lo referencia |
| shadcn / Radix | componentes en `src/components/ui/` |
| @dnd-kit | drag & drop del tablero de bugs |
| Supabase | `@supabase/supabase-js`, sin autenticación real (ver aviso abajo) |
| react-router-dom | 7 |
| Despliegue | Vercel (`vercel.json` reescribe todo a `index.html` para el router). Hay que definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las variables de entorno del proyecto en Vercel |

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

**El esquema de la base de datos ya está aplicado** en el proyecto remoto de Supabase.
Si clonas en otra máquina solo necesitas el `.env`; no hay que volver a correr las
migraciones. Solo se ejecutan al crear un proyecto de Supabase desde cero — en ese
caso, sigue el orden que indica [supabase/README.md](supabase/README.md).

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción a `dist/` |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run preview` | Sirve el build ya generado |

## Rutas

| Ruta | Pantalla |
|---|---|
| `/login` | Login — **mockup**, no valida nada, solo navega a `/backlog` (y "Cerrar sesión" solo vuelve aquí) |
| `/backlog` | Backlog de QA: una sola tabla (Elemento · Estado · Fecha de creación · Acciones) donde los Features y Bugs son filas anidadas bajo su Epic |
| `/bugs` | Tablero de Bugs: 4 columnas, drag & drop para cambiar estado; al abrir un bug se clasifica (estado, severidad, prioridad) |
| `/casos-de-prueba` | Casos de Prueba — en construcción |
| `/notes` | Notas del equipo |

`/` redirige a `/backlog`.

## Estructura

```
src/
  lib/
    domain.js         Estados, severidades, prioridades y colores. FUENTE ÚNICA.
    position.js       Posiciones fraccionarias para el orden del tablero
    format.js         Fechas, iniciales y colores de avatar
    supabaseClient.js Cliente singleton
  hooks/              Toda consulta a Supabase vive aquí, nunca en los componentes
    useEpics · useFeatures · useBugs · useComments · useNotes · useBacklogStats
  pages/              Backlog · BugBoard · TestCases · Notes · Login
  components/
    backlog/          Jerarquía Epic→Feature→Bug, formularios y comentarios
      TreeRow.jsx     Etiqueta y acciones compartidas de las filas del árbol
      treeLayout.js   Anchos de columna y sangrías del árbol
      CreatedAtField  Selector de fecha de creación de features y bugs
      BugImagesPlaceholder  Mockup (inerte) de la zona para adjuntar imágenes a un bug
    notes/            Tarjetas y formulario de notas
    ui/               shadcn + componentes propios compartidos
  context/            ToastContext · ThemeContext
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

**Los bugs se registran en el Backlog y se clasifican en el Tablero.** El Backlog solo
muestra y edita título, descripción y fecha de creación de un bug; el estado, la severidad
y la prioridad se ven y cambian únicamente desde el Tablero de Bugs. `BugFormSheet` tiene
un modo para cada sitio (`mode="backlog"` y `mode="board"`). No vuelvas a poner esos
controles en el Backlog: la idea es que cada opción viva en un solo lugar. Cada bug del
Backlog tiene un enlace "Ver en el tablero" (`/bugs?bug=<id>`) que resalta su tarjeta.

**Las fechas de creación son editables.** Features y bugs permiten fijar su fecha de
creación al crearlos o editarlos (`CreatedAtField`). Se guarda en la propia columna
`created_at`; no hay columna aparte. Una fecha distinta de hoy se guarda a las 12:00
locales para que el huso horario no la corra de día (`dateInputToTimestamp` en
`src/lib/format.js`). No se admiten fechas futuras. Los features y bugs se ordenan por
`created_at`, así que cambiar la fecha también cambia su posición en la lista.

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

## Seguridad

**La aplicación no tiene autenticación.** El login es un mockup y las políticas RLS son
permisivas (`using(true)`) por necesidad. La anon key viaja dentro del bundle de Vite,
así que es pública: cualquiera con DevTools puede leer y escribir todas las tablas.

**No metas datos sensibles ni de clientes reales mientras esto siga así.** El checklist
para añadir autenticación está en
[supabase/migrations/20261002120200_rls_policies.sql](supabase/migrations/20261002120200_rls_policies.sql).
