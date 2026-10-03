-- =============================================================================
-- INSPECCIÓN DEL ESQUEMA LEGACY DE QANBAN  (SOLO LECTURA — no modifica nada)
--
-- Ejecutar ENTERO en el SQL Editor de Supabase y GUARDAR la salida ANTES de
-- correr cualquier migración. Es la única foto que va a quedar del trigger que
-- genera la plantilla de 6 fases, porque ese trigger no existe en el repo.
--
-- Prestar especial atención a las consultas 3, 4 y 5.
-- =============================================================================


-- 1) Tablas y vistas que existen en public -----------------------------------
select table_name, table_type
from information_schema.tables
where table_schema = 'public'
order by table_type, table_name;


-- 2) Columnas de las 5 tablas legacy ------------------------------------------
select table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('companies','company_checklists','task_comments',
                     'personal_tasks','notes')
order by table_name, ordinal_position;


-- 3) TRIGGERS NO INTERNOS  <-- AQUÍ APARECE EL TRIGGER DE PLANTILLA -----------
--    tgisinternal = true son los que Postgres crea para FKs y constraints:
--    se excluyen porque no son nuestros.
select c.relname                 as tabla,
       t.tgname                  as trigger_name,
       p.proname                 as funcion,
       n.nspname                 as funcion_schema,
       pg_get_triggerdef(t.oid)  as definicion
from pg_trigger t
join pg_class     c  on c.oid  = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc      p  on p.oid  = t.tgfoid
join pg_namespace n  on n.oid  = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
order by c.relname, t.tgname;


-- 4) Todas las funciones de public, con su código fuente ----------------------
--    prokind = 'f' excluye agregados y funciones ventana, con las que
--    pg_get_functiondef() lanza error.
select n.nspname                                     as schema,
       p.proname                                     as funcion,
       pg_get_function_identity_arguments(p.oid)     as args,
       pg_get_functiondef(p.oid)                     as fuente
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
order by p.proname;


-- 5) Funciones que MENCIONAN el dominio viejo --------------------------------
--    Este es el filtro que apunta directo al culpable. El script de limpieza
--    borra exactamente lo que salga aquí: REVISAR LA LISTA ANTES DE BORRAR.
--    Si aparece alguna función de utilidad no relacionada, hay que excluirla
--    a mano del regex en 20261002120000_drop_legacy.sql.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid)                 as fuente
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and pg_get_functiondef(p.oid) ~*
      '(company_checklists|personal_tasks|task_comments|\mcompanies\M|Fase [1-6])';


-- 6) Tipos ENUM definidos en public -------------------------------------------
--    Si aparece alguno, hay que añadir su DROP TYPE al script de limpieza.
select t.typname as enum_type,
       array_agg(e.enumlabel order by e.enumsortorder) as valores
from pg_type t
join pg_enum e      on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname;


-- 7) Políticas RLS actuales ---------------------------------------------------
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- 8) ¿Las tablas están publicadas en Realtime? --------------------------------
select * from pg_publication_tables where pubname = 'supabase_realtime';


-- 9) Vistas que dependan de las tablas viejas ---------------------------------
--    Romperían un DROP TABLE sin CASCADE.
select distinct dep.relname as objeto_dependiente, dep.relkind
from pg_depend d
join pg_rewrite rw     on rw.oid  = d.objid
join pg_class   dep    on dep.oid = rw.ev_class
join pg_namespace depn on depn.oid = dep.relnamespace
join pg_class   src    on src.oid = d.refobjid
where depn.nspname = 'public'
  and dep.relkind in ('v','m')
  and src.relname in ('companies','company_checklists','task_comments',
                      'personal_tasks','notes')
  and dep.relname <> src.relname;


-- 10) Conteo de filas (para saber exactamente qué se pierde) ------------------
select 'companies'          as tabla, count(*) from public.companies
union all select 'company_checklists', count(*) from public.company_checklists
union all select 'task_comments',      count(*) from public.task_comments
union all select 'personal_tasks',     count(*) from public.personal_tasks
union all select 'notes',              count(*) from public.notes;
