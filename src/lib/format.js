const AVATAR_COLORS = [
    'oklch(0.55 0.18 260)',
    'oklch(0.55 0.18 300)',
    'oklch(0.55 0.16 150)',
    'oklch(0.7 0.16 60)',
    'oklch(0.6 0.2 15)',
    'oklch(0.55 0.15 200)',
];

export function getInitials(name) {
    return (name || '')
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

export function getAvatarColor(name) {
    let hash = 0;
    const value = name || '';
    for (let i = 0; i < value.length; i += 1) {
        hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Fecha local de hoy (o de `dateVal`) como `YYYY-MM-DD`, el formato de <input type="date">. */
export function toDateInputValue(dateVal = new Date()) {
    const date = new Date(dateVal);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Convierte el valor de un <input type="date"> en el `created_at` a guardar.
 *
 * - Si el día no cambió respecto a `original`, devuelve `original` intacto para
 *   no pisar la hora real con una inventada.
 * - Si es hoy, usa el instante actual.
 * - Cualquier otro día se guarda a las 12:00 locales, lejos de la medianoche,
 *   para que un desfase de huso horario no lo corra al día vecino.
 */
export function dateInputToTimestamp(value, original = null) {
    if (!value) return original ?? new Date().toISOString();
    if (original && toDateInputValue(original) === value) return original;
    if (value === toDateInputValue()) return new Date().toISOString();
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12).toISOString();
}

/**
 * Las fechas `YYYY-MM-DD` se parsean con barras en vez de guiones: con guiones
 * el navegador las interpreta como UTC y el día se corre uno hacia atrás en
 * husos negativos.
 */
export function formatLocalDate(dateVal) {
    if (!dateVal) return '—';
    const dateObj = typeof dateVal === 'string' && dateVal.includes('-') && !dateVal.includes('T')
        ? new Date(dateVal.replace(/-/g, '/'))
        : new Date(dateVal);

    return dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
