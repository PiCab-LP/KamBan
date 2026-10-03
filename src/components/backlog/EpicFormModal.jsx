import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ENTITY_STATUS } from '@/lib/domain';
import { StatusPills } from './StatusPills';

export function EpicFormModal({ open, onClose, epic, onSave }) {
    const isEditing = Boolean(epic);
    const [name, setName] = useState('');
    const [status, setStatus] = useState('pendiente');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setName(epic?.name || '');
        setStatus(epic?.status || 'pendiente');
        setError('');
    }, [open, epic]);

    const handleSave = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('El nombre no puede estar vacío.');
            return;
        }

        setSaving(true);
        const result = await onSave({ name: trimmed, status });
        setSaving(false);

        if (result?.success) {
            onClose();
        } else {
            setError(result?.error || 'No se pudo guardar el Epic.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-black tracking-tight">
                        {isEditing ? 'Editar Epic' : 'Nuevo Epic'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground/60">
                        Un Epic agrupa features, y cada feature agrupa sus bugs.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 pt-1">
                    <Input
                        placeholder="Ej: Autenticación de usuarios"
                        value={name}
                        maxLength={200}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError('');
                        }}
                        className={`h-12 text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all ${
                            error ? 'border-destructive focus:ring-destructive/10' : ''
                        }`}
                        onKeyDown={(e) => e.key === 'Enter' && !saving && handleSave()}
                        autoFocus
                        disabled={saving}
                    />
                    {error && (
                        <p className="text-[10px] font-bold text-destructive -mt-3 ml-1 uppercase tracking-wider">
                            {error}
                        </p>
                    )}

                    <StatusPills
                        label="Estado"
                        map={ENTITY_STATUS}
                        value={status}
                        onChange={setStatus}
                        disabled={saving}
                    />

                    <div className="flex justify-end gap-3 mt-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={saving}
                            className="text-xs font-bold h-11 px-6 rounded-xl hover:bg-muted"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className="text-xs font-black h-11 px-8 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear Epic'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
