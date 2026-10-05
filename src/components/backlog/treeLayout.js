/**
 * Medidas del árbol del backlog (Epic → Feature → Bug).
 *
 * Los features y los bugs son FILAS de la misma tabla que los Epics (ver Backlog.jsx):
 * comparten sus columnas Estado, Fecha de creación y Acciones, así que lo único que
 * cambia entre niveles es la sangría de la primera columna. Viven aparte de los
 * componentes porque un archivo de componentes solo puede exportar componentes.
 */
export const TREE_STATUS_WIDTH = 180;
export const TREE_DATE_WIDTH = 180;
export const TREE_ACTIONS_WIDTH = 215;

/** Franja de acento a la izquierda: ata las filas anidadas a su Epic. */
export const NESTED_STRIP = 'border-l-[3px] border-l-primary/40';

/**
 * Sangrías de la primera columna, medidas desde su borde interno. La del feature
 * coincide con el inicio del avatar del Epic (20px de padding + chevron 24px + gap 10px).
 */
export const FEATURE_INDENT = 54;

/** Ancho del chevron (20px) más el gap (8px) que preceden al ícono del feature. */
const CHEVRON_OFFSET = 28;

/** Eje del ícono de carpeta del feature: de aquí cuelga la línea que une sus bugs. */
export const FEATURE_ICON_CENTER = FEATURE_INDENT + CHEVRON_OFFSET + 8;

/** Los bugs empiezan un poco a la derecha de esa línea, dejando sitio al trazo. */
export const BUG_INDENT = FEATURE_ICON_CENTER + 18;

/** Largo del trazo horizontal que va de la línea del feature al ícono del bug. */
export const TICK_WIDTH = 14;

/** Color que identifica a los bugs en el árbol (el mismo de su tarjeta en Resumen). */
export const BUG_ACCENT = 'oklch(0.70 0.16 60)';
