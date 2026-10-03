import { useState } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { Button } from '@/components/ui/button';
import { StatusBadge, ReopenedBadge } from '@/components/ui/StatusBadge';
import { useBugs } from '@/hooks/useBugs';
import { useCommentCounts } from '@/hooks/useComments';
import { BUG_STATUS, BUG_SEVERITY, BUG_PRIORITY } from '@/lib/domain';
import { StatusDropdown } from './StatusDropdown';
import { BugFormSheet } from './BugFormSheet';
import { CommentsPanel } from './CommentsPanel';

const GRID = '1fr 170px 110px 110px 64px 56px';

export function FeatureBugList({ featureId, onContentChange }) {
    const {
        bugs, loading, createBug, updateBug, updateBugStatus, deleteBug,
    } = useBugs({ featureId });

    const [formBug, setFormBug] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [commentTarget, setCommentTarget] = useState(null);

    const commentCounts = useCommentCounts('bug', bugs.map((b) => b.id));

    const handleSave = async (data) => {
        const result = formBug ? await updateBug(formBug.id, data) : await createBug(data);
        if (result.success) onContentChange?.();
        return result;
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteBug(deleting.id);
        setIsDeleting(false);
        setDeleting(null);
        onContentChange?.();
    };

    return (
        <div className="py-2">
            <div className="flex items-center justify-between py-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Bugs
                </h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFormBug(null); setFormOpen(true); }}
                    className="h-7 px-2.5 gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/10"
                >
                    <Plus size={13} strokeWidth={3} />
                    Bug
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px] font-bold">Cargando bugs...</span>
                </div>
            ) : bugs.length === 0 ? (
                <div className="py-6 text-center">
                    <p className="text-[11px] font-bold text-muted-foreground/70">Sin bugs registrados</p>
                </div>
            ) : (
                <div className="rounded-xl border border-border/40 overflow-hidden bg-card">
                    <div
                        className="grid items-center px-4 py-2 bg-muted/40 border-b border-border/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60"
                        style={{ gridTemplateColumns: GRID }}
                    >
                        <span>Bug</span>
                        <span>Estado</span>
                        <span>Severidad</span>
                        <span>Prioridad</span>
                        <span className="text-center">Notas</span>
                        <span />
                    </div>

                    {bugs.map((bug) => (
                        <div
                            key={bug.id}
                            className="grid items-center px-4 min-h-[48px] border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
                            style={{ gridTemplateColumns: GRID }}
                        >
                            <button
                                onClick={() => { setFormBug(bug); setFormOpen(true); }}
                                className="flex items-center gap-2 text-left pr-4 py-2.5 min-w-0"
                            >
                                <span className="text-[12px] font-bold text-foreground truncate">
                                    {bug.title}
                                </span>
                                {bug.is_reopened && <ReopenedBadge />}
                            </button>

                            <StatusDropdown
                                value={bug.status}
                                map={BUG_STATUS}
                                onChange={(status) => updateBugStatus(bug.id, status)}
                            />

                            <StatusBadge value={bug.severity} map={BUG_SEVERITY} showDot={false} />
                            <StatusBadge value={bug.priority} map={BUG_PRIORITY} showDot={false} />

                            <button
                                onClick={() => setCommentTarget({ type: 'bug', id: bug.id, title: bug.title })}
                                className="w-full h-full flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
                                title="Comentarios"
                            >
                                <div className="relative">
                                    <MessageSquare size={15} strokeWidth={2} />
                                    {commentCounts[bug.id] > 0 && (
                                        <span className="absolute -top-2 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center leading-none">
                                            {commentCounts[bug.id] > 9 ? '9+' : commentCounts[bug.id]}
                                        </span>
                                    )}
                                </div>
                            </button>

                            <div className="flex items-center justify-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/40 transition-colors">
                                            <MoreVertical size={14} strokeWidth={2} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-border/40">
                                        <button
                                            onClick={() => { setFormBug(bug); setFormOpen(true); }}
                                            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold hover:bg-muted/60 rounded-md transition-colors cursor-pointer"
                                        >
                                            <Pencil size={13} strokeWidth={2.5} />
                                            Editar bug
                                        </button>
                                        <div className="h-px bg-border/40 my-1" />
                                        <button
                                            onClick={() => setDeleting(bug)}
                                            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={13} strokeWidth={2.5} />
                                            Eliminar
                                        </button>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <BugFormSheet
                open={formOpen}
                onClose={() => setFormOpen(false)}
                bug={formBug}
                onSave={handleSave}
            />

            <ConfirmDeleteModal
                isOpen={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title={`¿Eliminar "${deleting?.title}"?`}
                description="El bug y sus comentarios se eliminarán permanentemente."
            />

            <CommentsPanel
                open={Boolean(commentTarget)}
                onClose={() => setCommentTarget(null)}
                target={commentTarget}
            />
        </div>
    );
}
