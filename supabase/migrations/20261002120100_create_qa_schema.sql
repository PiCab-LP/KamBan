-- =============================================================================
-- 20261002120100_create_qa_schema.sql
-- Esquema QANBAN: Epic -> Feature -> Bug, más comments y notes.
--
-- CONVENCIONES
--   * Estados como text + CHECK, no enums de Postgres. Ver supabase/README.md.
--   * El único trigger del esquema es set_updated_at(). Nada de lógica de
--     negocio en la base de datos: el flag de "Reabierto" lo calcula el front
--     en src/hooks/useBugs.js, a la vista de todos.
--   * La jerarquía borra en CASCADE hacia abajo; las notas usan SET NULL.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Función compartida para mantener updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Pone updated_at = now() en cada UPDATE. Usado por epics, features, bugs y notes.';


-- ===========================================================================
-- EPICS  (nivel 1)
-- ===========================================================================
create table public.epics (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null
                          check (char_length(btrim(name)) between 1 and 200),
  status      text        not null default 'pendiente'
                          check (status in ('pendiente','en_progreso','en_qa','completado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Garantiza en la base lo que el Dashboard viejo solo validaba en memoria
-- (y que fallaba si el duplicado estaba en otra página de la tabla).
-- El front debe capturar el código de error 23505 en createEpic().
create unique index epics_name_unique_idx on public.epics (lower(btrim(name)));
create index epics_status_idx     on public.epics (status);
create index epics_created_at_idx on public.epics (created_at desc);

create trigger epics_set_updated_at
  before update on public.epics
  for each row execute function public.set_updated_at();

comment on table public.epics is
  'Nivel 1 de la jerarquía. La UI muestra nombre, estado y created_at. '
  'Sin fechas de onboarding/entrega ni barra de progreso: el estado es manual.';


-- ===========================================================================
-- FEATURES  (nivel 2)
-- ===========================================================================
create table public.features (
  id          uuid        primary key default gen_random_uuid(),
  epic_id     uuid        not null references public.epics(id) on delete cascade,
  name        text        not null
                          check (char_length(btrim(name)) between 1 and 200),
  description text        check (description is null or char_length(description) <= 2000),
  status      text        not null default 'pendiente'
                          check (status in ('pendiente','en_progreso','en_qa','completado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index features_epic_id_idx          on public.features (epic_id);
create index features_epic_created_at_idx  on public.features (epic_id, created_at);
create index features_status_idx           on public.features (status);

create trigger features_set_updated_at
  before update on public.features
  for each row execute function public.set_updated_at();

comment on column public.features.epic_id is
  'NOT NULL + CASCADE: borrar un Epic arrastra sus Features y, por cadena, sus Bugs.';


-- ===========================================================================
-- BUGS  (nivel 3)
-- ===========================================================================
create table public.bugs (
  id          uuid        primary key default gen_random_uuid(),
  feature_id  uuid        not null references public.features(id) on delete cascade,
  title       text        not null
                          check (char_length(btrim(title)) between 1 and 200),
  description text        check (description is null or char_length(description) <= 5000),
  status      text        not null default 'nuevo'
                          check (status in ('nuevo','en_progreso','resuelto','cerrado')),
  severity    text        not null default 'media'
                          check (severity in ('critica','alta','media','baja')),
  priority    text        not null default 'media'
                          check (priority in ('alta','media','baja')),
  is_reopened boolean     not null default false,
  position    numeric     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index bugs_feature_id_idx      on public.bugs (feature_id);
create index bugs_status_position_idx on public.bugs (status, position);  -- tablero
create index bugs_severity_idx        on public.bugs (severity);
create index bugs_reopened_idx        on public.bugs (is_reopened) where is_reopened;

create trigger bugs_set_updated_at
  before update on public.bugs
  for each row execute function public.set_updated_at();

comment on column public.bugs.is_reopened is
  'true cuando el bug volvió a nuevo/en_progreso desde resuelto/cerrado. '
  'La UI lo muestra como ETIQUETA roja, no como una quinta columna del tablero. '
  'Lo calcula el front (shouldFlagReopen en src/lib/domain.js), NO un trigger.';

comment on column public.bugs.position is
  'Posición fraccionaria para el orden dentro de cada columna del tablero. '
  'Un drag = 1 UPDATE de 1 fila. Ver src/lib/position.js.';

comment on column public.bugs.severity is
  'Lista editable sin recrear nada: ALTER TABLE bugs DROP CONSTRAINT bugs_severity_check, '
  'luego ADD CONSTRAINT con los valores nuevos.';


-- ===========================================================================
-- COMMENTS  (cuelgan de una Feature O de un Bug, exactamente uno)
-- ===========================================================================
create table public.comments (
  id         uuid        primary key default gen_random_uuid(),
  feature_id uuid        references public.features(id) on delete cascade,
  bug_id     uuid        references public.bugs(id)     on delete cascade,
  content    text        not null
                         check (char_length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),

  constraint comments_single_parent_chk
    check (num_nonnulls(feature_id, bug_id) = 1)
);

create index comments_feature_id_idx on public.comments (feature_id, created_at)
  where feature_id is not null;
create index comments_bug_id_idx     on public.comments (bug_id, created_at)
  where bug_id is not null;

comment on constraint comments_single_parent_chk on public.comments is
  'Un comentario pertenece a exactamente un padre: o una feature o un bug, nunca ambos ni ninguno.';


-- ===========================================================================
-- NOTES  (0 o 1 vínculo: epic, feature o bug; sin vínculo = nota global)
-- ===========================================================================
create table public.notes (
  id         uuid        primary key default gen_random_uuid(),
  epic_id    uuid        references public.epics(id)    on delete set null,
  feature_id uuid        references public.features(id) on delete set null,
  bug_id     uuid        references public.bugs(id)     on delete set null,
  content    text        not null
                         check (char_length(btrim(content)) between 1 and 10000),
  color      text        check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  is_pinned  boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notes_single_link_chk
    check (num_nonnulls(epic_id, feature_id, bug_id) <= 1)
);

create index notes_epic_id_idx    on public.notes (epic_id)    where epic_id    is not null;
create index notes_feature_id_idx on public.notes (feature_id) where feature_id is not null;
create index notes_bug_id_idx     on public.notes (bug_id)     where bug_id     is not null;
create index notes_board_idx      on public.notes (is_pinned desc, updated_at desc);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

comment on table public.notes is
  'Se elimina image_url (columna muerta: se leía pero nunca se escribía). '
  'Los FK usan SET NULL y no CASCADE: borrar un Epic no debe hacer desaparecer '
  'notas escritas a mano, simplemente pasan a ser globales.';

commit;


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- select table_name from information_schema.tables
--  where table_schema = 'public' order by table_name;
-- insert into public.epics (name) values ('Prueba') returning *;
-- select * from public.epics;
