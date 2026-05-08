import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, description }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[300px] rounded-[28px] border-none shadow-2xl bg-card p-0 overflow-hidden">
                <div className="p-5">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3 text-destructive">
                            <AlertTriangle size={24} strokeWidth={2.5} />
                        </div>
                        
                        <DialogHeader className="p-0 space-y-1">
                            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                                {title || '¿Eliminar?'}
                            </DialogTitle>
                            <DialogDescription className="text-[13px] font-medium text-muted-foreground/80 leading-snug px-2">
                                {description || 'Esta acción es permanente y no se puede deshacer.'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-8">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="h-11 rounded-2xl font-bold text-xs text-muted-foreground hover:bg-muted order-1"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={onConfirm}
                            className="h-11 rounded-2xl bg-destructive text-white font-black text-xs shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-[0.95] order-2"
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
