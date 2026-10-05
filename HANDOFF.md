# Handoff — QANBAN

Estado al **5 de octubre de 2026**. Último commit: `e0db7e7 feat: some revamps in the backlog`
(el rediseño del backlog como árbol de carpetas).

> ⚠️ Hay cambios **sin commitear** sobre ese commit: tabla única para Epic/Feature/Bug,
> bugs sin estado en el Backlog, fecha de creación editable, y desinstaladas las
> dependencias huérfanas. Todo compila y pasa lint. Detalle en "Cambios recientes".

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

Las migraciones **ya están aplicadas** en el proyecto remoto de Supabase, y estos flujos se
verificaron de punta a punta contra la base real:

- Crear, editar, borrar y cambiar estado de Epics, Features y Bugs.
- Navegación en árbol de carpetas: Epic → Feature → Bugs, desplegable por nivel.
- **Marcado automático de "Reabierto"** al cambiar el estado desde la hoja de clasificación
  del Tablero: al mover un bug de `resuelto`/`cerrado` a `nuevo`/`en_progreso` se marca
  solo, con etiqueta roja y toast.
- Agregar feature desde la fila del Epic y agregar bug desde la fila del Feature, incluso
  con el padre colapsado (se despliega solo).
- Comentarios en Features y en Bugs, con hilos y contadores independientes.
- Métricas del backlog y contador de bugs por feature (se refresca al crear o borrar bugs).
- Notas vinculables a Epic, Feature o Bug (o globales).
- Modo claro/oscuro, instantáneo.

`npm run lint` y `npm run build` pasan limpios.

### Cambios recientes (sin commitear)

- **Tabla única (experimento reciente).** Antes, los features y bugs eran listas con rejilla
  propia dentro de una celda del Epic, con cabeceras de columna repetidas y ~40 líneas de
  cálculo para alinear su Estado con el del Epic. Ahora Epics, Features y Bugs son **filas de
  la misma tabla**: la primera columna se llama "Elemento", no hay sub-cabeceras, y Estado,
  Fecha y Acciones se leen de la cabecera principal (mismo `x` en los tres niveles, medido).
  La jerarquía se marca con sangría, ícono (avatar / carpeta / bug ámbar), fondos escalonados,
  la franja violeta a la izquierda de las filas anidadas y una línea que cuelga de la carpeta
  del feature hasta sus bugs (`Connector`). Cada feature muestra su conteo de bugs como
  chip junto al nombre. Se hizo para *probar cómo queda*; la versión anterior (rejilla
  `TREE_GRID` con tarjetas por feature) **nunca se commiteó**: solo queda una copia temporal
  fuera del repo. Si el experimento convence, conviene commitearlo; si no, hay que pedir que
  se reconstruya la anterior. Los anchos de columna y sangrías viven en
  `src/components/backlog/treeLayout.js`.
- **Los bugs se registran en el Backlog y se clasifican en el Tablero.** Para no manejar
  las mismas opciones en dos sitios, el Backlog ya no muestra ni edita estado, severidad,
  prioridad ni la etiqueta "Reabierto" de un bug; solo título, descripción y fecha. Todo
  eso vive en el Tablero de Bugs: la tarjeta muestra severidad, prioridad y "Reabierto", y
  al abrirla sale la hoja *Clasificar Bug* (estado, severidad, prioridad; el título y la
  descripción solo se leen). `BugFormSheet` tiene por eso dos modos, `backlog` y `board`.
  Un bug nuevo nace con los defaults de la base: `nuevo`, severidad `media`, prioridad `media`.
  El menú de acciones de la fila del bug (Notas, editar, eliminar) sí se queda en el Backlog.
- **"Ver en el tablero →"** en cada bug del Backlog lleva a `/bugs?bug=<id>`. El Tablero
  centra esa tarjeta, la resalta 3,5 s y limpia el parámetro de la URL para que recargar no
  la resalte otra vez. El botón ocupa la celda de Estado de la fila del bug.
