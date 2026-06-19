import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_CONFIG = {
    success: {
        Icon: CheckCircle2,
        bg:   'bg-emerald-500/10',
        text: 'text-emerald-500',
        bar:  'bg-emerald-500',
    },
    error: {
        Icon: AlertCircle,
        bg:   'bg-destructive/10',
        text: 'text-destructive',
        bar:  'bg-destructive',
    },
    warning: {
        Icon: AlertTriangle,
        bg:   'bg-amber-500/10',
        text: 'text-amber-500',
        bar:  'bg-amber-500',
    },
    info: {
        Icon: Info,
        bg:   'bg-primary/10',
        text: 'text-primary',
        bar:  'bg-primary',
    },
};

const MAX_TOASTS  = 3;
const DEFAULT_TTL = 4000;

// ── Single toast item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
    const cfg = TOAST_CONFIG[toast.type] ?? TOAST_CONFIG.info;
    const { Icon } = cfg;

    return (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/20 min-w-[320px] max-w-md relative overflow-hidden animate-kanban-slide-up">
            {/* Icon */}
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.text}`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 mr-1">
                {toast.title && (
                    <p className="text-[13px] font-black text-foreground leading-tight">
                        {toast.title}
                    </p>
                )}
                <p className={`text-[13px] font-medium text-foreground leading-snug ${toast.title ? 'text-muted-foreground/70 mt-0.5' : 'font-bold'}`}>
                    {toast.message}
                </p>
            </div>

            {/* Dismiss */}
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
            >
                <X size={15} strokeWidth={2.5} />
            </button>

            {/* Progress bar */}
            <div
                className={`absolute bottom-0 left-0 h-0.5 rounded-full opacity-50 ${cfg.bar}`}
                style={{
                    animation: `toast-shrink ${toast.duration}ms linear forwards`,
                }}
            />
        </div>
    );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /**
     * showToast(message, type?, title?, duration?)
     *   message   — texto principal
     *   type      — 'success' | 'error' | 'warning' | 'info'  (default: 'success')
     *   title     — texto en negrita encima del mensaje        (opcional)
     *   duration  — ms antes de auto-cerrar                   (default: 4000)
     */
    const showToast = useCallback((message, type = 'success', title, duration = DEFAULT_TTL) => {
        const id = Date.now();

        setToasts(prev => {
            const next = [{ id, message, type, title, duration }, ...prev];
            // If we exceed MAX_TOASTS, remove oldest and clear its timer
            if (next.length > MAX_TOASTS) {
                const removed = next.slice(MAX_TOASTS);
                removed.forEach(t => {
                    clearTimeout(timers.current[t.id]);
                    delete timers.current[t.id];
                });
                return next.slice(0, MAX_TOASTS);
            }
            return next;
        });

        timers.current[id] = setTimeout(() => dismiss(id), duration);
    }, [dismiss]);

    // Convenience helpers
    const showSuccess = useCallback((message, title, duration) => showToast(message, 'success', title, duration), [showToast]);
    const showError   = useCallback((message, title, duration) => showToast(message, 'error',   title, duration), [showToast]);
    const showWarning = useCallback((message, title, duration) => showToast(message, 'warning', title, duration), [showToast]);
    const showInfo    = useCallback((message, title, duration) => showToast(message, 'info',    title, duration), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}

            {/* Toast stack — bottom-center */}
            {toasts.length > 0 && (
                <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 items-end">
                    {toasts.map(toast => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
};
