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
| 3 | `migrations/20261002120200_rls_policies.sql` | Activa RLS. |
| 4 | `migrations/20261006120000_completion_guard.sql` | Triggers que impiden completar un Epic/Feature con trabajo pendiente. |

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
oculta: el flag de "Reabierto" de los bugs lo calcula el frontend
(`shouldFlagReopen` en `src/lib/domain.js`), no la base de datos.

Los triggers `features_guard_completion` y `epics_guard_completion` (migración 4) **no
escriben ni derivan nada**: rechazan con el SQLSTATE `QA001` un UPDATE que ponga "Completado"
mientras haya bugs abiertos (`nuevo`/`en_progreso`) o, en un Epic, features sin completar.
Una regla entre tablas no se puede expresar con un `CHECK`, por eso es un trigger. Solo
actúan al *cambiar* a Completado, y los "bugs abiertos" están duplicados en
`OPEN_BUG_STATUSES` (`src/lib/domain.js`).

**`position` solo en `bugs`.** Es el único sitio con drag & drop (el Tablero de Bugs).
Epics y Features se ordenan por `created_at`. Es `numeric` para permitir posiciones
fraccionarias: insertar entre dos vecinos es un `UPDATE` de una sola fila en vez de
reescribir la lista entera. Ver `src/lib/position.js`.

## Seguridad

**Las políticas RLS son permisivas a propósito y no protegen nada.** El proyecto no
tiene autenticación: la anon key viaja en el bundle de Vite, es pública, y cualquiera
con DevTools puede leer y escribir todas las tablas vía curl.

No meter datos sensibles ni de clientes reales mientras esto siga así. El archivo
`20261002120200_rls_policies.sql` lleva el detalle completo y el checklist para cuando
se añada autenticación.
