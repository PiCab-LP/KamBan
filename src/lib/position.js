/**
 * Posiciones fraccionarias para el orden de bugs en el tablero.
 *
 * Insertar un bug entre dos vecinos es un UPDATE de una sola fila: se le asigna
 * el punto medio entre ambos. El enfoque anterior reescribía la lista entera en
 * cada drag (una petición HTTP por tarjeta del tablero).
 */

const STEP = 1024;

/** Posición para un item que cae entre `prev` y `next`. Cualquiera puede ser null (borde). */
export function positionBetween(prev, next) {
    const a = prev?.position ?? null;
    const b = next?.position ?? null;
    if (a === null && b === null) return STEP;  // columna vacía
    if (a === null) return Number(b) - STEP;    // al principio
    if (b === null) return Number(a) + STEP;    // al final
    return (Number(a) + Number(b)) / 2;
}

/** Posición para un item nuevo al final de una lista ya ordenada. */
export function positionAtEnd(items) {
    if (!items.length) return STEP;
    return Number(items[items.length - 1].position) + STEP;
}

/**
 * Las posiciones fraccionarias se agotan tras ~50 inserciones consecutivas en el
 * mismo hueco (float64 da ~15-17 dígitos significativos). Cuando dos vecinos
 * quedan más cerca que EPSILON hay que renormalizar esa columna.
 */
const EPSILON = 0.0001;

export function needsRenormalize(items) {
    for (let i = 1; i < items.length; i += 1) {
        if (Math.abs(Number(items[i].position) - Number(items[i - 1].position)) < EPSILON) {
            return true;
        }
    }
    return false;
}

export function renormalize(items) {
    return items.map((item, index) => ({ ...item, position: (index + 1) * STEP }));
}
