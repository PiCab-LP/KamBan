-- =============================================================================
-- 20261002120200_rls_policies.sql
--
--  ####################################################################
--  #   POLÍTICAS PERMISIVAS A PROPÓSITO — LEER ANTES DE TOCAR NADA    #
--  ####################################################################
--
--  QANBAN NO TIENE AUTENTICACIÓN. El "login" (src/pages/Login.jsx) es un
--  mockup que solo hace navigate('/backlog'); nunca llama a supabase.auth.
--  Ninguna tabla tiene user_id. La app se conecta siempre con el rol `anon`
--  usando VITE_SUPABASE_ANON_KEY, que viaja dentro del bundle de Vite y por
--  lo tanto ES PÚBLICA.
--
--  CONSECUENCIA REAL, SIN EUFEMISMOS:
--  cualquiera que abra el DevTools de la app desplegada obtiene la URL y la
--  anon key, y con ellas puede LEER, INSERTAR, MODIFICAR y BORRAR todos los
--  epics, features, bugs, comentarios y notas desde curl. Estas políticas no
--  protegen nada; solo evitan el error "RLS is enabled and no policy exists".
--
--  POR QUÉ AUN ASÍ ACTIVAMOS RLS:
--  dejarla desactivada hace que Supabase marque las tablas en rojo en el
--  Dashboard y en el Security Advisor, y que el día que se añada auth haya
--  que acordarse de activarla. Activada + política explícita y documentada =
--  el siguiente que llegue ve la intención.
--
--  MITIGACIONES MIENTRAS NO HAYA AUTH (ninguna sustituye a la auth real):
--    - No meter datos sensibles ni de clientes reales en este proyecto.
--    - Mantener la URL del deploy privada o detrás de un proxy con basic auth.
--    - NO usar jamás la service_role key en el frontend.
--
--  CHECKLIST PARA CUANDO SE AÑADA AUTENTICACIÓN:
--    1. alter table ... add column owner_id uuid references auth.users(id);
--    2. drop policy de cada "*_anon_full_access" de este archivo.
--    3. create policy ... to authenticated using (owner_id = auth.uid());
--    4. revoke all on all tables in schema public from anon;
--    5. Reemplazar el mockup de Login.jsx por supabase.auth.signInWithPassword
--       y envolver las rutas de App.jsx en un guard de sesión.
-- =============================================================================

begin;

alter table public.epics    enable row level security;
alter table public.features enable row level security;
alter table public.bugs     enable row level security;
alter table public.comments enable row level security;
alter table public.notes    enable row level security;

-- Una política por tabla, FOR ALL, para anon y authenticated.
-- El sufijo _anon_full_access hace obvio en pg_policies qué hay que borrar
-- el día que llegue la autenticación.
create policy epics_anon_full_access on public.epics
  for all to anon, authenticated using (true) with check (true);

create policy features_anon_full_access on public.features
  for all to anon, authenticated using (true) with check (true);

create policy bugs_anon_full_access on public.bugs
  for all to anon, authenticated using (true) with check (true);

create policy comments_anon_full_access on public.comments
  for all to anon, authenticated using (true) with check (true);

create policy notes_anon_full_access on public.notes
  for all to anon, authenticated using (true) with check (true);

comment on policy epics_anon_full_access on public.epics is
  'PERMISIVA A PROPÓSITO: el proyecto no tiene autenticación todavía. '
  'Ver la cabecera de 20261002120200_rls_policies.sql.';

commit;


-- =============================================================================
-- VERIFICACIÓN (debe devolver 5 filas)
-- =============================================================================
-- select tablename, policyname, roles, cmd
--   from pg_policies where schemaname = 'public' order by tablename;
