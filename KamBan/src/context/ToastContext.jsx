import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        // Limpiar el anterior para no stackear
        setToast(null);
        
        // Pequeño delay para que la animación de entrada se note si es el mismo tipo
        setTimeout(() => {
            setToast({ id: Date.now(), message, type });
        }, 10);
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                hideToast();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast, hideToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div 
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] animate-kanban-slide-up"
                    key={toast.id}
                >
                    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/20 min-w-[320px] max-w-md">
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                            toast.type === 'error' ? 'bg-destructive/10 text-destructive' : 
                            'bg-primary/10 text-primary'
                        }`}>
                            {toast.type === 'success' && <CheckCircle2 size={20} strokeWidth={2.5} />}
                            {toast.type === 'error' && <AlertCircle size={20} strokeWidth={2.5} />}
                            {toast.type === 'info' && <Info size={20} strokeWidth={2.5} />}
                        </div>
                        
                        <div className="flex-1 mr-2">
                            <p className="text-[13px] font-bold text-foreground leading-tight">
                                {toast.message}
                            </p>
                        </div>

                        <button 
                            onClick={hideToast}
                            className="p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
