import { useEffect, useState } from 'react';
import { Bug as BugIcon, Loader2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { StatusBadge, ReopenedBadge } from '@/components/ui/StatusBadge';
import { useBugs } from '@/hooks/useBugs';
import { useCommentCounts } from '@/hooks/useComments';
import { BUG_STATUS, BUG_SEVERITY, BUG_PRIORITY } from '@/lib/domain';
import { StatusDropdown } from './StatusDropdown';
import { BugFormSheet } from './BugFormSheet';
import { CommentsPanel } from './CommentsPanel';
import { TREE_GRID, TREE_INDENT, TREE_ICON_OFFSET, RowActions } from './TreeRow';

/** Un nivel por debajo de la etiqueta del feature (que arranca con 10px de sangría). */
const BUG_INDENT = 10 + TREE_INDENT + TREE_ICON_OFFSET;

export function FeatureBugList({ featureId, onContentChange, openBugForm, onBugFormOpened }) {
    const {
        bugs, loading, createBug, updateBug, updateBugStatus, deleteBug,
    } = useBugs({ featureId });

    const [formBug, setFormBug] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [commentTarget, setCommentTarget] = useState(null);

    const commentCounts = useCommentCounts('bug', bugs.map((b) => b.id));

    // El botón de agregar bug vive en la fila del feature; el formulario y la
    // mutación viven aquí, junto a useBugs. Esta señal los une.
    useEffect(() => {
        if (!openBugForm) return;
        setFormBug(null);
        setFormOpen(true);
        onBugFormOpened?.();
    }, [openBugForm, onBugFormOpened]);

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
        // Sección anidada dentro de la tarjeta del feature: el borde superior y el
        // fondo más apagado la separan de la cabecera del feature.
        <div className="border-t border-border/60 bg-muted/30">
            {loading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground" style={{ paddingLeft: BUG_INDENT }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px] font-bold">Cargando bugs...</span>
                </div>
            ) : bugs.length === 0 ? (
                <p
                    className="py-4 text-[11px] font-bold text-muted-foreground/60"
                    style={{ paddingLeft: BUG_INDENT }}
                >
                    Sin bugs registrados
                </p>
            ) : (
                bugs.map((bug) => (
                    <div
                        key={bug.id}
                        className="grid items-center border-b border-border/30 last:border-b-0 hover:bg-muted/50 transition-colors"
                        style={{ gridTemplateColumns: TREE_GRID }}
                    >
                        {/* Sin chevron: replica el offset del ícono para alinearse
                            con el nombre del feature de arriba. */}
                        <div
                            className="flex items-center gap-2 min-w-0 py-2.5"
                            style={{ paddingLeft: BUG_INDENT }}
                        >
                            <BugIcon
                                size={15}
                                strokeWidth={2}
                                className="shrink-0"
                                style={{ color: BUG_SEVERITY[bug.severity]?.color }}
                            />
                            <button
                                onClick={() => { setFormBug(bug); setFormOpen(true); }}
                                className="min-w-0 flex items-center gap-2 text-left"
                            >
                                <span className="text-[12px] font-bold text-foreground truncate">
                                    {bug.title}
                                </span>
                                {bug.is_reopened && <ReopenedBadge />}
                            </button>
                        </div>

                        <StatusDropdown
                            value={bug.status}
                            map={BUG_STATUS}
                            onChange={(status) => updateBugStatus(bug.id, status)}
                        />

                        <StatusBadge value={bug.severity} map={BUG_SEVERITY} showDot={false} />
                        <StatusBadge value={bug.priority} map={BUG_PRIORITY} showDot={false} />

                        <RowActions
                            entityLabel="bug"
                            commentCount={commentCounts[bug.id] || 0}
                            onComment={() => setCommentTarget({ type: 'bug', id: bug.id, title: bug.title })}
                            onEdit={() => { setFormBug(bug); setFormOpen(true); }}
                            onDelete={() => setDeleting(bug)}
                        />
                    </div>
                ))
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
