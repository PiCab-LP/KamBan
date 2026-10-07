# Handoff — QANBAN

Estado al **7 de octubre de 2026**. **Hay bastante trabajo de esta sesión sin commitear** (ver
[Cambios de esta sesión](#cambios-de-esta-sesión-7-oct-2026)) y **migraciones nuevas por aplicar**
(ver [Migraciones por aplicar](#migraciones-por-aplicar)). `npm run lint` y `npm run build` pasan.

Trabajo acordado que aún no se hace (p. ej. imágenes en los bugs con Cloudinary): ver
[PENDIENTES.md](PENDIENTES.md).

Para montar el entorno, ver [README.md](README.md). Este documento cubre **en qué punto
está el trabajo, qué quedó pendiente y por qué se tomaron ciertas decisiones**.

---

## Qué pasó

El proyecto era un gestor de **compañías** y su onboarding: cada compañía arrastraba un
checklist de 6 fases, una barra de progreso calculada sobre esas tareas, y un estado que
se derivaba automáticamente de la primera fase incompleta.

El producto cambió de propósito a **gestión de QA**. En octubre de 2026 se migró el
dominio completo a `Epic → Feature → Bug`, se borró la base de datos y se creó una nueva.
No se migraron datos.

### Lo que se eliminó

- Tablas `companies`, `company_checklists`, `task_comments`, `personal_tasks` y la vieja `notes`.
- El **trigger que generaba la plantilla de 6 fases**. No estaba en el repo — vivía solo
  en Supabase, invisible para cualquiera que leyera el código. Se localizó con
  `supabase/introspection/00_inspect_legacy.sql` y se eliminó.
- La barra de progreso, el estado derivado, las fechas de onboarding/entrega y el confetti.
- Los archivos `Dashboard.jsx`, `Kanban.jsx`, `CompanyExpandedDetail.jsx` y `TaskModal.jsx`.

### Lo que funciona hoy

El **esquema base** está aplicado en el proyecto remoto, pero las **migraciones de esta sesión
(auth, roles, `created_by`, `full_name`, estados nuevos) pueden no estar aplicadas** — ver
[Migraciones por aplicar](#migraciones-por-aplicar). Flujos que existen en el código:

- **Autenticación real** (email + contraseña) con tres roles **qa / dev / viewer** y RLS estricto;
  guard de rutas, login/logout, y gating de la UI por rol. Ver [README](README.md#autenticación-y-roles).
- Crear, editar, borrar y cambiar estado de Epics, Features y Bugs.
- Navegación en árbol dentro de una sola tabla: Epic → Feature → Bugs, desplegable por nivel.
- **Creador (`created_by`) y asignación**: Features se asignan a un QA; Bugs a QA + Dev (al
  registrar y al clasificar). Se muestra creador y asignados por su **nombre** (`full_name`).
- Tablero de Bugs con **cinco estados**: Nuevo · En progreso · Bloqueado · Para despliegue ·
  Completado. "Bug abierto" = Nuevo / En progreso / Bloqueado. Tarjetas con contexto
  (Epic › Feature, título, descripción, severidad/prioridad, avance y responsables).
- **Pantalla del Dev** (`/mis-bugs`): solo sus bugs asignados; marca su avance (`dev_status`) y comenta.
- Comentarios en Features y en Bugs, con hilos y contadores independientes.
- **Casos de Prueba**: drill-down Epic → Feature → tabla (maqueta).
- **Notas**: autor, fechas de creado/editado con hora, vínculo a Epic/Feature/Bug, colores, fijar.
- **Regla de completado**: un Feature o Epic no pasa a "Completado" con bugs abiertos o, en el Epic,
  features sin completar (triggers + aviso en el frontend).
- Modo claro/oscuro, instantáneo. Responsive (desktop-first, hasta laptops pequeñas).

### Cambios de esta sesión (7 oct 2026)

Trabajo hecho en esta sesión, **sin commitear** salvo que se indique. Detalle de cada migración en
[supabase/README.md](supabase/README.md) y el modelo en [supabase/MODELO.md](supabase/MODELO.md).

- **Autenticación + roles + RLS estricto** (migración `20261006130000`): tabla `profiles`
  (qa/dev/viewer), `user_role()`, RLS por rol, columnas de asignación en `bugs` y el trigger
  `guard_dev_bug_update` (SQLSTATE `QA002`, el Dev solo puede cambiar `dev_status`). Frontend:
  `AuthContext`, `ProtectedRoute`, login/logout reales, `/mis-bugs`, gating por rol.
  - Se afinó `AuthContext` por un **deadlock de Supabase** (no hacer `await` a Supabase dentro del
    callback de `onAuthStateChange`: se difiere con `setTimeout`) y un **parpadeo de rol** en la
    primera carga (no se renderiza ruta hasta conocer el rol). Logout con `scope: 'global'`.
- **Creador y asignación** (migración `20261007120000`): se unificó el creador a **`created_by`**
  (renombró `bugs.creator_id`), se añadió a epics/features y `assigned_qa_id` a features. Selectores
  de asignación en los formularios de Feature y de Bug (y en el Tablero); se muestra "Creado por" y
  los asignados en las filas del Backlog. Helpers en `src/components/backlog/assignments.jsx`.
- **Nombre completo** (migración `20261007140000`): `profiles.full_name`. La UI muestra a las
  personas por su nombre (correo de respaldo); regla única en `useProfiles` (`profileDisplayName`).
- **Estados del Tablero** (migración `20261007150000`): `nuevo · en_progreso · bloqueado ·
  para_despliegue · completado` (remapea resuelto→para_despliegue, cerrado→completado). Se **eliminó
  la lógica de "Reabierto"**. "Bug abierto" = nuevo/en_progreso/bloqueado (se actualizaron los guards
  de completado).
- **Tarjetas del Tablero rediseñadas**: sin ícono de bug, franja izquierda con el color del estado,
  y campos etiquetados (Epic › Feature, título, descripción, Severidad:, Prioridad:, Avance Dev:,
  QA asignado:, Dev asignado:).
- **Casos de Prueba**: de tabla+filtro a **drill-down Epic → Feature → tabla** con breadcrumb. La
  tabla se extrajo a `src/components/testcases/TestCaseTable.jsx`; se eliminó el `EpicFilter`.
- **Notas** (migración `20261007130000`): `notes.created_by`; se muestra autor (esquina del header),
  fechas de creado/editado con hora, chip de vínculo reordenado, barra de acciones por ícono, y se
  quitó el color "sin color" (toda nota lleva color).
- **Responsive** (desktop-first): sidebar más angosto y menos padding en laptops pequeñas, paddings
  y anchos de columna del tablero adaptables.
- **Seguridad de dependencias**: se resolvieron las vulnerabilidades de `npm audit` moviendo `shadcn`
  a `devDependencies` (0 vulnerabilidades en producción).

### Cambios recientes (anteriores a esta sesión, ya commiteados)

- **Tabla única.** Antes, los features y bugs eran listas con rejilla propia dentro de una
  celda del Epic, con cabeceras de columna repetidas y ~40 líneas de cálculo para alinear su
  Estado con el del Epic. Ahora Epics, Features y Bugs son **filas de la misma tabla**: la
  primera columna se llama "Elemento" (nombre provisional), no hay sub-cabeceras, y Estado,
  Fecha y Acciones se leen de la cabecera principal (mismo `x` en los tres niveles, medido).
  La jerarquía se marca con sangría, ícono (avatar / carpeta / bug ámbar), fondos escalonados,
  la franja violeta a la izquierda de las filas anidadas y una línea que cuelga de la carpeta
  del feature hasta sus bugs (`Connector`). Cada feature muestra su conteo de bugs como chip
  junto al nombre. Nació como prueba y quedó adoptada en `1a1e613`. La versión anterior (rejilla
  `TREE_GRID`, tarjeta por feature, cabeceras propias) sigue en el historial: `git show
  e702f47:src/components/backlog/FeatureBugList.jsx`, y lo mismo para `EpicExpandedDetail.jsx`,
  `TreeRow.jsx`, `treeLayout.js` y `Backlog.jsx`. Los anchos de columna y sangrías viven en
  `src/components/backlog/treeLayout.js`.
- **Los bugs se registran en el Backlog y se clasifican en el Tablero.** El Backlog edita título,
  descripción y fecha (y ahora también la asignación QA/Dev); el estado, la severidad y la prioridad
  viven en el Tablero. Al abrir un bug sale la hoja *Clasificar Bug*. `BugFormSheet` tiene por eso
  dos modos, `backlog` y `board`. Un bug nuevo nace con los defaults de la base: `nuevo`, severidad
  `media`, prioridad `media`. (La etiqueta "Reabierto" que esto mencionaba se **eliminó** en esta
  sesión.)
- **"Ver en el tablero →"** en cada bug del Backlog lleva a `/bugs?bug=<id>`. El Tablero
  centra esa tarjeta, la resalta 3,5 s y limpia el parámetro de la URL para que recargar no
  la resalte otra vez. El botón ocupa la celda de Estado de la fila del bug.
- **Mockup de imágenes en el formulario de bug** (`BugImagesPlaceholder`): solo la zona de
  arrastrar y soltar, inerte y marcada "Próximamente". Detalle y decisiones
  pendientes en [PENDIENTES.md](PENDIENTES.md).
- **`updateBug` y el drag comparten la recolocación de tarjeta** al cambiar de columna. (La
  lógica de "Reabierto" que esto incluía se eliminó en esta sesión.) Se eliminó `updateBugStatus`,
  que solo usaba el dropdown del Backlog.
- **Fecha de creación editable** en features y bugs (`CreatedAtField`), también visible
  como columna. **No hizo falta migración**: se escribe en `created_at`, que ya era una
  columna normal con default `now()`, sin restricción en RLS. Probado de punta a punta
  cambiando la fecha de un bug real y restaurándola.
- Se desinstalaron `canvas-confetti` y `@fontsource-variable/inter`.

---

## Pendientes

### Migraciones por aplicar 🔴

Varias migraciones de esta sesión pueden no estar aplicadas en tu proyecto de Supabase. Aplícalas en
orden en el **SQL Editor** (la lista completa y qué hace cada una está en
[supabase/README.md](supabase/README.md)):

| # | Archivo | Qué trae |
|---|---|---|
| 4 | `20261006120000_completion_guard.sql` | Triggers: no completar Epic/Feature con trabajo pendiente. |
| 5 | `20261006130000_auth_roles.sql` | Auth real, roles, RLS estricto, asignación de bugs. |
| 6 | `20261007120000_creators_and_assignment.sql` | `created_by` (renombra `creator_id`) y `assigned_qa_id` en features. |
| 7 | `20261007130000_notes_created_by.sql` | Autor de las notas. |
| 8 | `20261007140000_profiles_full_name.sql` | Nombre a mostrar. |
| 9 | `20261007150000_bug_statuses.sql` | Estados nuevos del tablero (remapea resuelto/cerrado). |

**Bootstrap tras aplicarlas:** crear cuentas en *Authentication → Users* y, en `public.profiles`,
fijar su `role` y su `full_name` a mano. **Sin al menos un `qa` no se puede operar** (todas nacen
`viewer`). Si `full_name` queda vacío, la UI muestra el correo.

> No se pudo verificar de punta a punta contra la base real desde aquí (sin acceso a localhost/SQL
> Editor en esta sesión). `lint` y `build` pasan; la verificación funcional queda del lado del usuario.

### 1. Casos de Prueba — definir los valores seleccionables 🔴

Es el trabajo activo. La pantalla ([src/pages/TestCases.jsx](src/pages/TestCases.jsx))
tiene la estructura lista pero **no está conectada a la base de datos**: no hay tabla
`test_cases` ni migración para ella.

**La pantalla es un drill-down Epic → Feature → tabla.** Se navega: los Epics se ven como
carpetas, al entrar a uno salen sus Features, y al entrar a un Feature aparece la tabla de casos
(hoy la maqueta con la fila de ejemplo), con breadcrumb para subir. La tabla vive en
[src/components/testcases/TestCaseTable.jsx](src/components/testcases/TestCaseTable.jsx). Esto fija
que **cada caso colgará de un Feature (`feature_id`)** cuando se cree la tabla real.

Los campos ya acordados, repartidos así:

**Columnas de la tabla** (11): ID Caso · Suite · Aplicación · Módulo/Pantalla · Título ·
Tipo · Prioridad · Rol Requerido · Compañía · Automatizable · Estado del Caso

**Detalle expandido** (4, son texto largo): Precondiciones · Pasos · Resultado Esperado ·
Datos de Prueba

Falta que el usuario defina **qué valores puede tomar cada campo seleccionable**
(Suite, Aplicación, Tipo, Prioridad, Rol Requerido, Automatizable, Estado del Caso).
Hasta entonces no se puede escribir la migración, porque los `CHECK` necesitan esos valores.

> **Hay que borrar la constante `EXAMPLE_ROW`** y el aviso de "Estructura de ejemplo" al
> conectar la tabla a datos reales. Es una fila falsa que puse para poder evaluar el
> layout; los valores de Tipo/Prioridad/Estado que lleva son inventados.

### 2. "Compañía" apunta a una tabla que ya no existe — decidido: texto libre ✅

**Decidido (octubre de 2026):** "Compañía" será una columna `text` libre.

> **Actualización:** la jerarquía de los casos cambió. Ahora la pantalla navega Epic → Feature →
> tabla, así que cada caso colgará de un **Feature** (`test_cases.feature_id references features(id)`,
> probablemente `on delete cascade`). Queda descartada la idea anterior de "independiente con `epic_id`
> opcional" y el filtro por Epic (`EpicFilter`) se eliminó. "Compañía" sigue siendo texto libre.

Antes estaba sin resolver porque `companies` se borró en la migración; se descartaron la tabla
nueva de compañías y apuntar a los Epics.

### 3. El drag & drop del tablero — verificado ✅

Verificado a mano por el usuario (octubre de 2026). Antes no se había podido probar porque la
herramienta de automatización arrastra en un solo salto y el `PointerSensor` de dnd-kit exige
`activationConstraint: { distance: 10 }`.

### 4. Regla de completado: probar contra la base 🔴

El código está escrito (`src/lib/completionGuard.js`, `useEpics`, `useFeatures`) y los triggers
viven en las migraciones 4 y 9. Tras aplicarlas, probar: un Feature con un bug en `nuevo`/
`en_progreso`/`bloqueado` → Completado debe avisar y no cambiar; pasar el bug a `para_despliegue`/
`completado` y reintentar debe dejarlo pasar; igual con un Epic con features sin completar.

**Lo que la regla NO cubre** (decisión pendiente): solo mira hacia abajo al *cambiar a*
Completado. Si después **se crea un bug** en un Feature completado, o se **agrega un Feature** a un
Epic completado, queda un padre Completado con trabajo abierto. Las opciones son bloquear esas
acciones, mostrar una advertencia, o aceptarlo. Ojo con la tentación de "bajar el padre a En
progreso automáticamente": sería estado derivado, rechazado antes (ver *Estados manuales, nunca
derivados*).

### 5. Autenticación y roles — probar contra la base 🔴

Está todo en el código (ver [Cambios de esta sesión](#cambios-de-esta-sesión-7-oct-2026) y
[README](README.md#autenticación-y-roles)); falta **aplicar las migraciones 5–8** y probar los tres
flujos: QA hace todo y asigna; el Dev solo ve sus bugs y solo mueve `dev_status`; el Viewer solo lee.
Las migraciones y el bootstrap están arriba en [Migraciones por aplicar](#migraciones-por-aplicar).

**Pendientes menores conocidos:**

- En `CommentsPanel` el botón de borrar comentario se muestra siempre; para el Dev ese borrado lo
  rechaza el RLS (QA borra comentarios). Conviene ocultarlo según el rol.
- La base no valida que el `assigned_dev_id` sea de rol `dev` (ni el QA de rol `qa`); hoy lo
  garantiza solo la UI, que ofrece cada lista por separado.

### 6. Fechas de creación editables: `created_at` ya no es un registro fiable

Como `created_at` se puede fijar a mano en features y bugs, ya no sirve como marca de
auditoría de cuándo se insertó la fila. Si algún día hace falta eso, habría que añadir
una columna aparte (p. ej. `reported_at` para la fecha editable) y dejar `created_at`
intacto. Hoy no hace falta, pero conviene saberlo antes de apoyar reportes en esa columna.

### 7. Bundle de 680 kB

`vite build` avisa de un chunk mayor a 500 kB. No es urgente; `React.lazy` por ruta lo
resolvería.

---

## Decisiones y por qué

Esto es lo que no se deduce leyendo el código.

**Estados manuales, nunca derivados.** El sistema anterior calculaba el estado de la
compañía desde las fases del checklist, y resultaba impredecible. Ahora Epic, Feature y
Bug tienen estado que el usuario elige. Si aparece la tentación de "calcularlo solo",
recordar que esto fue un rechazo explícito.

**`text` + `CHECK` en vez de enums de Postgres.** Sin framework de migraciones, cambiar un
enum exige `ALTER TYPE ... ADD VALUE`, y quitar o renombrar un valor obliga a recrear el
tipo y todas sus columnas. Un `CHECK` se cambia en una línea. El coste es que los valores
están duplicados entre el SQL y `src/lib/domain.js`.

**Triggers: `set_updated_at` y dos de solo validación.** Toda esta migración existe porque
había un trigger invisible generando datos que nadie podía auditar. No se reintrodujo
magia oculta: no hay triggers de negocio que escriban datos. Los triggers de
`completion_guard` solo *rechazan* un UPDATE incoherente (SQLSTATE `QA001`); no escriben nada.
Se usó trigger porque una regla entre tablas no cabe en un `CHECK`.

**Estados del tablero (octubre de 2026): Nuevo · En progreso · Bloqueado · Para despliegue ·
Completado.** Reemplazaron a `nuevo/en_progreso/resuelto/cerrado`. Con el cambio se **eliminó la
lógica de "Reabierto"** (se evaluó y se descartó por ahora); la columna `bugs.is_reopened` quedó
latente (siempre `false`) por si se retoma. "Bug abierto" = `nuevo`/`en_progreso`/`bloqueado`.

**Posiciones fraccionarias (`position numeric`) solo en `bugs`.** Es el único sitio con
drag. Un arrastre = **1 UPDATE de 1 fila**. El código anterior reescribía el tablero
entero (una petición HTTP por tarjeta) y además su `catch` era código muerto: mostraba
"Orden guardado" aunque fallaran todas las escrituras, porque `supabase-js` no rechaza la
promesa. `src/lib/position.js` incluye `needsRenormalize` por si las posiciones se agotan
tras ~50 inserciones en el mismo hueco.

**Las notas borran con `SET NULL`, no `CASCADE`.** Son contenido escrito a mano; borrar un
Epic no debe hacerlas desaparecer en silencio. Pasan a globales.

**Los datos se piden desde hooks.** El `Dashboard.jsx` viejo tenía 10 llamadas a Supabase
embebidas en el componente, en 865 líneas. Ahora los componentes son presentacionales.

**En el Backlog no hay drag.** Se evaluó y el usuario eligió ordenar por fecha de creación.
Por eso `position` solo existe en `bugs`.

### El árbol del backlog

La pantalla pasó por varias iteraciones hasta llegar a esta forma. Lo que conviene saber
antes de volver a moverla:

**Una sola tabla para los tres niveles, y la sangría solo en la primera columna.** Es lo más
importante de `Backlog.jsx` / `treeLayout.js`. Antes cada nivel tenía su propia rejilla y
alinear su Estado con el del Epic exigía compensar el padding de la lista y el borde de las
tarjetas (`TREE_EDGE_INSET`, una constante frágil: si se tocaba ese padding la alineación se
rompía en silencio). Al volver todo filas de una misma tabla, la alineación es gratis. Al
añadir columnas, añádelas en la cabecera de `Backlog.jsx` y en las celdas de los tres niveles.

**La jerarquía se marca por sangría, ícono y fondo.** Epic: avatar con iniciales. Feature:
carpeta violeta, fila con fondo suave (más marcado si está abierto). Bug: ícono ámbar
(`BUG_ACCENT`), fondo algo más oscuro y una línea conectora que cuelga de la carpeta del
feature. Las filas anidadas llevan una franja violeta a la izquierda (`NESTED_STRIP`). Ya no
hay tarjetas por feature.

**No hay carpeta "Bugs" intermedia.** Existió y se quitó: añadía una fila y un clic por
feature sin aportar nada, porque el conteo ya está en la columna del feature.

**Los botones de agregar viven en la fila del padre, pero el formulario en el hijo.**
`+ Feature` está en la fila del Epic y `+ Bug` en la del Feature, mientras que los
formularios y sus mutaciones viven en `EpicExpandedDetail` y `FeatureBugList`, junto al
hook que los alimenta (`useFeatures(epicId)` / `useBugs({featureId})`, que solo existen
cuando el padre está desplegado). Se conectan con una señal por props en vez de duplicar
la lógica de creación. Efecto secundario deseado: pulsar "+" con el padre colapsado lo
despliega solo.

**El menú de Radix no responde a clics programáticos**, solo a punteros reales. Si estás
automatizando pruebas sobre el menú de tres puntos, esto te va a despistar.

### Detalles de layout que parecen arbitrarios pero no lo son

**El detalle expandido de Casos de Prueba es `sticky left-0`.** La celda abarca los 1.900px
de la tabla; sin el sticky, el contenido queda anclado a la izquierda y desaparece al
hacer scroll horizontal.

**El chevron de expandir va en la primera columna**, no en una columna "Acciones" al final:
con 11 columnas habría que cruzar toda la tabla solo para abrir el detalle.

**`TestCases.jsx` no envuelve `<Table>` en un `div.overflow-x-auto`.** El componente
`Table` de shadcn ya trae el suyo; anidar dos scrolls hace que la rueda del ratón no
enganche. Las otras páginas sí tienen ese wrapper heredado, pero ahí la tabla no desborda,
así que no molesta.

**`TestCases.jsx` no tiene `max-w-[1400px]`** como el resto de páginas. Con 11 columnas,
cada píxel cuenta.

---

## Dónde mirar primero

| Si vas a tocar... | Empieza por |
|---|---|
| El dominio (estados, colores, severidades) | `src/lib/domain.js` |
| Cualquier consulta a la base | `src/hooks/` — el patrón está en `useNotes.js` |
| La jerarquía del backlog | `src/pages/Backlog.jsx` → `EpicExpandedDetail` → `FeatureBugList` |
| Anchos de columna y sangrías del árbol | `src/components/backlog/treeLayout.js` |
| Etiqueta y acciones de las filas del árbol | `src/components/backlog/TreeRow.jsx` |
| Fecha de creación de features y bugs | `CreatedAtField.jsx` + `dateInputToTimestamp` en `src/lib/format.js` |
| El tablero, su drag y la clasificación de bugs | `src/pages/BugBoard.jsx` + `src/lib/position.js` + `BugFormSheet` (modo `board`) |
| Casos de Prueba (navegación) | `src/pages/TestCases.jsx` (drill-down Epic → Feature → tabla) |
| La tabla de casos y sus campos | `src/components/testcases/TestCaseTable.jsx` (`COLUMNS`, `DETAIL_FIELDS`, `EXAMPLE_ROW`) |
| Sesión y rol del usuario | `src/context/AuthContext.jsx` + `src/components/auth/ProtectedRoute.jsx` |
| Qué puede cada rol | `src/lib/domain.js` (`ROLES`, `canManageBacklog`) + la migración `20261006130000_auth_roles.sql` |
| La pantalla del Dev | `src/pages/MyBugs.jsx` + `setDevStatus` en `src/hooks/useBugs.js` |
| Nombres / asignación / creador | `src/hooks/useProfiles.js` (`profileDisplayName`) + `src/components/backlog/assignments.jsx` |
| Las notas | `src/pages/Notes.jsx` + `src/components/notes/NoteCard.jsx` + `src/hooks/useNotes.js` |
| El modelo completo (tablas, estados) | `supabase/MODELO.md` |
| El esquema SQL | `supabase/README.md` y `supabase/migrations/` |
