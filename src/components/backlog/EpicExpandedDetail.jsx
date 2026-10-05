import { Fragment, useEffect, useState } from 'react';
import { Folder, FolderOpen, Loader2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useFeatures } from '@/hooks/useFeatures';
import { useCommentCounts } from '@/hooks/useComments';
import { ENTITY_STATUS } from '@/lib/domain';
import { formatLocalDate } from '@/lib/format';
import { StatusDropdown } from './StatusDropdown';
import { FeatureFormModal } from './FeatureFormModal';
import { FeatureBugList } from './FeatureBugList';
import { CommentsPanel } from './CommentsPanel';
import { TreeLabel, RowActions } from './TreeRow';
import { FEATURE_INDENT, NESTED_STRIP } from './treeLayout';

/** Fila de mensaje (cargando / vacío) que ocupa las cuatro columnas de la tabla. */
function MessageRow({ children }) {
    return (
        <TableRow className="border-b border-border/40 bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={4} className={`${NESTED_STRIP} py-6 text-center`}>
                {children}
            </TableCell>
        </TableRow>
    );
}

/**
 * Filas de los features de un Epic. No dibuja su propia tabla: devuelve `<tr>`s que
 * se insertan en la tabla del Epic (Backlog.jsx), de modo que Estado, Fecha y Acciones
 * caen en las mismas columnas que las del Epic.
 */
export function EpicExpandedDetail({ epicId, onContentChange, openFeatureForm, onFeatureFormOpened }) {
    const {
        features, loading, fetchFeatures,
        createFeature, updateFeature, updateFeatureStatus, deleteFeature,
    } = useFeatures(epicId);

    // El conteo de bugs de cada feature viene del select con bugs(count), así que
    // al crear o borrar un bug hay que volver a pedirlo.
    const handleBugChange = () => {
        fetchFeatures();
        onContentChange?.();
    };

    const [expandedIds, setExpandedIds] = useState(new Set());
    const [addBugFor, setAddBugFor] = useState(null);
    const [formFeature, setFormFeature] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [commentTarget, setCommentTarget] = useState(null);

    const commentCounts = useCommentCounts('feature', features.map((f) => f.id));

    // El botón de agregar feature vive en la fila del Epic, que está en Backlog.jsx;
    // el formulario y la mutación viven aquí, junto a useFeatures. Esta señal los une.
    useEffect(() => {
        if (!openFeatureForm) return;
        setFormFeature(null);
        setFormOpen(true);
        onFeatureFormOpened?.();
    }, [openFeatureForm, onFeatureFormOpened]);

    // Mismo patrón que el botón de agregar feature del Epic: el botón vive en la
    // fila del padre y el formulario en el hijo, junto a su mutación.
    const handleAddBug = (featureId) => {
        setExpandedIds((prev) => new Set(prev).add(featureId));
        setAddBugFor(featureId);
    };

    const toggle = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async (data) => {
        const result = formFeature
            ? await updateFeature(formFeature.id, data)
            : await createFeature(data);
        if (result.success) onContentChange?.();
        return result;
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteFeature(deleting.id);
        setIsDeleting(false);
        setDeleting(null);
        onContentChange?.();
    };

    return (
        <>
            {loading ? (
                <MessageRow>
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs font-bold">Cargando features...</span>
                    </span>
                </MessageRow>
            ) : features.length === 0 ? (
                <MessageRow>
                    <p className="text-xs font-bold text-muted-foreground">Sin features todavía</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Agrega un feature para empezar a registrar bugs.
                    </p>
                </MessageRow>
            ) : (
                features.map((feature) => {
                    const isExpanded = expandedIds.has(feature.id);
                    const bugCount = feature.bugs?.[0]?.count ?? 0;

                    return (
                        <Fragment key={feature.id}>
                            <TableRow
                                className={`border-b border-border/40 transition-colors ${isExpanded ? 'bg-primary/5 hover:bg-primary/5' : 'bg-muted/30 hover:bg-muted/50'}`}
                            >
                                <TableCell className={`${NESTED_STRIP} p-0`}>
                                    <TreeLabel
                                        indent={FEATURE_INDENT}
                                        expandable
                                        expanded={isExpanded}
                                        onToggle={() => toggle(feature.id)}
                                        toggleTitle={isExpanded ? 'Ocultar bugs' : 'Ver bugs'}
                                        icon={isExpanded ? FolderOpen : Folder}
                                        iconColor="var(--primary)"
                                        title={feature.name}
                                        subtitle={feature.description}
                                        meta={(
                                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-foreground/10 text-[10px] font-bold text-foreground/70 tabular-nums">
                                                {bugCount} {bugCount === 1 ? 'bug' : 'bugs'}
                                            </span>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="py-2">
                                    <StatusDropdown
                                        value={feature.status}
                                        map={ENTITY_STATUS}
                                        onChange={(status) => updateFeatureStatus(feature.id, status)}
                                    />
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-muted-foreground/80">
                                    {formatLocalDate(feature.created_at)}
                                </TableCell>
                                <TableCell className="py-2">
                                    <RowActions
                                        entityLabel="feature"
                                        addLabel="Agregar bug"
                                        addText="Bug"
                                        onAdd={() => handleAddBug(feature.id)}
                                        commentCount={commentCounts[feature.id] || 0}
                                        onComment={() => setCommentTarget({ type: 'feature', id: feature.id, title: feature.name })}
                                        onEdit={() => { setFormFeature(feature); setFormOpen(true); }}
                                        onDelete={() => setDeleting(feature)}
                                    />
                                </TableCell>
                            </TableRow>

                            {isExpanded && (
                                <FeatureBugList
                                    featureId={feature.id}
                                    openBugForm={addBugFor === feature.id}
                                    onBugFormOpened={() => setAddBugFor(null)}
                                    onContentChange={handleBugChange}
                                />
                            )}
                        </Fragment>
                    );
                })
            )}

            <FeatureFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                feature={formFeature}
                onSave={handleSave}
            />

            <ConfirmDeleteModal
                isOpen={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title={`¿Eliminar "${deleting?.name}"?`}
                description="Se eliminarán también todos sus bugs. Esta acción no se puede deshacer."
            />

            <CommentsPanel
                open={Boolean(commentTarget)}
                onClose={() => setCommentTarget(null)}
                target={commentTarget}
            />
        </>
    );
}
