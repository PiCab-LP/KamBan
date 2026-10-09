-- =============================================================================
-- 20261009120000_bug_images.sql
-- Imágenes (evidencia) de un bug. Tabla hija de `bugs`, patrón `comments`.
--
-- Los archivos viven en Cloudinary como assets `authenticated` (no públicos) en la
-- carpeta qanban_bugs/<bug_id>/. Esta tabla solo guarda la REFERENCIA (public_id +
-- metadata); las URLs de visualización se firman on-demand en el backend serverless
-- (api/bug-images/*), por eso NO se guarda ninguna URL (una URL firmada no es estable
-- como dato).
--
-- RLS (espejo de bugs/comments):
--   lee    -> qa y viewer todo; dev solo las de SUS bugs asignados.
--   inserta-> solo qa.
--   borra  -> solo qa.
-- La subida directa a Cloudinary la firma el backend exigiendo rol qa; esta tabla es
-- la segunda barrera (ni dev ni viewer pueden insertar/borrar filas).
--
-- Al borrar un bug, sus filas caen por CASCADE; los archivos de Cloudinary los borra
-- el backend por prefijo ANTES del delete (ver src/hooks/useBugs.js deleteBug).
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

create table public.bug_images (
  id         uuid primary key default gen_random_uuid(),
  bug_id     uuid not null references public.bugs(id) on delete cascade,
  public_id  text not null,          -- qanban_bugs/<bug_id>/<timestamp>-<aleatorio>
  format     text,                   -- jpg | png | webp | gif
  bytes      integer,
  width      integer,
  height     integer,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid()
);

create index bug_images_bug_idx on public.bug_images (bug_id);
create unique index bug_images_public_id_key on public.bug_images (public_id);

comment on table public.bug_images is
  'Referencia a imágenes de un bug alojadas en Cloudinary (carpeta qanban_bugs, assets '
  'authenticated). Guarda public_id + metadata; las URLs firmadas se generan en el backend.';
comment on column public.bug_images.public_id is
  'Identificador del asset en Cloudinary: qanban_bugs/<bug_id>/<timestamp>-<aleatorio>.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.bug_images enable row level security;

-- lee: qa y viewer todo; dev solo las de sus bugs asignados (mismo patrón que comments_read).
create policy bug_images_read on public.bug_images
  for select to authenticated
  using (
    public.user_role() in ('qa', 'viewer')
    or (
      public.user_role() = 'dev'
      and exists (
        select 1 from public.bugs b
        where b.id = bug_images.bug_id and b.assigned_dev_id = auth.uid()
      )
    )
  );

create policy bug_images_insert on public.bug_images
  for insert to authenticated
  with check (public.user_role() = 'qa');

create policy bug_images_delete on public.bug_images
  for delete to authenticated
  using (public.user_role() = 'qa');

commit;


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- select tablename, policyname, cmd from pg_policies
--   where schemaname='public' and tablename='bug_images' order by cmd;
-- select count(*) from public.bug_images;
