import { useEffect, useState } from 'react';
import { Folder, FolderOpen, Loader2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useFeatures } from '@/hooks/useFeatures';
import { useCommentCounts } from '@/hooks/useComments';
import { ENTITY_STATUS } from '@/lib/domain';
import { StatusDropdown } from './StatusDropdown';
import { FeatureFormModal } from './FeatureFormModal';
import { FeatureBugList } from './FeatureBugList';
import { CommentsPanel } from './CommentsPanel';
import { TREE_GRID, TreeLabel, RowActions } from './TreeRow';

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
        // Franja de acento a la izquierda: ata todo el bloque desplegado a su Epic.
        <div className="bg-muted/40 border-t border-border/60 border-l-[3px] border-l-primary/40">
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold">Cargando features...</span>
                </div>
            ) : features.length === 0 ? (
                <div className="py-10 text-center">
                    <p className="text-xs font-bold text-muted-foreground">Sin features todavía</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Agrega un feature para empezar a registrar bugs.
                    </p>
                </div>
            ) : (
                // Cada feature es una tarjeta propia: la separación entre bloques es
                // lo que hace legible la jerarquía, más que la sangría sola.
                <div className="p-3 space-y-2.5">
                    {features.map((feature) => {
                        const isExpanded = expandedIds.has(feature.id);
                        const bugCount = feature.bugs?.[0]?.count ?? 0;

                        return (
                            <div
                                key={feature.id}
                                className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden"
                            >
                                <div
                                    className="grid items-center hover:bg-muted/20 transition-colors"
                                    style={{ gridTemplateColumns: TREE_GRID }}
                                >
                                    <TreeLabel
                                        indent={10}
                                        expandable
                                        expanded={isExpanded}
                                        onToggle={() => toggle(feature.id)}
                                        toggleTitle={isExpanded ? 'Ocultar bugs' : 'Ver bugs'}
                                        icon={isExpanded ? FolderOpen : Folder}
                                        iconColor="var(--primary)"
                                        title={feature.name}
                                        subtitle={feature.description}
                                    />

                                    <StatusDropdown
                                        value={feature.status}
                                        map={ENTITY_STATUS}
                                        onChange={(status) => updateFeatureStatus(feature.id, status)}
                                    />

                                    <span className="text-[11px] font-bold text-muted-foreground/70 tabular-nums">
                                        {bugCount} {bugCount === 1 ? 'bug' : 'bugs'}
                                    </span>

                                    <span />

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
                                </div>

                                {isExpanded && (
                                    <FeatureBugList
                                        featureId={feature.id}
                                        openBugForm={addBugFor === feature.id}
                                        onBugFormOpened={() => setAddBugFor(null)}
                                        onContentChange={handleBugChange}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
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
        </div>
    );
}
