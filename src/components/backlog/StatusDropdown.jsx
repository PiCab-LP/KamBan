import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** Badge de estado que al pulsarlo despliega las demás opciones. */
export function StatusDropdown({ value, map, onChange, align = 'start' }) {
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 transition-opacity hover:opacity-75">
                    <StatusBadge value={value} map={map} />
                    <ChevronDown size={12} strokeWidth={3} className="text-muted-foreground/50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-40 rounded-xl shadow-lg border-border/40 p-1.5 flex flex-col gap-1">
                {Object.entries(map).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => {
                            if (key !== value) onChange(key);
                            setOpen(false);
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold rounded-lg transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                        <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                    </button>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
