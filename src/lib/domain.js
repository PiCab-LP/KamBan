/**
 * Dominio de QANBAN: Epic → Feature → Bug.
 *
 * Los valores de cada estado están duplicados en los CHECK de
 * supabase/migrations/20261002120100_create_qa_schema.sql. Al cambiar uno hay
 * que cambiar el otro: es el precio de usar text + CHECK en vez de enums de
 * Postgres (ver supabase/README.md).
 */

// Epic y Feature comparten vocabulario de estados.
export const ENTITY_STATUS = {
    pendiente:   { label: 'Pendiente',   color: 'oklch(0.60 0.02 260)' },
    en_progreso: { label: 'En progreso', color: 'oklch(0.58 0.20 277)' },
    en_qa:       { label: 'En QA',       color: 'oklch(0.70 0.16 60)' },
    completado:  { label: 'Completado',  color: 'oklch(0.60 0.16 150)' },
};

export const BUG_STATUS = {
    nuevo:           { label: 'Nuevo',          color: 'oklch(0.60 0.22 300)' },
    en_progreso:     { label: 'En progreso',    color: 'oklch(0.58 0.20 277)' },
    bloqueado:       { label: 'Bloqueado',      color: 'oklch(0.58 0.22 25)' },
    para_despliegue: { label: 'Para despliegue', color: 'oklch(0.68 0.15 230)' },
    completado:      { label: 'Completado',     color: 'oklch(0.60 0.16 150)' },
};

export const BUG_SEVERITY = {
    critica: { label: 'Crítica', color: 'oklch(0.58 0.22 25)' },
    alta:    { label: 'Alta',    color: 'oklch(0.65 0.19 45)' },
    media:   { label: 'Media',   color: 'oklch(0.70 0.16 75)' },
    baja:    { label: 'Baja',    color: 'oklch(0.60 0.08 220)' },
};

export const BUG_PRIORITY = {
    alta:  { label: 'Alta',  color: 'oklch(0.58 0.22 25)' },
    media: { label: 'Media', color: 'oklch(0.70 0.16 75)' },
    baja:  { label: 'Baja',  color: 'oklch(0.60 0.08 220)' },
};

/** Columnas del Tablero de Bugs, en orden de izquierda a derecha. */
export const BUG_COLUMNS = [
    { id: 'nuevo',           title: 'Nuevo',           description: 'Bugs por atender' },
    { id: 'en_progreso',     title: 'En progreso',     description: 'En investigación' },
    { id: 'bloqueado',       title: 'Bloqueado',       description: 'Trabados por dependencias' },
    { id: 'para_despliegue', title: 'Para despliegue', description: 'Listos para desplegar' },
    { id: 'completado',      title: 'Completado',      description: 'Desplegado y verificado' },
];

/**
 * Bugs que todavía requieren trabajo. Usado por las métricas del backlog y por
 * la regla de completado. Duplicado en los triggers de
 * supabase/migrations/20261007150000_bug_statuses.sql (guard_feature/epic_completion).
 */
export const OPEN_BUG_STATUSES = ['nuevo', 'en_progreso', 'bloqueado'];

/** Estado final de Epic y Feature. Solo se alcanza sin trabajo pendiente debajo. */
export const COMPLETED_STATUS = 'completado';

/** SQLSTATE con el que la base rechaza un completado incoherente. */
export const COMPLETION_BLOCKED_CODE = 'QA001';

const plural = (n, singular, pluralForm) => `${n} ${n === 1 ? singular : pluralForm}`;

/**
 * Texto de la alerta cuando algo no se puede completar. `pendingFeatures` solo
 * aplica a Epics.
 */
export function completionBlockedMessage(kind, { openBugs = 0, pendingFeatures = 0 }) {
    const reasons = [];
    if (pendingFeatures > 0) reasons.push(plural(pendingFeatures, 'feature sin completar', 'features sin completar'));
    if (openBugs > 0) reasons.push(plural(openBugs, 'bug abierto', 'bugs abiertos'));

    const label = kind === 'epic' ? 'el Epic' : 'el Feature';
    return `No se puede marcar ${label} como Completado: tiene ${reasons.join(' y ')}. `
        + 'Resuélvelos o ciérralos primero.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Autenticación y roles. Duplicado en los CHECK de
// supabase/migrations/20261006130000_auth_roles.sql: al cambiar uno, cambiar el otro.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roles del sistema. Se guardan en la tabla `profiles` y los fija un admin a mano
 * desde el dashboard de Supabase (la app no los edita).
 *   qa     — agrega, edita y borra todo.
 *   dev    — solo ve sus bugs asignados y solo cambia su dev_status.
 *   viewer — solo lectura de epics, features y bugs.
 */
export const ROLES = {
    qa:     { label: 'QA',     color: 'oklch(0.58 0.20 277)' },
    dev:    { label: 'Dev',    color: 'oklch(0.70 0.16 60)' },
    viewer: { label: 'Viewer', color: 'oklch(0.60 0.02 260)' },
};

/**
 * Avance de corrección que marca el DEV asignado, independiente del estado del
 * tablero (que maneja QA). Se resetea a 'pendiente' al reabrir el bug.
 */
export const DEV_STATUS = {
    pendiente: { label: 'Pendiente', color: 'oklch(0.60 0.02 260)' },
    corregido: { label: 'Corregido', color: 'oklch(0.70 0.16 60)' },
    revisado:  { label: 'Revisado',  color: 'oklch(0.60 0.16 150)' },
};

/** Transiciones de dev_status que el Dev puede elegir desde "Mis bugs". */
export const DEV_STATUS_ORDER = ['pendiente', 'corregido', 'revisado'];

/** SQLSTATE con el que la base rechaza que un dev cambie algo distinto de dev_status. */
export const DEV_UPDATE_BLOCKED_CODE = 'QA002';

/** ¿Este rol puede crear/editar/borrar el backlog (epics, features, bugs)? */
export const canManageBacklog = (role) => role === 'qa';

/** Pantalla de inicio de cada rol tras entrar. El Dev no usa el backlog. */
export const homePathForRole = (role) => (role === 'dev' ? '/mis-bugs' : '/backlog');
