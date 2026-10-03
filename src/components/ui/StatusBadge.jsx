/**
 * Pill de estado, severidad o prioridad. `map` es uno de los diccionarios de
 * src/lib/domain.js (`{ clave: { label, color } }`).
 */
export function StatusBadge({ value, map, showDot = true, className = '' }) {
    const entry = map?.[value];
    const label = entry?.label || value;
    const color = entry?.color || 'var(--primary)';

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${className}`}
            style={{
                backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
                color,
            }}
        >
            {showDot && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            )}
            {label}
        </span>
    );
}

/** Etiqueta para los bugs que volvieron al trabajo activo desde resuelto/cerrado. */
export function ReopenedBadge() {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-destructive/12 text-destructive shrink-0">
            Reabierto
        </span>
    );
}
