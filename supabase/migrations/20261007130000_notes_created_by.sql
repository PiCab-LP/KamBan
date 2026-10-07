-- =============================================================================
-- 20261007130000_notes_created_by.sql
-- Guarda quién creó cada nota.
--
-- Solo QA crea notas (política notes_write), así que created_by será un QA.
-- Lo estampa la base con default auth.uid(); el cliente no lo manda.
-- No cambia RLS (leer notas sigue abierto a autenticados; escribir sigue siendo QA).
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

alter table public.notes
  add column created_by uuid references public.profiles(id) default auth.uid();

comment on column public.notes.created_by is
  'Autor de la nota (default auth.uid()). Solo QA crea notas.';

commit;

-- VERIFICACIÓN:
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='notes' and column_name='created_by';
