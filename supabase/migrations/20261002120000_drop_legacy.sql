-- =============================================================================
-- 20261002120000_drop_legacy.sql
-- Borrado total del esquema legacy de QANBAN (dominio de "compañías").
--
--   !!  DESTRUCTIVO E IRREVERSIBLE: no migra datos.  !!
--
-- ANTES DE EJECUTAR:
--   1. Backup: Supabase Dashboard > Database > Backups.
--   2. Correr supabase/introspection/00_inspect_legacy.sql y GUARDAR la salida.
--   3. Revisar la consulta 5 de esa inspección y ajustar el regex de la
--      sección 4 de este archivo si aparece alguna función ajena al dominio.
--
-- Por qué la sección 4 existe: DROP TABLE ... CASCADE elimina los triggers DE
-- ESA TABLA, pero NO la función que invocan. La función del trigger que genera
-- la plantilla de 6 fases sobreviviría huérfana en public y volvería a actuar
-- si alguien recreara una tabla con el nombre viejo. Como no conocemos su
-- nombre, la cazamos por el contenido de su código fuente.
-- =============================================================================

begin;

-- --- 1. Triggers explícitos sobre las tablas legacy ---------------------------
-- CASCADE ya los borraría, pero los quitamos primero para dejar constancia en
-- los NOTICE de qué había (incluido el trigger de plantilla).
do $$
declare r record;
begin
  for r in
    select c.relname as tabla, t.tgname as trg
    from pg_trigger t
    join pg_class     c  on c.oid  = t.tgrelid
    join pg_namespace cn on cn.oid = c.relnamespace
    where not t.tgisinternal
      and cn.nspname = 'public'
      and c.relname in ('companies','company_checklists','task_comments',
                        'personal_tasks','notes')
  loop
    raise notice 'Eliminando trigger %.%', r.tabla, r.trg;
    execute format('drop trigger if exists %I on public.%I cascade', r.trg, r.tabla);
  end loop;
end $$;


-- --- 2. Vistas que dependan de las tablas legacy ------------------------------
do $$
declare r record;
begin
  for r in
    select distinct dep.relname, dep.relkind
    from pg_depend d
    join pg_rewrite rw     on rw.oid  = d.objid
    join pg_class   dep    on dep.oid = rw.ev_class
    join pg_namespace depn on depn.oid = dep.relnamespace
    join pg_class   src    on src.oid = d.refobjid
    where depn.nspname = 'public'
      and dep.relkind in ('v','m')
      and src.relname in ('companies','company_checklists','task_comments',
                          'personal_tasks','notes')
      and dep.relname <> src.relname
  loop
    raise notice 'Eliminando vista %', r.relname;
    if r.relkind = 'm' then
      execute format('drop materialized view if exists public.%I cascade', r.relname);
    else
      execute format('drop view if exists public.%I cascade', r.relname);
    end if;
  end loop;
end $$;


-- --- 3. Tablas (el orden da igual gracias a CASCADE) --------------------------
drop table if exists public.task_comments      cascade;
drop table if exists public.company_checklists cascade;
drop table if exists public.personal_tasks     cascade;
drop table if exists public.notes              cascade;
drop table if exists public.companies          cascade;


-- --- 4. Funciones huérfanas que referencian el dominio viejo ------------------
-- Esto es lo que mata de verdad la plantilla de 6 fases.
do $$
declare r record;
begin
  for r in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) ~*
          '(company_checklists|personal_tasks|task_comments|\mcompanies\M|Fase [1-6])'
  loop
    raise notice 'Eliminando función public.%(%)', r.proname, r.args;
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;
end $$;


-- --- 5. Tipos ENUM legacy ----------------------------------------------------
-- Si la consulta 6 de la inspección devolvió enums, descomentar y nombrarlos:
-- drop type if exists public.company_status cascade;
-- drop type if exists public.task_status    cascade;

commit;


-- =============================================================================
-- VERIFICACIÓN (ejecutar aparte; ambas deben devolver 0 filas)
-- =============================================================================
-- select table_name from information_schema.tables
--  where table_schema = 'public'
--    and table_name in ('companies','company_checklists','task_comments',
--                       'personal_tasks','notes');
--
-- select p.proname
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.prokind = 'f'
--    and pg_get_functiondef(p.oid) ~* '(company_checklists|personal_tasks)';
