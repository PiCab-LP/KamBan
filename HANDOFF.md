# Handoff — QANBAN

Estado al **5 de octubre de 2026**. Último commit: `fdd3582 feat: change kamban to qanban`.

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

### Lo que funciona hoy (verificado en navegador)

- Crear, editar, borrar y cambiar estado de Epics, Features y Bugs.
- Expansión anidada de 3 niveles en el Backlog.
- **Marcado automático de "Reabierto"**: al mover un bug de `resuelto`/`cerrado` de vuelta
  a `nuevo`/`en_progreso` se marca solo, con su etiqueta roja y un toast.
- Comentarios en Features y en Bugs, con hilos y contadores independientes.
- Métricas del backlog y contador de bugs por feature.
- Notas vinculables a Epic, Feature o Bug (o globales).
- Modo claro/oscuro, instantáneo.

`npm run lint` y `npm run build` pasan limpios.

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
  (la regla vive en `shouldFlagReopen`, y la llaman tanto el dropdown de la tabla como
  `handleDragEnd`; si solo funcionara en uno, discreparían).

### 4. Datos de prueba en la base

Quedaron dos epics de prueba: **"Prueba"** (creado al verificar la migración) y
**"Autenticación de usuarios"** (con un feature "Login con Google" y un bug marcado como
reabierto). Borrarlos cuando estorben.

### 5. Dependencias huérfanas

`canvas-confetti` y `@fontsource-variable/inter` siguen en `package.json` pero ya no se
usan en `src/`. El confetti se disparaba desde la lógica de estado derivado, que se
eliminó. Se pueden desinstalar.

### 6. Sin autenticación

Ver el aviso del [README](README.md#seguridad). No es un olvido, es una decisión
consciente con su checklist de salida documentado en el SQL de RLS.

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
| El tablero y su drag | `src/pages/BugBoard.jsx` + `src/lib/position.js` |
| Casos de Prueba | `src/pages/TestCases.jsx` (`COLUMNS` y `DETAIL_FIELDS` al inicio) |
| El esquema SQL | `supabase/README.md` y `supabase/migrations/` |
