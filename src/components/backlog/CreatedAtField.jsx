import { Input } from '@/components/ui/input';
import { toDateInputValue } from '@/lib/format';

/**
 * Selector de la fecha de creación de un feature o bug. Escribe `created_at`,
 * así que permite registrar con su fecha real algo que se encontró antes.
 * No admite fechas futuras.
 */
export function CreatedAtField({ id, value, onChange, disabled = false }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Fecha de creación
            </label>
            <Input
                id={id}
                type="date"
                value={value}
                max={toDateInputValue()}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-11 text-sm rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-all"
            />
        </div>
    );
}
