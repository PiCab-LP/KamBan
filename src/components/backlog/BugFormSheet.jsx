import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bug as BugIcon, ShieldCheck, Code2 } from 'lucide-react';
import { BUG_STATUS, BUG_SEVERITY, BUG_PRIORITY } from '@/lib/domain';
import { toDateInputValue, dateInputToTimestamp } from '@/lib/format';
import { useProfiles } from '@/hooks/useProfiles';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { StatusPills } from './StatusPills';
import { CreatedAtField } from './CreatedAtField';
import { BugImagesPlaceholder } from './BugImagesPlaceholder';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;

/**
 * Formulario de un bug, en dos modos para no manejar las mismas opciones en dos sitios:
 *
 * - `backlog`: registra e identifica el bug (título, descripción, fecha de creación).
 *   Un bug nuevo nace con los defaults de la base: estado "nuevo", severidad y
 *   prioridad "media".
 * - `board`: clasifica el bug (estado, severidad, prioridad). Título y descripción
 *   se muestran solo como contexto; se editan desde el Backlog.
 */
export function BugFormSheet({ open, onClose, bug, onSave, mode = 'backlog' }) {
    const isBoard = mode === 'board';
    const isEditing = Boolean(bug);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('nuevo');
    const [severity, setSeverity] = useState('media');
    const [priority, setPriority] = useState('media');
    const [createdAt, setCreatedAt] = useState('');
    const [assignedQaId, setAssignedQaId] = useState(null);
    const [assignedDevId, setAssignedDevId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Para los selectores de asignación (solo relevantes en modo tablero).
    const { qaUsers, devUsers } = useProfiles({ enabled: isBoard });

    useEffect(() => {
        if (!open) return;
        setTitle(bug?.title || '');
        setDescription(bug?.description || '');
        setStatus(bug?.status || 'nuevo');
        setSeverity(bug?.severity || 'media');
        setPriority(bug?.priority || 'media');
        setCreatedAt(toDateInputValue(bug?.created_at));
        setAssignedQaId(bug?.assigned_qa_id || null);
        setAssignedDevId(bug?.assigned_dev_id || null);
        setError('');
    }, [open, bug]);

    const qaGroups = [{
        type: 'qa', label: 'QA', icon: ShieldCheck,
        items: qaUsers.map((u) => ({ id: u.id, name: u.email })),
    }];
    const devGroups = [{
        type: 'dev', label: 'Dev', icon: Code2,
        items: devUsers.map((u) => ({ id: u.id, name: u.email })),
    }];

    const handleSave = async () => {
        let payload;
        if (isBoard) {
            payload = {
                status,
                severity,
                priority,
                assigned_qa_id: assignedQaId,
                assigned_dev_id: assignedDevId,
            };
        } else {
            const trimmed = title.trim();
            if (!trimmed) {
                setError('El título no puede estar vacío.');
                return;
            }
            payload = {
                title: trimmed,
                description: description.trim() || null,
                created_at: dateInputToTimestamp(createdAt, bug?.created_at),
            };
        }

        setSaving(true);
        const result = await onSave(payload);
        setSaving(false);

        if (result?.success) onClose();
        else setError(result?.error || 'No se pudo guardar el bug.');
    };

    const heading = isBoard ? 'Clasificar Bug' : isEditing ? 'Editar Bug' : 'Nuevo Bug';

    return (
        <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
            <SheetContent side="right" className="w-[420px] sm:w-[520px] flex flex-col p-0 gap-0">
                <SheetHeader className="px-6 py-4 border-b border-border/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <BugIcon size={16} className="text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <SheetTitle className="text-sm font-black text-foreground leading-tight">
                                {heading}
                            </SheetTitle>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
                    {isBoard ? (
                        <>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    Bug
                                </p>
                                <p className="text-sm font-bold text-foreground">{bug?.title}</p>
                                {bug?.description && (
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                        {bug.description}
                                    </p>
                                )}
                                <p className="text-[10px] text-muted-foreground/50">
                                    El título y la descripción se editan desde el Backlog de QA.
                                </p>
                            </div>
                            {error && (
                                <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">{error}</p>
                            )}

                            <StatusPills label="Estado" map={BUG_STATUS} value={status} onChange={setStatus} disabled={saving} />
                            <StatusPills label="Severidad" map={BUG_SEVERITY} value={severity} onChange={setSeverity} disabled={saving} />
                            <StatusPills label="Prioridad" map={BUG_PRIORITY} value={priority} onChange={setPriority} disabled={saving} />

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    QA asignado
                                </p>
                                <EntityPicker
                                    groups={qaGroups}
                                    value={assignedQaId ? { type: 'qa', id: assignedQaId } : null}
                                    onChange={(v) => setAssignedQaId(v?.id ?? null)}
                                    noneLabel="Sin asignar"
                                    searchPlaceholder="Buscar QA…"
                                    disabled={saving}
                                />
                                <p className="text-[10px] text-muted-foreground/50">
                                    Responsable de verificar y cerrar el bug.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    Dev asignado
                                </p>
                                <EntityPicker
                                    groups={devGroups}
                                    value={assignedDevId ? { type: 'dev', id: assignedDevId } : null}
                                    onChange={(v) => setAssignedDevId(v?.id ?? null)}
                                    noneLabel="Sin asignar"
                                    searchPlaceholder="Buscar Dev…"
                                    disabled={saving}
                                />
                                <p className="text-[10px] text-muted-foreground/50">
                                    Solo él verá este bug en "Mis Bugs" y podrá marcar su avance.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label htmlFor="bug-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    Título
                                </label>
                                <Input
                                    id="bug-title"
                                    placeholder="Ej: El botón de login no responde en móvil"
                                    value={title}
                                    maxLength={MAX_TITLE}
                                    onChange={(e) => { setTitle(e.target.value); setError(''); }}
                                    disabled={saving}
                                    autoFocus
                                    className={`h-11 text-sm rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-all ${
                                        error ? 'border-destructive focus:ring-destructive/10' : ''
                                    }`}
                                />
                                <div className="flex items-center justify-between">
                                    {error
                                        ? <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">{error}</p>
                                        : <span />}
                                    <p className="text-[10px] text-muted-foreground/50 tabular-nums">
                                        {title.length}/{MAX_TITLE}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="bug-description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    Descripción
                                </label>
                                <Textarea
                                    id="bug-description"
                                    placeholder="Pasos para reproducir, resultado esperado, evidencia..."
                                    value={description}
                                    maxLength={MAX_DESCRIPTION}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={saving}
                                    rows={6}
                                    className="resize-none text-sm rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-all"
                                />
                                <p className="text-[10px] text-muted-foreground/50 text-right tabular-nums">
                                    {description.length}/{MAX_DESCRIPTION}
                                </p>
                            </div>

                            <CreatedAtField
                                id="bug-created-at"
                                value={createdAt}
                                onChange={setCreatedAt}
                                disabled={saving}
                            />

                            <BugImagesPlaceholder />

                            {!isEditing && (
                                <p className="text-[10px] text-muted-foreground/50">
                                    El estado, la severidad y la prioridad se definen desde el Tablero de Bugs.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border/40 shrink-0 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={saving}
                        className="text-xs font-bold h-10 px-5 rounded-xl hover:bg-muted"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || (!isBoard && !title.trim())}
                        className="text-xs font-black h-10 px-7 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar Bug'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
