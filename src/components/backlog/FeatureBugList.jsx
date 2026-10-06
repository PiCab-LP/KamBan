import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug as BugIcon, Loader2, ArrowRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useBugs } from '@/hooks/useBugs';
import { useCommentCounts } from '@/hooks/useComments';
import { formatLocalDate } from '@/lib/format';
import { BugFormSheet } from './BugFormSheet';
import { CommentsPanel } from './CommentsPanel';
import { RowActions } from './TreeRow';
import {
    BUG_INDENT, BUG_ACCENT, FEATURE_ICON_CENTER, TICK_WIDTH, NESTED_STRIP,
} from './treeLayout';

/**
 * Línea que cuelga del ícono del feature y une a sus bugs: es lo que hace evidente
 * que son hijos suyos. `end` corta la línea a la mitad de la fila en el último bug.
 */
function Connector({ end = false }) {
    return (
        <>
            <span
                aria-hidden
                className="absolute top-0 w-px bg-border"
                style={{ left: FEATURE_ICON_CENTER, height: end ? '50%' : '100%' }}
            />
            <span
                aria-hidden
                className="absolute top-1/2 h-px bg-border"
                style={{ left: FEATURE_ICON_CENTER, width: TICK_WIDTH }}
            />
        </>
    );
}

/** Fila de mensaje (cargando / vacío) bajo un feature, sangrada al nivel de los bugs. */
function MessageRow({ children }) {
    return (
        <TableRow className="border-b border-border/30 bg-muted/50 hover:bg-muted/50">
            <TableCell colSpan={4} className={`${NESTED_STRIP} py-4`} style={{ paddingLeft: BUG_INDENT }}>
                {children}
            </TableCell>
        </TableRow>
    );
}

/**
 * Filas de los bugs de un feature. Como las de los features, son `<tr>`s de la tabla
 * del Epic. Aquí no se muestran estado, severidad ni prioridad: se ven y se cambian
 * desde el Tablero de Bugs, al que lleva el enlace "Ver en el tablero".
 */
export function FeatureBugList({ featureId, canManage = true, onContentChange, openBugForm, onBugFormOpened }) {
    const {
        bugs, loading, createBug, updateBug, deleteBug,
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
        <>
            {loading ? (
                <MessageRow>
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[11px] font-bold">Cargando bugs...</span>
                    </span>
                </MessageRow>
            ) : bugs.length === 0 ? (
                <MessageRow>
                    <span className="text-[11px] font-bold text-muted-foreground/60">
                        Sin bugs registrados
                    </span>
                </MessageRow>
            ) : (
                bugs.map((bug, index) => (
                    <TableRow
                        key={bug.id}
                        className="border-b border-border/30 bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                        <TableCell className={`relative p-0 ${NESTED_STRIP}`}>
                            <Connector end={index === bugs.length - 1} />
                            <div
                                className="flex items-center gap-2 min-w-0 py-2.5"
                                style={{ paddingLeft: BUG_INDENT }}
                            >
                                <BugIcon
                                    size={15}
                                    strokeWidth={2}
                                    className="shrink-0"
                                    style={{ color: BUG_ACCENT }}
                                />
                                {canManage ? (
                                    <button
                                        onClick={() => { setFormBug(bug); setFormOpen(true); }}
                                        className="min-w-0 text-left"
                                    >
                                        <span className="block text-[12px] font-semibold text-foreground truncate">
                                            {bug.title}
                                        </span>
                                    </button>
                                ) : (
                                    <span className="block min-w-0 text-[12px] font-semibold text-foreground truncate">
                                        {bug.title}
                                    </span>
                                )}
                            </div>
                        </TableCell>

                        {/* Donde el Epic y el feature muestran su Estado, el bug lleva a donde se ve el suyo. */}
                        <TableCell className="py-2">
                            <Link
                                to={`/bugs?bug=${bug.id}`}
                                title="Ver el estado, la severidad y la prioridad en el Tablero de Bugs"
                                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                            >
                                Ver en el tablero
                                <ArrowRight size={13} strokeWidth={2.5} />
                            </Link>
                        </TableCell>

                        <TableCell className="text-center text-sm font-medium text-muted-foreground/80">
                            {formatLocalDate(bug.created_at)}
                        </TableCell>

                        <TableCell className="py-2">
                            <RowActions
                                canManage={canManage}
                                entityLabel="bug"
                                commentCount={commentCounts[bug.id] || 0}
                                onComment={() => setCommentTarget({ type: 'bug', id: bug.id, title: bug.title })}
                                onEdit={() => { setFormBug(bug); setFormOpen(true); }}
                                onDelete={() => setDeleting(bug)}
                            />
                        </TableCell>
                    </TableRow>
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
        </>
    );
}
