import { useState } from 'react';
import {
    ChevronDown, ChevronRight, Plus, MoreVertical, Pencil, Trash2, MessageSquare, Loader2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { Button } from '@/components/ui/button';
import { useFeatures } from '@/hooks/useFeatures';
import { useCommentCounts } from '@/hooks/useComments';
import { ENTITY_STATUS } from '@/lib/domain';
import { StatusDropdown } from './StatusDropdown';
import { FeatureFormModal } from './FeatureFormModal';
import { FeatureBugList } from './FeatureBugList';
import { CommentsPanel } from './CommentsPanel';

const GRID = '28px 1fr 180px 90px 64px 56px';

function CommentButton({ count, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full h-full flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
            title="Comentarios"
        >
            <div className="relative">
                <MessageSquare size={16} strokeWidth={2} />
                {count > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center leading-none">
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </div>
        </button>
    );
}

export function EpicExpandedDetail({ epicId, onContentChange }) {
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
    const [formFeature, setFormFeature] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [commentTarget, setCommentTarget] = useState(null);

    const commentCounts = useCommentCounts('feature', features.map((f) => f.id));

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
        <div className="bg-muted/10 border-t border-border/40">
            <div className="flex items-center justify-between px-8 py-3 border-b border-border/30">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
                    Features
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFormFeature(null); setFormOpen(true); }}
                    className="h-8 px-3 gap-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-primary hover:bg-primary/10"
                >
                    <Plus size={14} strokeWidth={3} />
                    Feature
                </Button>
            </div>

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
                <>
                    <div
                        className="grid items-center px-8 py-2 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50"
                        style={{ gridTemplateColumns: GRID }}
                    >
                        <span />
                        <span>Feature</span>
                        <span>Estado</span>
                        <span className="text-center">Bugs</span>
                        <span className="text-center">Notas</span>
                        <span />
                    </div>

                    {features.map((feature) => {
                        const isExpanded = expandedIds.has(feature.id);
                        const bugCount = feature.bugs?.[0]?.count ?? 0;

                        return (
                            <div key={feature.id} className="border-b border-border/30 last:border-b-0">
                                <div
                                    className="grid items-center px-8 min-h-[52px] hover:bg-muted/20 transition-colors"
                                    style={{ gridTemplateColumns: GRID }}
                                >
                                    <button
                                        onClick={() => toggle(feature.id)}
                                        className="flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors"
                                        title={isExpanded ? 'Ocultar bugs' : 'Ver bugs'}
                                    >
                                        {isExpanded
                                            ? <ChevronDown size={16} strokeWidth={2.5} />
                                            : <ChevronRight size={16} strokeWidth={2.5} />}
                                    </button>

                                    <button onClick={() => toggle(feature.id)} className="text-left pr-4 py-2.5">
                                        <span className="text-[13px] font-bold text-foreground">{feature.name}</span>
                                        {feature.description && (
                                            <span className="block text-[11px] text-muted-foreground/70 truncate">
                                                {feature.description}
                                            </span>
                                        )}
                                    </button>

                                    <StatusDropdown
                                        value={feature.status}
                                        map={ENTITY_STATUS}
                                        onChange={(status) => updateFeatureStatus(feature.id, status)}
                                    />

                                    <span className="text-center text-[11px] font-black text-muted-foreground tabular-nums">
                                        {bugCount}
                                    </span>

                                    <CommentButton
                                        count={commentCounts[feature.id] || 0}
                                        onClick={() => setCommentTarget({ type: 'feature', id: feature.id, title: feature.name })}
                                    />

                                    <div className="flex items-center justify-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-2 rounded-md text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/40 transition-colors">
                                                    <MoreVertical size={15} strokeWidth={2} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border-border/40">
                                                <button
                                                    onClick={() => { setFormFeature(feature); setFormOpen(true); }}
                                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold hover:bg-muted/60 rounded-md transition-colors cursor-pointer"
                                                >
                                                    <Pencil size={13} strokeWidth={2.5} />
                                                    Editar feature
                                                </button>
                                                <div className="h-px bg-border/40 my-1" />
                                                <button
                                                    onClick={() => setDeleting(feature)}
                                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={13} strokeWidth={2.5} />
                                                    Eliminar
                                                </button>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="pl-14 pr-8 pb-4 bg-muted/20">
                                        <div className="border-l-2 border-primary/15 pl-4">
                                            <FeatureBugList
                                                featureId={feature.id}
                                                onContentChange={handleBugChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
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
