# Modelo de datos — QANBAN

Referencia de todas las tablas, sus columnas y los estados que aceptan. Para el detalle de
esquema y las decisiones de diseño, ver [README.md](README.md); para los roles y la seguridad,
ver [../README.md](../README.md#autenticación-y-roles).

> **Los valores de estado están duplicados** entre los `CHECK` del SQL y `src/lib/domain.js`.
> Al cambiar uno hay que cambiar el otro (y a veces más sitios; ver [Cambiar un estado](#cambiar-un-valor-de-estado)).

## Jerarquía

```
epics ──┬── features ──┬── bugs ──┬── comments (bug_id)
        │              │          └── notes    (bug_id,     SET NULL)
        │              ├── comments (feature_id)
        │              └── notes    (feature_id, SET NULL)
        └── notes (epic_id, SET NULL)

profiles (1 por usuario de auth.users)  ──<  created_by (epics/features/bugs/notes)
                                             assigned_qa_id (features/bugs) · assigned_dev_id (bugs)
```

La jerarquía borra en **CASCADE** hacia abajo. Las notas usan **SET NULL**: borrar un padre no
las elimina, pasan a globales.

| Tabla | ¿Campos de estado? | Migración |
|---|---|---|
| [`epics`](#1-epics) | `status` | `20261002120100_create_qa_schema.sql` |
| [`features`](#2-features) | `status` | `20261002120100` |
| [`bugs`](#3-bugs) | `status`, `severity`, `priority`, `dev_status`, `is_reopened` | `20261002120100` + `20261006130000` |
| [`comments`](#4-comments) | — | `20261002120100` |
| [`notes`](#5-notes) | — (`is_pinned`, `color`) | `20261002120100` |
| [`profiles`](#6-profiles) | `role` | `20261006130000_auth_roles.sql` |
| [`test_cases`](#7-test_cases--pendiente) | pendiente de definir | — (aún no existe) |

---

## 1. `epics`

Nivel 1 de la jerarquía. Agrupa features.

| Columna | Tipo | Obligatorio / Default | Notas |
|---|---|---|---|
| `id` | uuid | auto | Clave primaria |
| `name` | text | sí | 1–200 caracteres; único sin importar mayúsculas |
| `status` | text | default `pendiente` | **Enumerado** (ver abajo) |
| `created_by` | uuid | default `auth.uid()` | → `profiles` (autor). Los epics no se asignan |
| `created_at` | timestamptz | default `now()` | Editable desde la UI |
| `updated_at` | timestamptz | default `now()` | Lo mantiene el trigger `set_updated_at` |

**`status`:** `pendiente` · `en_progreso` · `en_qa` · `completado`

> `completado` queda **bloqueado** (SQLSTATE `QA001`) si el Epic tiene features sin completar o
> bugs abiertos. Constante `ENTITY_STATUS` en `src/lib/domain.js`.

---

## 2. `features`

Nivel 2. Cuelga de un Epic, agrupa bugs. Comparte el vocabulario de estados con los Epics.

| Columna | Tipo | Obligatorio / Default | Notas |
|---|---|---|---|
| `id` | uuid | auto | Clave primaria |
| `epic_id` | uuid | sí | → `epics`, **CASCADE** |
| `name` | text | sí | 1–200 caracteres |
| `description` | text | opcional | Hasta 2000 caracteres |
| `status` | text | default `pendiente` | **Enumerado** |
| `created_by` | uuid | default `auth.uid()` | → `profiles` (autor) |
| `assigned_qa_id` | uuid | opcional | → `profiles` (QA responsable). **Informativo**: no cambia qué ve el Dev |
| `created_at` | timestamptz | default `now()` | Editable desde la UI |
| `updated_at` | timestamptz | default `now()` | Trigger |

**`status`:** `pendiente` · `en_progreso` · `en_qa` · `completado`

> `completado` bloqueado si el feature tiene bugs en `nuevo`/`en_progreso`. El feature se asigna
> solo a **QA**, nunca a un Dev; se puede asignar al crear o al editar.

---

## 3. `bugs`

Nivel 3. Cuelga de un feature. Es la tabla con más campos de estado.

| Columna | Tipo | Obligatorio / Default | Notas |
|---|---|---|---|
| `id` | uuid | auto | Clave primaria |
| `feature_id` | uuid | sí | → `features`, **CASCADE** |
| `title` | text | sí | 1–200 caracteres |
| `description` | text | opcional | Hasta 5000 caracteres |
| `status` | text | default `nuevo` | **Enumerado** — estado del Tablero, lo maneja QA |
| `severity` | text | default `media` | **Enumerado** |
| `priority` | text | default `media` | **Enumerado** |
| `dev_status` | text | default `pendiente` | **Enumerado** — avance del Dev, independiente de `status` |
| `is_reopened` | boolean | default `false` | Marca de reabierto; **no** es un estado enumerado |
| `position` | numeric | default `0` | Orden dentro de la columna del tablero |
| `created_by` | uuid | default `auth.uid()` | → `profiles` (autor). Lo pone la base, no el cliente |
| `assigned_qa_id` | uuid | opcional | → `profiles` (QA responsable de verificar/cerrar) |
| `assigned_dev_id` | uuid | opcional | → `profiles` (Dev que corrige) |
| `created_at` | timestamptz | default `now()` | Editable desde la UI |
| `updated_at` | timestamptz | default `now()` | Trigger |

**Estados que acepta:**

| Campo | Valores | Constante |
|---|---|---|
| `status` | `nuevo` · `en_progreso` · `resuelto` · `cerrado` | `BUG_STATUS` |
| `severity` | `critica` · `alta` · `media` · `baja` | `BUG_SEVERITY` |
| `priority` | `alta` · `media` · `baja` | `BUG_PRIORITY` |
| `dev_status` | `pendiente` · `corregido` · `revisado` | `DEV_STATUS` |

> - `is_reopened` pasa a `true` al mover un bug de `resuelto`/`cerrado` a `nuevo`/`en_progreso`.
>   Al reabrir, `dev_status` vuelve a `pendiente`.
> - El **Dev asignado** solo puede cambiar `dev_status` (lo garantiza el trigger
>   `guard_dev_bug_update`, SQLSTATE `QA002`). Todo lo demás es de QA.
> - Las columnas del Tablero (`BUG_COLUMNS`) son los cuatro valores de `status`, en ese orden.

---

## 4. `comments`

Hilos de comentarios. Cada comentario cuelga de **un** feature **o** de **un** bug, nunca de ambos.

| Columna | Tipo | Obligatorio / Default | Notas |
|---|---|---|---|
| `id` | uuid | auto | Clave primaria |
| `feature_id` | uuid | uno de los dos | → `features`, CASCADE |
| `bug_id` | uuid | uno de los dos | → `bugs`, CASCADE |
| `content` | text | sí | 1–5000 caracteres |
| `created_at` | timestamptz | default `now()` | — |

**Estados que acepta:** ninguno.

> Restricción: debe tener `feature_id` **o** `bug_id` (exactamente uno).

---

## 5. `notes`

Notas del equipo. Pueden ir sueltas (globales) o ligadas a **un** Epic, feature o bug.

| Columna | Tipo | Obligatorio / Default | Notas |
|---|---|---|---|
| `id` | uuid | auto | Clave primaria |
| `epic_id` | uuid | opcional | → `epics`, **SET NULL** |
| `feature_id` | uuid | opcional | → `features`, SET NULL |
| `bug_id` | uuid | opcional | → `bugs`, SET NULL |
| `content` | text | sí | 1–10000 caracteres |
| `color` | text | opcional | Hex tipo `#AABBCC` |
| `is_pinned` | boolean | default `false` | Nota fijada arriba |
| `created_by` | uuid | default `auth.uid()` | → `profiles` (autor; solo QA crea notas) |
| `created_at` | timestamptz | default `now()` | — |
| `updated_at` | timestamptz | default `now()` | Trigger (se actualiza en cada edición) |

**Estados que acepta:** ninguno enumerado. Solo `is_pinned` (booleano) y `color` (texto hex).

> A lo sumo un vínculo. Si borras el padre, la nota no desaparece: pasa a global.

---

## 6. `profiles`

Un registro por usuario de Supabase Auth. Guarda el rol que usa todo el RLS.

| Columna | Tipo | Obligatorio / Default | Notas |
|---|---|---|---|
| `id` | uuid | sí | Clave primaria; → `auth.users`, CASCADE |
| `email` | text | — | Copiado al crear la cuenta |
| `full_name` | text | opcional | Nombre a mostrar. Se carga a mano en el dashboard; si es null, la UI usa el correo |
| `role` | text | default `viewer` | **Enumerado** |

**`role`:** `qa` · `dev` · `viewer`

> La UI muestra a cada persona (asignados, creador, autor de notas, barra lateral) por su
> `full_name`, y cae al `email` si no tiene nombre. Regla única: `full_name?.trim() || email`.

| Rol | Puede |
|---|---|
| `qa` | Crear, editar y borrar todo; clasificar y asignar bugs |
| `dev` | Solo sus bugs asignados: cambiar `dev_status` y comentar |
| `viewer` | Solo lectura de epics, features y bugs |

> Se crea solo (como `viewer`) con un trigger sobre `auth.users`; el rol real lo fija un admin a
> mano en el dashboard. Constante `ROLES` en `src/lib/domain.js`.

---

## 7. `test_cases` — pendiente

Aún **no existe** en la base. Hoy solo hay una maqueta visual en `src/pages/TestCases.jsx`
(`COLUMNS` y `DETAIL_FIELDS`, con una fila de ejemplo). Falta definir los valores de los campos
seleccionables (Suite, Aplicación, Tipo, Prioridad, Rol Requerido, Automatizable, Estado del Caso)
para poder escribir su migración. "Compañía" quedó decidido como **texto libre**, y los casos
serán independientes de la jerarquía, con un `epic_id` opcional solo para el filtro. Ver el
[HANDOFF](../HANDOFF.md).

---

## Cambiar un valor de estado

Como se usa `text + CHECK` en vez de enums de Postgres, cada valor vive duplicado. Para cambiarlo
sin romper nada en silencio:

**Siempre (los dos obligatorios):**

1. La constante en `src/lib/domain.js` (`ENTITY_STATUS` / `BUG_STATUS` / `BUG_SEVERITY` /
   `BUG_PRIORITY` / `DEV_STATUS` / `ROLES`): valor, etiqueta y color.
2. El `CHECK` de la columna en el SQL. Como ya está aplicado en Supabase, hay que correr un
   `ALTER TABLE <tabla> DROP CONSTRAINT <tabla>_<col>_check; ALTER TABLE ... ADD CONSTRAINT ...`
   con los valores nuevos (no basta editar el archivo de migración).

**Dependencias escondidas del valor exacto:**

- **`bugs.status`** → en `domain.js`: `BUG_COLUMNS`, `REOPEN_FROM`/`REOPEN_TO`, `OPEN_BUG_STATUSES`.
  En SQL: el trigger de `20261006120000_completion_guard.sql` (tiene escritos `'nuevo','en_progreso'`).
- **`ENTITY_STATUS`** (sobre todo `completado`) → `COMPLETED_STATUS` en `domain.js` y los triggers de
  `completion_guard.sql`.
- **`bugs.dev_status`** → `DEV_STATUS_ORDER` en `domain.js` y el reset a `'pendiente'` en `useBugs.js`.
- **`profiles.role`** → las políticas RLS y el trigger `guard_dev_bug_update` de `20261006130000`,
  más `canManageBacklog` y `homePathForRole` en `domain.js`.
