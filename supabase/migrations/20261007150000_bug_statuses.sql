-- =============================================================================
-- 20261007150000_bug_statuses.sql
-- Nuevos estados del Tablero de Bugs.
--
--   Antes:  nuevo · en_progreso · resuelto · cerrado
--   Ahora:  nuevo · en_progreso · bloqueado · para_despliegue · completado
--
-- Remapeo de datos: resuelto → para_despliegue, cerrado → completado.
-- "Bug abierto" (métrica y regla de completado) = nuevo / en_progreso / bloqueado.
-- Estos valores están duplicados en src/lib/domain.js (BUG_STATUS, BUG_COLUMNS,
-- OPEN_BUG_STATUSES): al cambiar uno, cambiar el otro.
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

-- 1) Quitar el CHECK viejo para poder remapear a los valores nuevos.
alter table public.bugs drop constraint if exists bugs_status_check;

-- 2) Remapear los bugs existentes (resuelto/cerrado ya no existen).
update public.bugs set status = 'para_despliegue' where status = 'resuelto';
update public.bugs set status = 'completado'      where status = 'cerrado';

-- 3) Nuevo CHECK con los cinco estados.
alter table public.bugs
  add constraint bugs_status_check
  check (status in ('nuevo', 'en_progreso', 'bloqueado', 'para_despliegue', 'completado'));

comment on column public.bugs.status is
  'Estado del Tablero (lo maneja QA): nuevo, en_progreso, bloqueado, para_despliegue, completado.';

-- 4) "Bug abierto" pasa a nuevo/en_progreso/bloqueado. Actualizar los guards de
--    completado para que un Feature/Epic no se complete con bugs en esos estados.
create or replace function public.guard_feature_completion()
returns trigger
language plpgsql
as $$
declare
  open_bugs integer;
begin
  select count(*) into open_bugs
    from public.bugs
   where feature_id = new.id
     and status in ('nuevo', 'en_progreso', 'bloqueado');

  if open_bugs > 0 then
    raise exception
      'No se puede completar el feature: tiene % bug(s) abierto(s).', open_bugs
      using errcode = 'QA001';
  end if;

  return new;
end;
$$;

create or replace function public.guard_epic_completion()
returns trigger
language plpgsql
as $$
declare
  pending_features integer;
  open_bugs        integer;
begin
  select count(*) into pending_features
    from public.features
   where epic_id = new.id
     and status <> 'completado';

  select count(*) into open_bugs
    from public.bugs b
    join public.features f on f.id = b.feature_id
   where f.epic_id = new.id
     and b.status in ('nuevo', 'en_progreso', 'bloqueado');

  if pending_features > 0 or open_bugs > 0 then
    raise exception
      'No se puede completar el epic: tiene % feature(s) sin completar y % bug(s) abierto(s).',
      pending_features, open_bugs
      using errcode = 'QA001';
  end if;

  return new;
end;
$$;

commit;


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- select status, count(*) from public.bugs group by status order by status;
--   -- no debe quedar ningún 'resuelto' ni 'cerrado'.
