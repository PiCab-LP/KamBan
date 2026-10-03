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
