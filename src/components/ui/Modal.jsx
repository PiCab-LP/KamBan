import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_VARIANTS = {
    default: { Icon: Sparkles,      bg: 'bg-primary/10',     text: 'text-primary' },
    success: { Icon: CheckCircle2,  bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    warning: { Icon: AlertTriangle, bg: 'bg-amber-500/10',   text: 'text-amber-500' },
    danger:  { Icon: AlertCircle,   bg: 'bg-destructive/10', text: 'text-destructive' },
    info:    { Icon: Info,          bg: 'bg-sky-500/10',     text: 'text-sky-500' },
};

const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
};

/**
 * Modal de propósito general.
 *
 * Props:
 *   open          boolean
 *   onClose       () => void
 *   title         string
 *   description?  string          — subtítulo bajo el título
 *   icon?         LucideIcon      — override del ícono del variant
 *   variant?      'default' | 'success' | 'warning' | 'danger' | 'info'
 *   size?         'sm' | 'md' | 'lg'
 *   children?     ReactNode       — cuerpo del modal
 *   footer?       ReactNode       — zona inferior (botones, etc.)
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    icon: IconProp,
    variant = 'default',
    size = 'md',
    children,
    footer,
}) {
    const cfg = ICON_VARIANTS[variant] ?? ICON_VARIANTS.default;
    const IconComponent = IconProp ?? cfg.Icon;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className={cn(
                    'rounded-[28px] border-none shadow-2xl bg-card p-0 overflow-hidden gap-0',
                    SIZES[size] ?? SIZES.md,
                )}
            >
                {/* Header */}
                <div className="flex items-start gap-4 px-6 pt-6 pb-4">
                    <div className={cn('shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center', cfg.bg, cfg.text)}>
                        <IconComponent size={20} strokeWidth={2.5} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <h2 className="text-[15px] font-black text-foreground leading-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="text-[13px] text-muted-foreground/70 font-medium mt-1 leading-snug">
                                {description}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="shrink-0 p-1.5 rounded-xl text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                {children && (
                    <div className="px-6 pb-4">
                        {children}
                    </div>
                )}

                {/* Footer */}
                {footer && (
                    <div className="px-6 pt-3 pb-6 border-t border-border/40">
                        {footer}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
