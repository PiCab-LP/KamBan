-- =============================================================================
-- 20261007120000_creators_and_assignment.sql
-- Creador (`created_by`) en epics/features/bugs y asignación al crear.
--
--   - Unifica el nombre del creador: bugs.creator_id -> bugs.created_by.
--   - epics y features ganan `created_by` (lo estampa la base con auth.uid()).
--   - features gana `assigned_qa_id` (solo QA; el feature NO se asigna a un dev).
--   - Regenera guard_dev_bug_update() por el renombre de la columna.
--
-- No cambia RLS: escribir epics/features/bugs ya está restringido a QA
-- (20261006130000_auth_roles.sql), y `created_by` lo pone el default, no el cliente.
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

-- 1) Unificar el nombre del creador en bugs. El rename conserva los datos y el
--    default auth.uid() de la columna.
alter table public.bugs rename column creator_id to created_by;

comment on column public.bugs.created_by is
  'Autor del bug. Lo estampa la base con default auth.uid(); el cliente no lo manda.';

-- 2) Epics: solo creador.
alter table public.epics
  add column created_by uuid references public.profiles(id) default auth.uid();

comment on column public.epics.created_by is
  'Autor del epic (default auth.uid()). Los epics no se asignan.';

-- 3) Features: creador + QA asignado (sin dev).
alter table public.features
  add column created_by     uuid references public.profiles(id) default auth.uid(),
  add column assigned_qa_id uuid references public.profiles(id);

create index features_assigned_qa_idx
  on public.features (assigned_qa_id) where assigned_qa_id is not null;

comment on column public.features.created_by is
  'Autor del feature (default auth.uid()).';
comment on column public.features.assigned_qa_id is
  'QA responsable del feature. Informativo: no cambia la visibilidad del dev.';

-- 4) Regenerar el guard del dev: la columna del creador ahora es created_by.
create or replace function public.guard_dev_bug_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_role() = 'dev' then
    if (new.feature_id,  new.title,      new.description,    new.status,
        new.severity,    new.priority,   new.is_reopened,    new.position,
        new.created_at,  new.created_by, new.assigned_qa_id, new.assigned_dev_id)
       is distinct from
       (old.feature_id,  old.title,      old.description,    old.status,
        old.severity,    old.priority,   old.is_reopened,    old.position,
        old.created_at,  old.created_by, old.assigned_qa_id, old.assigned_dev_id)
    then
      raise exception 'Un dev solo puede cambiar el estado de corrección del bug.'
        using errcode = 'QA002';
    end if;
  end if;
  return new;
end;
$$;

commit;


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='bugs' and column_name in ('created_by','creator_id');
--   -- debe aparecer created_by y NO creator_id
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='features'
--     and column_name in ('created_by','assigned_qa_id');
