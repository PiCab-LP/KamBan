import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react';

const VARIANTS = {
    danger: {
        Icon: AlertTriangle,
        iconBg:  'bg-destructive/10',
        iconText: 'text-destructive',
        confirmCls: 'bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20',
    },
    warning: {
        Icon: AlertTriangle,
        iconBg:  'bg-amber-500/10',
        iconText: 'text-amber-500',
        confirmCls: 'bg-amber-500 text-white hover:bg-amber-500/90 shadow-lg shadow-amber-500/20',
    },
    info: {
        Icon: Info,
        iconBg:  'bg-primary/10',
        iconText: 'text-primary',
        confirmCls: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
    success: {
        Icon: CheckCircle2,
        iconBg:  'bg-emerald-500/10',
        iconText: 'text-emerald-500',
        confirmCls: 'bg-emerald-500 text-white hover:bg-emerald-500/90 shadow-lg shadow-emerald-500/20',
    },
};

/**
 * Modal de alerta / confirmación.
 *
 * Props:
 *   open           boolean
 *   onClose        () => void
 *   onConfirm      () => void
 *   title          string
 *   description?   string
 *   variant?       'danger' | 'warning' | 'info' | 'success'
 *   confirmLabel?  string   — default 'Confirmar'
 *   cancelLabel?   string   — default 'Cancelar'
 *   isLoading?     boolean
 */
export function AlertModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    variant = 'danger',
    confirmLabel = 'Confirmar',
    cancelLabel  = 'Cancelar',
    isLoading    = false,
}) {
    const cfg = VARIANTS[variant] ?? VARIANTS.danger;
    const { Icon } = cfg;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[300px] rounded-[28px] border-none shadow-2xl bg-card p-0 overflow-hidden">
                <div className="p-5">
                    {/* Icon + text */}
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${cfg.iconBg} ${cfg.iconText}`}>
                            <Icon size={24} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-[17px] font-black tracking-tight text-foreground leading-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="text-[13px] font-medium text-muted-foreground/70 leading-snug px-2 mt-1.5">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-7">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-11 rounded-2xl font-bold text-xs text-muted-foreground hover:bg-muted"
                        >
                            {cancelLabel}
                        </Button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`h-11 rounded-2xl font-black text-xs transition-all active:scale-[0.95] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${cfg.confirmCls}`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Procesando...
                                </>
                            ) : confirmLabel}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
