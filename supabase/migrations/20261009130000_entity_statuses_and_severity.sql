-- =============================================================================
-- 20261009130000_entity_statuses_and_severity.sql
-- Amplía enumerados existentes. Solo AGREGA valores (no renombra ni quita), así
-- que no hace falta remapear datos: las filas actuales siguen siendo válidas.
--
--   epics.status / features.status
--     antes:  pendiente · en_progreso · en_qa · completado
--     ahora:  pendiente · en_progreso · en_qa · bloqueado · para_despliegue · completado
--
--   bugs.severity
--     antes:  critica · alta · media · baja
--     ahora:  critica · bloqueante · alta · media · baja
--
-- Los guards de completado (20261006120000 / 20261007150000) NO cambian: solo
-- disparan al pasar a 'completado' y cuentan features con status <> 'completado',
-- así que un feature en 'bloqueado'/'para_despliegue' ya cuenta como sin completar.
--
-- Valores duplicados en src/lib/domain.js (ENTITY_STATUS, BUG_SEVERITY): al
-- cambiar uno hay que cambiar el otro.
--
-- Aplicar pegando el archivo completo en el SQL Editor de Supabase.
-- =============================================================================

begin;

-- epics.status
alter table public.epics drop constraint if exists epics_status_check;
alter table public.epics
  add constraint epics_status_check
  check (status in ('pendiente', 'en_progreso', 'en_qa', 'bloqueado', 'para_despliegue', 'completado'));

-- features.status
alter table public.features drop constraint if exists features_status_check;
alter table public.features
  add constraint features_status_check
  check (status in ('pendiente', 'en_progreso', 'en_qa', 'bloqueado', 'para_despliegue', 'completado'));

-- bugs.severity
alter table public.bugs drop constraint if exists bugs_severity_check;
alter table public.bugs
  add constraint bugs_severity_check
  check (severity in ('critica', 'bloqueante', 'alta', 'media', 'baja'));

commit;


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conname in ('epics_status_check','features_status_check','bugs_severity_check');
-- -- Deben aceptar ahora: un feature en 'bloqueado' y un bug en severidad 'bloqueante'.
