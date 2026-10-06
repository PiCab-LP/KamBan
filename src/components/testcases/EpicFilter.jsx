import { useMemo, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, ChevronDown, Search, Check, X } from 'lucide-react';

/**
 * Filtro compacto por Epic. `value` es el id del Epic o `null` para mostrar todos.
 * Es un dropdown con búsqueda para que siga siendo cómodo con muchos Epics.
 */
export function EpicFilter({ epics, value, onChange, loading = false }) {
    const [search, setSearch] = useState('');

    const selected = epics.find((epic) => epic.id === value) ?? null;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return term ? epics.filter((epic) => epic.name.toLowerCase().includes(term)) : epics;
    }, [epics, search]);

    return (
        <div className="flex items-center gap-1.5">
            <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={loading}
                        className={`h-9 w-56 px-3 justify-between gap-2 text-xs rounded-xl font-bold transition-all ${selected
                            ? 'border-primary/40 bg-primary/5 text-primary'
                            : 'border-border/60 bg-card text-foreground/80'}`}
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <Layers size={14} className="shrink-0 opacity-70" />
                            <span className="truncate">
                                {selected ? selected.name : 'Todos los Epics'}
                            </span>
                        </span>
                        <ChevronDown size={14} className="shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    className="w-72 p-2 rounded-2xl border-border/40 shadow-2xl"
                >
                    <div className="relative mb-2 px-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                        <Input
                            placeholder="Buscar epic…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-9 pl-8 text-xs rounded-xl border-none bg-muted/50 focus:bg-muted"
                        />
                    </div>

                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar space-y-0.5">
                        <DropdownMenuItem
                            onClick={() => onChange(null)}
                            className="flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/5"
                        >
                            <span className={!selected ? 'font-bold text-primary' : 'text-foreground/70'}>
                                Todos los Epics
                            </span>
                            {!selected && <Check size={14} className="text-primary" />}
                        </DropdownMenuItem>

                        {filtered.map((epic) => {
                            const active = epic.id === value;
                            return (
                                <DropdownMenuItem
                                    key={epic.id}
                                    onClick={() => onChange(epic.id)}
                                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/5"
                                >
                                    <span className={`truncate ${active ? 'font-bold text-primary' : 'text-foreground/70'}`}>
                                        {epic.name}
                                    </span>
                                    {active && <Check size={14} className="text-primary shrink-0" />}
                                </DropdownMenuItem>
                            );
                        })}

                        {filtered.length === 0 && (
                            <div className="py-4 text-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                {epics.length === 0 ? 'Aún no hay epics' : 'No hay resultados'}
                            </div>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {selected && (
                <button
                    onClick={() => onChange(null)}
                    title="Quitar filtro"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}
