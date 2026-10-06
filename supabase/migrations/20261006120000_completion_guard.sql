-- =============================================================================
-- 20261006120000_completion_guard.sql
-- Un Feature o un Epic no puede pasar a 'completado' mientras tenga trabajo
-- pendiente por debajo.
--
--   Feature -> 'completado' exige: ningún bug en 'nuevo' ni 'en_progreso'.
--   Epic    -> 'completado' exige: todos sus features en 'completado' y
--                                  ningún bug abierto en ellos.
--
-- Estos triggers SOLO VALIDAN: rechazan el UPDATE con una excepción y nunca
-- escriben ni derivan datos. Por eso no contradicen la decisión de "sin magia
-- oculta en la base" (ver supabase/README.md): el estado sigue siendo manual,
-- lo único que hacen es negar un valor incoherente.
--
-- Solo se evalúa al CAMBIAR a 'completado'. Editar el nombre de un feature que
-- ya estaba completado no vuelve a validar nada.
--
-- SQLSTATE 'QA001' es propio de este proyecto: el front lo reconoce en
-- src/lib/completionGuard.js para distinguirlo de otros errores. Los valores de
-- "abierto" ('nuevo','en_progreso') están duplicados en OPEN_BUG_STATUSES
-- (src/lib/domain.js): al cambiar uno hay que cambiar el otro.
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

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
     and status in ('nuevo', 'en_progreso');

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
     and b.status in ('nuevo', 'en_progreso');

  if pending_features > 0 or open_bugs > 0 then
    raise exception
      'No se puede completar el epic: tiene % feature(s) sin completar y % bug(s) abierto(s).',
      pending_features, open_bugs
      using errcode = 'QA001';
  end if;

  return new;
end;
$$;

-- `when` evita ejecutar la función salvo en la transición real a 'completado'.
create trigger features_guard_completion
  before update of status on public.features
  for each row
  when (new.status = 'completado' and old.status is distinct from 'completado')
  execute function public.guard_feature_completion();

create trigger epics_guard_completion
  before update of status on public.epics
  for each row
  when (new.status = 'completado' and old.status is distinct from 'completado')
  execute function public.guard_epic_completion();

comment on function public.guard_feature_completion() is
  'Valida (no escribe): impide completar un feature con bugs en nuevo/en_progreso. SQLSTATE QA001.';
comment on function public.guard_epic_completion() is
  'Valida (no escribe): impide completar un epic con features sin completar o bugs abiertos. SQLSTATE QA001.';

commit;


-- =============================================================================
-- VERIFICACIÓN (cada UPDATE de la lista debe fallar con QA001 si hay pendientes)
-- =============================================================================
-- update public.features set status = 'completado' where id = '<feature con bug abierto>';
-- update public.epics    set status = 'completado' where id = '<epic con features sin completar>';
