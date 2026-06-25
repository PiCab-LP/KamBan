import { useState, useEffect } from 'react';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { CommentsPanel } from './CommentsPanel';
import { supabase } from '@/lib/supabaseClient';
import {
    GripVertical, MoreVertical, Pencil, Copy, Trash2, MessageSquare, ChevronDown,
} from 'lucide-react';

const STATUS_CONFIG = {
    listo:     { label: 'Listo',     color: '#ffffff', bg: '#10b981', light: '#10b98118' },
    pendiente: { label: 'Pendiente', color: '#ffffff', bg: '#f59e0b', light: '#f59e0b18' },
    detenido:  { label: 'Detenido',  color: '#ffffff', bg: '#ef4444', light: '#ef444418' },
};

const PHASE_ORDER_IDS = [
    'Fase 1: Comercial y Administrativa',
    'Fase 2: Recopilación de Información',
    'Fase 3: Diseño y Assets',
    'Fase 4: Configuración e Integración (Backend)',
    'Fase 5: QA & Testing',
    'Fase 6: Cierre y Handover',
];

function getTaskStatus(task) {
    return task.item_status ?? (task.is_completed ? 'listo' : 'pendiente');
}

function sortInitial(tasks) {
    return [...tasks].sort((a, b) => {
        const phaseA = PHASE_ORDER_IDS.indexOf(a.phase ?? '');
        const phaseB = PHASE_ORDER_IDS.indexOf(b.phase ?? '');
        if (phaseA !== phaseB) return phaseA - phaseB;
        return (a.position ?? 0) - (b.position ?? 0);
    });
}

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableTaskRow({ task, commentCount, onUpdateStatus, onEdit, onDelete, onDuplicate, onOpenComments }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : undefined,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
    };

    const [statusOpen, setStatusOpen] = useState(false);

    const status = getTaskStatus(task);
    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, gridTemplateColumns: '32px 1fr 130px 72px 72px' }}
            className={`grid border-b border-border/50 last:border-border/60 bg-card transition-all group ${
                statusOpen
                    ? 'ring-2 ring-primary/30 ring-inset bg-primary/5 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]'
                    : 'hover:bg-muted/10'
            }`}
        >
            {/* Drag handle */}
            <div className="flex items-center justify-center">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors p-1 touch-none"
                >
                    <GripVertical size={15} strokeWidth={2} />
                </button>
            </div>

            {/* Task name */}
            <div className="flex items-center px-3 py-2.5 min-w-0">
                <span className="text-[13px] font-semibold text-foreground truncate">
                    {task.task_key}
                </span>
            </div>

            {/* Status picker — fills full column */}
            <div className="flex items-stretch border-l border-border/20">
                <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-black transition-all hover:opacity-80"
                            style={{ color: statusCfg.bg, backgroundColor: statusCfg.light }}
                        >
                            {statusCfg.label}
                            <ChevronDown size={10} strokeWidth={3} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 rounded-none shadow-lg border-none p-2 flex flex-col gap-1.5">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => { onUpdateStatus(task.id, key); setStatusOpen(false); }}
                                className="text-[12px] font-black py-2.5 rounded-none w-full text-center transition-all hover:brightness-110 hover:scale-[1.03] active:scale-95 active:brightness-90"
                                style={{ color: cfg.color, backgroundColor: cfg.bg }}
                            >
                                {cfg.label}
                            </button>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Comments */}
            <div className="flex items-stretch border-l border-border/20">
                <button
                    onClick={() => onOpenComments(task)}
                    className="w-full flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                    <div className="relative">
                        <MessageSquare size={18} strokeWidth={2} />
                        {commentCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center leading-none">
                                {commentCount > 9 ? '9+' : commentCount}
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {/* Actions column */}
            <div className="flex items-center justify-center border-l border-border/20">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-md text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/40 transition-colors">
                            <MoreVertical size={16} strokeWidth={2} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border-border/40">
                        <button onClick={() => onEdit(task)} className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold hover:bg-muted/60 rounded-md transition-colors cursor-pointer">
                            <Pencil size={13} strokeWidth={2.5} />
                            Editar nombre
                        </button>
                        <button onClick={() => onDuplicate(task)} className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold hover:bg-muted/60 rounded-md transition-colors cursor-pointer">
                            <Copy size={13} strokeWidth={2.5} />
                            Duplicar
                        </button>
                        <div className="h-px bg-border/40 my-1" />
                        <button onClick={() => onDelete(task.id)} className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer">
                            <Trash2 size={13} strokeWidth={2.5} />
                            Eliminar
                        </button>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CompanyExpandedDetail({
    tasks,
    loading,
    onUpdateTaskStatus,
    onReorderTasks,
    onEditTask,
    onDeleteTask,
    onDuplicateTask,
}) {
    const [localTasks, setLocalTasks] = useState(() => sortInitial(tasks));
    const [editingTask, setEditingTask] = useState(null);
    const [editName, setEditName] = useState('');
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [commentTask, setCommentTask] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});

    useEffect(() => {
        const localIds = localTasks.map(t => t.id).sort().join(',');
        const propIds  = tasks.map(t => t.id).sort().join(',');
        if (localIds !== propIds) {
            // Set of tasks changed (add/delete) — full re-sort from props
            setLocalTasks(sortInitial(tasks));
        } else {
            // Only data changed (status, name, etc.) — merge to preserve drag order
            setLocalTasks(prev => prev.map(lt => tasks.find(t => t.id === lt.id) ?? lt));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks]);

    const fetchCommentCounts = async (taskList) => {
        if (!taskList.length) return;
        const { data } = await supabase
            .from('task_comments')
            .select('task_id')
            .in('task_id', taskList.map(t => t.id));
        if (!data) return;
        const counts = {};
        data.forEach(({ task_id }) => { counts[task_id] = (counts[task_id] || 0) + 1; });
        setCommentCounts(counts);
    };

    useEffect(() => {
        fetchCommentCounts(localTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localTasks.length]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const totalTasks = localTasks.length;
    const completedTasks = localTasks.filter(t => getTaskStatus(t) === 'listo').length;
    const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIndex = localTasks.findIndex(t => t.id === active.id);
        const newIndex = localTasks.findIndex(t => t.id === over.id);
        const reordered = arrayMove(localTasks, oldIndex, newIndex);
        setLocalTasks(reordered);
        onReorderTasks(reordered);
    };

    const openEdit = (task) => {
        setEditingTask(task);
        setEditName(task.task_key);
    };

    const confirmEdit = () => {
        if (!editName.trim() || !editingTask) return;
        onEditTask(editingTask.id, editName.trim());
        setEditingTask(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="bg-muted/10 animate-kanban-fade-in border-t border-border/40">
            {/* Progress bar */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-border/40">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest shrink-0">
                    Progreso General
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                <span className="text-sm font-black text-primary tabular-nums shrink-0 w-10 text-right">
                    {overallProgress}%
                </span>
            </div>

            {/* Column headers */}
            <div
                className="grid border-b border-border/60 bg-muted/60"
                style={{ gridTemplateColumns: '32px 1fr 130px 72px 72px' }}
            >
                <div />
                <div className="px-3 py-2.5">
                    <span className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">Tarea</span>
                </div>
                <div className="flex items-center justify-center border-l border-border/40 py-2.5">
                    <span className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">Estado</span>
                </div>
                <div className="flex items-center justify-center border-l border-border/40 py-2.5">
                    <span className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">Notas</span>
                </div>
                <div className="flex items-center justify-center border-l border-border/40 py-2.5">
                    <span className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">Acciones</span>
                </div>
            </div>

            {/* Task list with DnD */}
            {localTasks.length === 0 ? (
                <p className="py-8 text-center text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Sin tareas asignadas
                </p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {localTasks.map(task => (
                            <SortableTaskRow
                                key={task.id}
                                task={task}
                                commentCount={commentCounts[task.id] ?? 0}
                                onUpdateStatus={onUpdateTaskStatus}
                                onEdit={openEdit}
                                onDelete={setDeletingTaskId}
                                onDuplicate={onDuplicateTask}
                                onOpenComments={setCommentTask}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            )}

            {/* Edit name modal */}
            <Dialog open={editingTask !== null} onOpenChange={() => setEditingTask(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-black">Editar tarea</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-1">
                        <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                            className="rounded-xl text-sm"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setEditingTask(null)} className="flex-1 rounded-xl text-xs font-bold">
                                Cancelar
                            </Button>
                            <Button onClick={confirmEdit} className="flex-1 rounded-xl text-xs font-black">
                                Guardar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <ConfirmDeleteModal
                isOpen={deletingTaskId !== null}
                onClose={() => setDeletingTaskId(null)}
                onConfirm={() => {
                    onDeleteTask(deletingTaskId);
                    setDeletingTaskId(null);
                }}
                title="¿Eliminar tarea?"
                description="Esta acción es permanente y no se puede deshacer."
            />

            {/* Comments panel */}
            <CommentsPanel
                open={commentTask !== null}
                onClose={() => {
                    setCommentTask(null);
                    fetchCommentCounts(localTasks);
                }}
                task={commentTask}
            />
        </div>
    );
}
