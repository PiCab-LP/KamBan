-- =============================================================================
-- 20261006130000_auth_roles.sql
-- Autenticación real + roles (qa / dev / viewer) + asignación de bugs.
--
-- Reemplaza las políticas permisivas de 20261002120200_rls_policies.sql por RLS
-- estricto por rol. A partir de aquí la app DEBE autenticarse: el rol `anon`
-- pierde todo acceso.
--
-- ROLES
--   qa     -> agrega, edita y borra todo.
--   dev    -> solo LEE sus bugs asignados y solo cambia su `dev_status`.
--   viewer -> solo lectura de epics, features y bugs.
--
-- CONVENCIÓN: valores como text + CHECK, duplicados en src/lib/domain.js
-- (ROLES y DEV_STATUS). Al cambiar uno hay que cambiar el otro.
--
-- SQLSTATE propios del proyecto:
--   QA001 -> completar con trabajo pendiente (20261006120000_completion_guard.sql)
--   QA002 -> un dev intenta cambiar algo de un bug que no sea dev_status
--
-- BOOTSTRAP: al aplicar esto, toda cuenta nace con rol 'viewer'. Hay que entrar
-- al dashboard de Supabase y poner al menos un 'qa' en public.profiles para poder
-- operar.
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- PROFILES: un rol por usuario de auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  text not null default 'viewer'
        check (role in ('qa', 'dev', 'viewer'))
);

comment on table public.profiles is
  'Rol de cada usuario. Se crea solo (role=viewer) al registrarse en auth.users; '
  'el rol real lo fija un administrador a mano desde el dashboard de Supabase.';

-- Crea el profile automáticamente cuando nace un usuario en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lee el rol del usuario actual SIN disparar RLS (security definer), para poder
-- usarlo dentro de las políticas sin recursión.
create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.user_role() is
  'Rol del usuario autenticado (qa/dev/viewer) o null. security definer para no '
  'recursar RLS al usarse dentro de las políticas.';


-- ---------------------------------------------------------------------------
-- Columnas de asignación en bugs
-- ---------------------------------------------------------------------------
alter table public.bugs
  add column creator_id      uuid references public.profiles(id) default auth.uid(),
  add column assigned_qa_id  uuid references public.profiles(id),
  add column assigned_dev_id uuid references public.profiles(id),
  add column dev_status      text not null default 'pendiente'
                             check (dev_status in ('pendiente', 'corregido', 'revisado'));

create index bugs_assigned_dev_idx on public.bugs (assigned_dev_id) where assigned_dev_id is not null;
create index bugs_assigned_qa_idx  on public.bugs (assigned_qa_id)  where assigned_qa_id  is not null;

comment on column public.bugs.creator_id is
  'Autor del bug. Lo estampa la base con default auth.uid(); el cliente no lo manda.';
comment on column public.bugs.dev_status is
  'Avance del dev asignado: pendiente -> corregido -> revisado. Independiente de '
  'status (el del tablero, que maneja QA). No se deriva uno del otro.';

-- El dev solo puede tocar dev_status. RLS no filtra por columna, así que un trigger
-- rechaza cualquier otro cambio hecho por un dev. Solo valida, no escribe.
create or replace function public.guard_dev_bug_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_role() = 'dev' then
    if (new.feature_id,  new.title,     new.description, new.status,
        new.severity,    new.priority,  new.is_reopened, new.position,
        new.created_at,  new.creator_id, new.assigned_qa_id, new.assigned_dev_id)
       is distinct from
       (old.feature_id,  old.title,     old.description, old.status,
        old.severity,    old.priority,  old.is_reopened, old.position,
        old.created_at,  old.creator_id, old.assigned_qa_id, old.assigned_dev_id)
    then
      raise exception 'Un dev solo puede cambiar el estado de corrección del bug.'
        using errcode = 'QA002';
    end if;
  end if;
  return new;
end;
$$;

create trigger bugs_guard_dev_update
  before update on public.bugs
  for each row execute function public.guard_dev_bug_update();


-- ---------------------------------------------------------------------------
-- RLS: fuera lo permisivo, dentro lo estricto por rol
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;

drop policy epics_anon_full_access    on public.epics;
drop policy features_anon_full_access on public.features;
drop policy bugs_anon_full_access     on public.bugs;
drop policy comments_anon_full_access on public.comments;
drop policy notes_anon_full_access    on public.notes;

alter table public.profiles enable row level security;

-- PROFILES: cualquier autenticado puede leer la lista (la app arma los selectores
-- de "asignar a QA/Dev" con ella). Nadie la modifica desde la app; los roles se
-- cambian en el dashboard (rol service_role, que salta RLS).
create policy profiles_read on public.profiles
  for select to authenticated using (true);

-- EPICS / FEATURES / NOTES: lee cualquier autenticado; escribe solo QA.
create policy epics_read on public.epics
  for select to authenticated using (true);
create policy epics_write on public.epics
  for all to authenticated
  using (public.user_role() = 'qa') with check (public.user_role() = 'qa');

create policy features_read on public.features
  for select to authenticated using (true);
create policy features_write on public.features
  for all to authenticated
  using (public.user_role() = 'qa') with check (public.user_role() = 'qa');

create policy notes_read on public.notes
  for select to authenticated using (true);
create policy notes_write on public.notes
  for all to authenticated
  using (public.user_role() = 'qa') with check (public.user_role() = 'qa');

-- BUGS:
--   lee: qa y viewer todo; dev solo los suyos.
--   inserta/borra: solo qa.
--   actualiza: qa libre; dev solo los suyos (el trigger lo limita a dev_status).
create policy bugs_read on public.bugs
  for select to authenticated
  using (
    public.user_role() in ('qa', 'viewer')
    or (public.user_role() = 'dev' and assigned_dev_id = auth.uid())
  );

create policy bugs_insert on public.bugs
  for insert to authenticated
  with check (public.user_role() = 'qa');

create policy bugs_delete on public.bugs
  for delete to authenticated
  using (public.user_role() = 'qa');

create policy bugs_update on public.bugs
  for update to authenticated
  using (
    public.user_role() = 'qa'
    or (public.user_role() = 'dev' and assigned_dev_id = auth.uid())
  )
  with check (
    public.user_role() = 'qa'
    or (public.user_role() = 'dev' and assigned_dev_id = auth.uid())
  );

-- COMMENTS:
--   lee: qa y viewer todo; dev solo los de sus bugs asignados.
--   inserta: qa todo; dev solo en sus bugs asignados.
--   borra: solo qa.
create policy comments_read on public.comments
  for select to authenticated
  using (
    public.user_role() in ('qa', 'viewer')
    or (
      public.user_role() = 'dev'
      and bug_id is not null
      and exists (
        select 1 from public.bugs b
        where b.id = comments.bug_id and b.assigned_dev_id = auth.uid()
      )
    )
  );

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    public.user_role() = 'qa'
    or (
      public.user_role() = 'dev'
      and bug_id is not null
      and exists (
        select 1 from public.bugs b
        where b.id = comments.bug_id and b.assigned_dev_id = auth.uid()
      )
    )
  );

create policy comments_delete on public.comments
  for delete to authenticated
  using (public.user_role() = 'qa');

commit;


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- select id, email, role from public.profiles order by role;
-- -- Poner un qa para poder operar (reemplaza el email):
-- update public.profiles set role = 'qa' where email = 'tu-qa@trez.pe';
-- select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename;
