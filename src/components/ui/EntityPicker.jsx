import { useMemo, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, Globe, Check } from 'lucide-react';

/**
 * Selector de entidad con grupos y búsqueda.
 *
 * `groups` es `[{ type, label, icon, items: [{ id, name }] }]` y `value` es
 * `{ type, id }` o null (sin vínculo).
 */
export function EntityPicker({
    value,
    onChange,
    groups,
    allowNone = true,
    noneLabel = 'Global (sin asignar)',
    placeholder = 'Vincular a…',
    searchPlaceholder = 'Buscar…',
    disabled = false,
}) {
    const [search, setSearch] = useState('');

    const selected = useMemo(() => {
        if (!value) return null;
        const group = groups.find((g) => g.type === value.type);
        const item = group?.items.find((i) => i.id === value.id);
        return item ? { ...item, group } : null;
    }, [value, groups]);

    const filteredGroups = useMemo(() => {
        const term = search.toLowerCase();
        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => item.name.toLowerCase().includes(term)),
            }))
            .filter((group) => group.items.length > 0);
    }, [groups, search]);

    const SelectedIcon = selected?.group?.icon;
    const isSelected = (type, id) => value?.type === type && value?.id === id;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                    variant="outline"
                    className="w-full h-11 px-4 justify-between text-sm rounded-2xl border-border/60 bg-muted/30 hover:bg-background transition-all font-medium"
                >
                    <div className="flex items-center gap-2 truncate">
                        {selected ? (
                            <>
                                {SelectedIcon && <SelectedIcon size={16} className="text-primary/70 shrink-0" />}
                                <span className="truncate">{selected.name}</span>
                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider shrink-0">
                                    {selected.group.label}
                                </span>
                            </>
                        ) : (
                            <>
                                <Globe size={16} className="text-muted-foreground/50 shrink-0" />
                                <span className="text-muted-foreground/70">
                                    {allowNone ? noneLabel : placeholder}
                                </span>
                            </>
                        )}
                    </div>
                    <ChevronDown size={16} className="text-muted-foreground/40 shrink-0" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[300px] p-2 rounded-2xl border-border/40 shadow-2xl animate-in fade-in-0 zoom-in-95"
                align="start"
            >
                <div className="relative mb-2 px-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-8 text-xs rounded-xl border-none bg-muted/50 focus:bg-muted"
                    />
                </div>

                <div className="max-h-[260px] overflow-y-auto custom-scrollbar space-y-0.5">
                    {allowNone && (
                        <DropdownMenuItem
                            onClick={() => onChange(null)}
                            className="flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors focus:bg-primary/5"
                        >
                            <div className="flex items-center gap-2">
                                <Globe size={14} className={!value ? 'text-primary' : 'text-muted-foreground/40'} />
                                <span className={!value ? 'font-bold text-primary' : 'text-foreground/70'}>
                                    {noneLabel}
                                </span>
                            </div>
                            {!value && <Check size={14} className="text-primary" />}
                        </DropdownMenuItem>
                    )}

                    {filteredGroups.map((group) => {
                        const Icon = group.icon;
                        return (
                            <div key={group.type}>
                                <p className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                                    {group.label}
                                </p>
                                {group.items.map((item) => {
                                    const active = isSelected(group.type, item.id);
                                    return (
                                        <DropdownMenuItem
                                            key={item.id}
                                            onClick={() => onChange({ type: group.type, id: item.id })}
                                            className="flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors focus:bg-primary/5"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {Icon && (
                                                    <Icon size={14} className={active ? 'text-primary' : 'text-muted-foreground/40'} />
                                                )}
                                                <span className={`truncate ${active ? 'font-bold text-primary' : 'text-foreground/70'}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            {active && <Check size={14} className="text-primary shrink-0" />}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {filteredGroups.length === 0 && (
                        <div className="py-4 text-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                            No hay resultados
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
