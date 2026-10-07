# Esquema de base de datos — QANBAN

Este directorio versiona el esquema de Supabase. Antes existía solo en el proyecto
remoto, lo que significaba que nadie podía auditarlo desde el repo — de hecho el
trigger que generaba la plantilla de 6 fases del dominio viejo era invisible aquí.

```
introspection/   scripts de solo lectura, se ejecutan a mano
migrations/      el esquema, en orden cronológico
```

`introspection/` queda deliberadamente fuera de `migrations/`: si algún día se corre
`supabase db push`, el CLI ejecuta todo lo que haya en `migrations/`, y un script de
solo lectura ahí sería ruido.

## Cómo aplicar

No hay `psql` local. Todo se ejecuta en el **SQL Editor del dashboard de Supabase**,
pegando cada archivo completo y en este orden:

| # | Archivo | Qué hace |
|---|---|---|
| 0 | `introspection/00_inspect_legacy.sql` | **Solo lectura.** Guardar la salida. |
| 1 | `migrations/20261002120000_drop_legacy.sql` | Borra el dominio viejo. **Destructivo.** |
| 2 | `migrations/20261002120100_create_qa_schema.sql` | Crea epics, features, bugs, comments, notes. |
| 3 | `migrations/20261002120200_rls_policies.sql` | Activa RLS (permisiva, sin auth). |
| 4 | `migrations/20261006120000_completion_guard.sql` | Triggers: no completar con trabajo pendiente. |
| 5 | `migrations/20261006130000_auth_roles.sql` | **Auth real:** `profiles`, roles, asignación de bugs y RLS estricto. Reemplaza lo permisivo del paso 3. |
| 6 | `migrations/20261007120000_creators_and_assignment.sql` | `created_by` en epics/features/bugs y `assigned_qa_id` en features. Renombra `bugs.creator_id` → `created_by`. |
| 7 | `migrations/20261007130000_notes_created_by.sql` | `created_by` en notes (autor de la nota). |
| 8 | `migrations/20261007140000_profiles_full_name.sql` | `full_name` en profiles (nombre a mostrar). |
| 9 | `migrations/20261007150000_bug_statuses.sql` | Estados del tablero: nuevo · en_progreso · bloqueado · para_despliegue · completado. Remapea resuelto/cerrado. |

Antes del paso 1: **backup** desde Dashboard → Database → Backups, y revisar la salida
de la consulta 5 de la introspección para confirmar qué funciones va a borrar el script.

## Modelo

```
epics ──┬── features ──┬── bugs ──┬── comments (bug_id)
        │              │          └── notes    (bug_id,     SET NULL)
        │              ├── comments (feature_id)
        │              └── notes    (feature_id, SET NULL)
        └── notes (epic_id, SET NULL)
```

La jerarquía borra en **CASCADE** hacia abajo: borrar un Epic elimina sus Features y
sus Bugs. Las notas usan **SET NULL** porque son contenido escrito a mano y no deben
desaparecer en silencio: pasan a ser globales.

Mapeo completo de cada tabla, sus columnas y los estados que acepta: [MODELO.md](MODELO.md).

## Decisiones

**`text` + `CHECK` en vez de enums de Postgres.** Sin framework de migraciones, cambiar
un enum exige `ALTER TYPE ... ADD VALUE`, y quitar o renombrar un valor obliga a recrear
el tipo y todas las columnas que lo usan. Un `CHECK` se cambia en una línea:

```sql
alter table bugs drop constraint bugs_severity_check;
alter table bugs add  constraint bugs_severity_check check (severity in (...));
```

PostgREST expone ambos como string al cliente, así que no se pierde nada.

> **Importante:** los valores de estado están duplicados entre estos `CHECK` y
> `src/lib/domain.js`. Al cambiar uno hay que cambiar el otro. Es el precio de no usar
> enums y está anotado en ambos sitios.

**Triggers: `set_updated_at()` y dos que solo validan.** Toda esta migración existe porque
había un trigger invisible generando datos que nadie podía auditar. No se reintroduce magia
oculta: no hay triggers de lógica de negocio que escriban datos.

Los triggers `features_guard_completion` y `epics_guard_completion` (migración 4, con el conjunto
de "abiertos" actualizado en la 9) **no escriben ni derivan nada**: rechazan con el SQLSTATE `QA001`
un UPDATE que ponga "Completado" mientras haya bugs abiertos (`nuevo`/`en_progreso`/`bloqueado`) o,
en un Epic, features sin completar.
Una regla entre tablas no se puede expresar con un `CHECK`, por eso es un trigger. Solo
actúan al *cambiar* a Completado, y los "bugs abiertos" están duplicados en
`OPEN_BUG_STATUSES` (`src/lib/domain.js`).

**`position` solo en `bugs`.** Es el único sitio con drag & drop (el Tablero de Bugs).
Epics y Features se ordenan por `created_at`. Es `numeric` para permitir posiciones
fraccionarias: insertar entre dos vecinos es un `UPDATE` de una sola fila en vez de
reescribir la lista entera. Ver `src/lib/position.js`.

## Autenticación y roles (migración 5)

`20261006130000_auth_roles.sql` reemplaza las políticas permisivas del paso 3 por **RLS
estricto por rol** y agrega el flujo de asignación de bugs. A partir de ahí la app debe
autenticarse (Supabase Auth, email + contraseña); el rol `anon` pierde todo acceso.

- **`profiles`** (`id` → `auth.users`, `email`, `full_name`, `role` ∈ `qa`/`dev`/`viewer`). Se crea
  sola (rol `viewer`) con un trigger sobre `auth.users`. El rol y el `full_name` se fijan a mano en el
  dashboard; la UI muestra a las personas por su `full_name` (o el correo si no tiene).
- **`user_role()`** (`security definer`): lee el rol del usuario actual sin recursar RLS; lo usan
  todas las políticas.
- **`bugs`** gana `created_by` (`default auth.uid()`; antes `creator_id`), `assigned_qa_id`, `assigned_dev_id` y
  `dev_status` (`pendiente`/`corregido`/`revisado`).
- **Reglas:** qa escribe todo; viewer solo lee; **dev solo lee sus bugs asignados y solo cambia
  `dev_status`** — lo garantizan la política de `bugs` y el trigger `guard_dev_bug_update`
  (SQLSTATE `QA002`, mismo patrón "trigger que solo valida" que `completion_guard`).
- Valores de rol y `dev_status` **duplicados** en `src/lib/domain.js` (`ROLES`, `DEV_STATUS`).

> **Bootstrap:** al aplicar la migración todas las cuentas son `viewer`. Hay que poner al menos
> un `qa` en `profiles` desde el dashboard para poder operar (hay un `update` de ejemplo al final
> del archivo).

El checklist histórico de "cómo salir de lo permisivo" sigue en la cabecera de
`20261002120200_rls_policies.sql`; esta migración lo ejecuta.
