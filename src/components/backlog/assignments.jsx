import { ShieldCheck, Code2, User } from 'lucide-react';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { getInitials, getAvatarColor } from '@/lib/format';

const ROLE_ICON = { qa: ShieldCheck, dev: Code2 };

/**
 * Selector de asignación para un rol (QA o Dev). `users` es la lista de perfiles
 * de ese rol (`[{ id, email }]`), `value` el id asignado o null.
 */
export function AssignPicker({ label, help, type, users, value, onChange, disabled }) {
    const groups = [{
        type,
        label: type === 'qa' ? 'QA' : 'Dev',
        icon: ROLE_ICON[type],
        items: users.map((u) => ({ id: u.id, name: u.name })),
    }];

    return (
        <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {label}
            </p>
            <EntityPicker
                groups={groups}
                value={value ? { type, id: value } : null}
                onChange={(v) => onChange(v?.id ?? null)}
                noneLabel="Sin asignar"
                searchPlaceholder={`Buscar ${type === 'qa' ? 'QA' : 'Dev'}…`}
                disabled={disabled}
            />
            {help && <p className="text-[10px] text-muted-foreground/50">{help}</p>}
        </div>
    );
}

/** Línea de solo lectura "Creado por X". `profilesById` mapea id → nombre a mostrar. */
export function CreatedByLine({ createdBy, profilesById }) {
    const name = createdBy ? profilesById[createdBy] : null;
    return (
        <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Creado por
            </p>
            <div className="flex items-center gap-2">
                {name ? (
                    <>
                        <div
                            className="flex items-center justify-center w-6 h-6 rounded-lg text-white text-[9px] font-black shrink-0"
                            style={{ backgroundColor: getAvatarColor(name) }}
                        >
                            {getInitials(name)}
                        </div>
                        <span className="text-xs font-medium text-foreground truncate">{name}</span>
                    </>
                ) : (
                    <>
                        <User size={14} className="text-muted-foreground/40" />
                        <span className="text-xs text-muted-foreground/50">—</span>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * Indicador del asignado para las filas del Backlog: pill muted con el ícono del
 * rol y el nombre. `roleLabel` es el prefijo ("QA" / "Dev").
 */
export function AssigneeChip({ id, profilesById, type, roleLabel }) {
    const name = id ? profilesById[id] : null;
    if (!name) return null;
    const Icon = ROLE_ICON[type] ?? User;
    return (
        <div
            className="flex w-fit max-w-full items-center gap-1.5 rounded-full bg-muted/60 border border-border/40 px-2 py-1"
            title={roleLabel ? `${roleLabel} asignado: ${name}` : name}
        >
            <Icon size={11} strokeWidth={2.5} className="shrink-0 text-muted-foreground/70" />
            {roleLabel && (
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 shrink-0 leading-none">
                    {roleLabel}
                </span>
            )}
            <span className="text-[10px] font-semibold text-muted-foreground/80 truncate leading-none">{name}</span>
        </div>
    );
}
