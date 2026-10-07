-- =============================================================================
-- 20261007140000_profiles_full_name.sql
-- Nombre completo para mostrar en lugar del correo.
--
-- `full_name` se carga a mano en el dashboard (como el rol). Si una cuenta se crea
-- con un nombre en su metadata, el trigger lo copia solo; si no, queda null y la UI
-- muestra el correo como respaldo.
--
-- No cambia RLS: leer profiles ya está abierto a autenticados y nadie la edita
-- desde la app.
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

alter table public.profiles add column full_name text;

comment on column public.profiles.full_name is
  'Nombre completo para mostrar. Se fija a mano en el dashboard; si es null, la UI usa el email.';

-- Regenerar el trigger de alta para que copie el nombre desde la metadata si existe.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name',
                          new.raw_user_meta_data->>'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

commit;

-- VERIFICACIÓN:
-- select email, role, full_name from public.profiles order by role;
-- update public.profiles set full_name = 'Juan Pérez' where email = 'soporte_tech@trez.pe';
