/**
 * Medidas del árbol del backlog (Epic → Feature → Bug). Viven aparte de TreeRow.jsx
 * porque un archivo de componentes solo puede exportar componentes.
 *
 * Las filas de features y bugs comparten una rejilla (TREE_GRID). Sus tres columnas
 * de la derecha (Estado, Fecha, Acciones) tienen el MISMO ancho que las de la tabla
 * del Epic en Backlog.jsx, así todos los estados quedan alineados verticalmente bajo
 * el estado del Epic. Las dos columnas intermedias (Severidad/Prioridad en bugs,
 * Bugs en features) caben dentro del espacio que en la tabla del Epic ocupa la
 * columna del nombre.
 *
 * La sangría se aplica SOLO a la etiqueta (prop `indent` de TreeLabel), nunca al
 * contenedor de la fila: así las columnas de la derecha no se desplazan por nivel.
 */
export const TREE_STATUS_WIDTH = 180;
export const TREE_DATE_WIDTH = 180;
export const TREE_ACTIONS_WIDTH = 215;

/** Padding horizontal de la lista de features (12px) más el borde de su tarjeta (1px). */
export const TREE_LIST_PADDING = 12;
export const TREE_EDGE_INSET = TREE_LIST_PADDING + 1;

/**
 * Las filas anidadas terminan TREE_EDGE_INSET px antes del borde derecho de la
 * tabla del Epic; la última columna se acorta esa cantidad para que Fecha y
 * Estado queden exactamente bajo sus equivalentes del Epic.
 */
export const TREE_GRID = [
    'minmax(0,1fr)',
    '100px',
    '100px',
    `${TREE_STATUS_WIDTH}px`,
    `${TREE_DATE_WIDTH}px`,
    `${TREE_ACTIONS_WIDTH - TREE_EDGE_INSET}px`,
].join(' ');

/** Número (base 1) de cada columna de TREE_GRID. */
export const TREE_COL = { label: 1, first: 2, second: 3, status: 4, date: 5, actions: 6 };

/** Sangría de cada nivel de anidación, en píxeles. */
export const TREE_INDENT = 26;

/**
 * Desplazamiento del ícono dentro de una fila: ancho del chevron (20px) más el
 * gap (8px). Las filas sin chevron lo replican como padding para alinearse.
 */
export const TREE_ICON_OFFSET = 28;

/** Sangría de la etiqueta de un feature dentro de su tarjeta. */
export const FEATURE_INDENT = 10;

/** Dónde empieza el texto del feature: sangría + chevron + gap + ícono (16px) + gap. */
export const FEATURE_TITLE_OFFSET = FEATURE_INDENT + TREE_ICON_OFFSET + 24;

/** Eje horizontal del ícono de carpeta del feature: de aquí cuelga la línea que une sus bugs. */
export const FEATURE_ICON_CENTER = FEATURE_INDENT + TREE_ICON_OFFSET + 8;

/** Color que identifica a los bugs en el árbol (el mismo de su tarjeta en Resumen). */
export const BUG_ACCENT = 'oklch(0.70 0.16 60)';

/** Un nivel por debajo de la etiqueta del feature. */
export const BUG_INDENT = FEATURE_INDENT + TREE_INDENT + TREE_ICON_OFFSET;
