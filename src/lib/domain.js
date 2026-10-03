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
    nuevo:       { label: 'Nuevo',       color: 'oklch(0.60 0.22 300)' },
    en_progreso: { label: 'En progreso', color: 'oklch(0.58 0.20 277)' },
    resuelto:    { label: 'Resuelto',    color: 'oklch(0.60 0.16 150)' },
    cerrado:     { label: 'Cerrado',     color: 'oklch(0.55 0.02 260)' },
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
    { id: 'nuevo',       title: 'Nuevo',       description: 'Bugs por atender' },
    { id: 'en_progreso', title: 'En progreso', description: 'En investigación' },
    { id: 'resuelto',    title: 'Resuelto',    description: 'Listo para verificar' },
    { id: 'cerrado',     title: 'Cerrado',     description: 'Verificado y cerrado' },
];

const REOPEN_FROM = ['resuelto', 'cerrado'];
const REOPEN_TO = ['nuevo', 'en_progreso'];

/**
 * Un bug se marca como reabierto al volver de resuelto/cerrado al trabajo
 * activo. Lo llaman los DOS sitios que cambian estado — el dropdown de BugRow
 * y el drag del tablero — para que nunca discrepen.
 */
export function shouldFlagReopen(prevStatus, nextStatus) {
    return REOPEN_FROM.includes(prevStatus) && REOPEN_TO.includes(nextStatus);
}

/** Bugs que todavía requieren trabajo. Usado por las métricas del backlog. */
export const OPEN_BUG_STATUSES = ['nuevo', 'en_progreso'];