- **Mockup de imágenes en el formulario de bug** (`BugImagesPlaceholder`): solo la zona de
  arrastrar y soltar, inerte y marcada "Próximamente". Detalle y decisiones
  pendientes en [PENDIENTES.md](PENDIENTES.md).
- **`updateBug` ahora respeta las reglas de estado.** Antes, cambiar el estado desde un
  formulario no marcaba "Reabierto" ni recolocaba la tarjeta; ahora lo hace igual que el
  drag. Se eliminó `updateBugStatus`, que solo usaba el dropdown del Backlog.
- **Fecha de creación editable** en features y bugs (`CreatedAtField`), también visible
  como columna. **No hizo falta migración**: se escribe en `created_at`, que ya era una
  columna normal con default `now()`, sin restricción en RLS. Probado de punta a punta
  cambiando la fecha de un bug real y restaurándola.
- Se desinstalaron `canvas-confetti` y `@fontsource-variable/inter`.

---

## Pendientes

### 1. Casos de Prueba — definir los valores seleccionables 🔴

Es el trabajo activo. La pantalla ([src/pages/TestCases.jsx](src/pages/TestCases.jsx))
tiene la estructura lista pero **no está conectada a la base de datos**: no hay tabla
`test_cases` ni migración para ella.

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

### 2. "Compañía" apunta a una tabla que ya no existe 🔴

Es uno de los 15 campos de Casos de Prueba, pero `companies` se borró en la migración.
**Está sin resolver.** Las opciones planteadas al usuario, sin respuesta todavía:

- texto libre,
- una tabla nueva de compañías,
- o que apunte a los Epics.

Hay que decidirlo antes de escribir la migración de `test_cases`.

### 3. El drag & drop del tablero nunca se verificó ⚠️

El código está escrito y la lógica es correcta a la lectura, pero **no se pudo probar**.
La herramienta de automatización hace el arrastre en un solo salto y el `PointerSensor`
de dnd-kit tiene `activationConstraint: { distance: 10 }`, así que nunca se activaba:
solo seleccionaba texto.

Hay que probarlo a mano. Lo que importa comprobar:

- que arrastrar entre columnas cambie el estado del bug y persista;
- que mover un bug de **Resuelto → Nuevo arrastrando** también lo marque como reabierto
  (la regla vive en `shouldFlagReopen`, y la llaman tanto `updateBug` —la hoja de
  clasificación, esa sí probada— como `moveBug` desde `handleDragEnd`; si solo funcionara
  en uno, discreparían).

### 4. Sin autenticación

Ver el aviso del [README](README.md#seguridad). No es un olvido, es una decisión
consciente con su checklist de salida documentado en el SQL de RLS. El login y el
"Cerrar sesión" son solo navegación.

### 5. Fechas de creación editables: `created_at` ya no es un registro fiable

Como `created_at` se puede fijar a mano en features y bugs, ya no sirve como marca de
auditoría de cuándo se insertó la fila. Si algún día hace falta eso, habría que añadir
una columna aparte (p. ej. `reported_at` para la fecha editable) y dejar `created_at`
intacto. Hoy no hace falta, pero conviene saberlo antes de apoyar reportes en esa columna.

### 6. Bundle de 680 kB

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

**Un solo trigger en toda la base: `set_updated_at`.** Toda esta migración existe porque
había un trigger invisible generando datos que nadie podía auditar. No se reintrodujo
magia oculta: el flag de "Reabierto" lo calcula el frontend, a la vista.

**"Reabierto" es un booleano, no un quinto estado.** Se evaluó un contador de reaperturas
("Reabierto ×3") y el usuario lo descartó: prefirió la señal simple.

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
| Casos de Prueba | `src/pages/TestCases.jsx` (`COLUMNS` y `DETAIL_FIELDS` al inicio) |
| El esquema SQL | `supabase/README.md` y `supabase/migrations/` |
