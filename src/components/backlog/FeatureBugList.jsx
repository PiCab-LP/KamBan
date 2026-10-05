import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug as BugIcon, Loader2, ArrowRight } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useBugs } from '@/hooks/useBugs';
import { useCommentCounts } from '@/hooks/useComments';
import { formatLocalDate } from '@/lib/format';
import { BugFormSheet } from './BugFormSheet';
import { CommentsPanel } from './CommentsPanel';
import { RowActions } from './TreeRow';
import {
    TREE_GRID, TREE_COL, BUG_INDENT, BUG_ACCENT, FEATURE_ICON_CENTER,
} from './treeLayout';

/** Largo del trazo horizontal que va de la línea del feature al ícono del bug. */
const TICK_WIDTH = 14;

/**
 * Línea que cuelga del ícono del feature y une a sus bugs: es lo que hace evidente
 * que son hijos suyos. `end` corta la línea a la mitad de la fila en el último bug,
 * y `tick` dibuja el trazo hacia el ícono.
 */
function Connector({ end = false, tick = true }) {
    return (
        <>
            <span
                aria-hidden
                className="absolute top-0 w-px bg-border"
                style={{ left: FEATURE_ICON_CENTER, height: end ? '50%' : '100%' }}
            />
            {tick && (
                <span
                    aria-hidden
                    className="absolute top-1/2 h-px bg-border"
                    style={{ left: FEATURE_ICON_CENTER, width: TICK_WIDTH }}
                />
            )}
        </>
    );
}

export function FeatureBugList({ featureId, onContentChange, openBugForm, onBugFormOpened }) {
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
        // Zona de bugs dentro de la tarjeta del feature: fondo propio, una cabecera
        // que la nombra y una línea que la cuelga del ícono del feature.
        <div className="border-t border-border/60 bg-muted/40">
            {/* Cabecera: dice qué es esta zona. Estado, severidad y prioridad no se
                muestran aquí; se ven y se cambian desde el Tablero de Bugs. */}
            <div
                className="relative grid items-center py-2 border-b border-border/40"
                style={{ gridTemplateColumns: TREE_GRID }}
            >
                <Connector tick={false} />
                <div
                    className="flex items-center gap-2 min-w-0"
                    style={{ paddingLeft: BUG_INDENT, gridColumn: `${TREE_COL.label} / span 4` }}
                >
                    <BugIcon size={13} strokeWidth={2.5} style={{ color: BUG_ACCENT }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/70">
                        Bugs
                    </span>
                    {!loading && (
                        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-foreground/10 text-foreground/70 text-[10px] font-black flex items-center justify-center tabular-nums">
                            {bugs.length}
                        </span>
                    )}
                </div>
                {bugs.length > 0 && (
                    <span
                        className="text-center text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/70"
                        style={{ gridColumn: TREE_COL.date }}
                    >
                        Fecha de creación
                    </span>
                )}
            </div>

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
                bugs.map((bug, index) => (
                    <div
                        key={bug.id}
                        className="relative grid items-center border-b border-border/30 last:border-b-0 hover:bg-card/70 transition-colors"
                        style={{ gridTemplateColumns: TREE_GRID }}
                    >
                        <Connector end={index === bugs.length - 1} />

                        <div
                            className="flex items-center gap-2 min-w-0 py-2.5"
                            style={{ paddingLeft: BUG_INDENT, gridColumn: `${TREE_COL.label} / span 3` }}
                        >
                            <BugIcon
                                size={15}
                                strokeWidth={2}
                                className="shrink-0"
                                style={{ color: BUG_ACCENT }}
                            />
                            <button
                                onClick={() => { setFormBug(bug); setFormOpen(true); }}
                                className="min-w-0 text-left"
                            >
                                <span className="block text-[12px] font-semibold text-foreground truncate">
                                    {bug.title}
                                </span>
                            </button>
                        </div>

                        {/* Donde el feature muestra su estado, el bug lleva a donde se ve el suyo. */}
                        <div className="pl-2" style={{ gridColumn: TREE_COL.status }}>
                            <Link
                                to={`/bugs?bug=${bug.id}`}
                                title="Ver el estado, la severidad y la prioridad en el Tablero de Bugs"
                                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                            >
                                Ver en el tablero
                                <ArrowRight size={13} strokeWidth={2.5} />
                            </Link>
                        </div>

                        <span
                            className="text-center text-xs font-medium text-muted-foreground/80"
                            style={{ gridColumn: TREE_COL.date }}
                        >
                            {formatLocalDate(bug.created_at)}
                        </span>

                        <RowActions
                            nested
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
