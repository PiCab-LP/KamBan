import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Plus, CheckSquare } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  closestCorners,
  useDroppable,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../context/ToastContext';
import { TaskModal } from '../components/kanban/TaskModal';
import '../App.css';

const STATUS_COLORS = {
  nuevo: 'var(--status-nuevo)',
  in_progress: 'var(--status-in_progress)',
  blocked: 'var(--status-blocked)',
  done: 'var(--status-done)',
};

const STATUS_BG = {
  nuevo: 'var(--status-nuevo-bg)',
  in_progress: 'var(--status-in_progress-bg)',
  blocked: 'var(--status-blocked-bg)',
  done: 'var(--status-done-bg)',
};

const COLUMN_CONFIG = {
  nuevo: { title: 'Nuevo', description: 'Tareas por iniciar' },
  in_progress: { title: 'En Proceso', description: 'Desarrollo activo' },
  blocked: { title: 'Bloqueado', description: 'Requiere atención' },
  done: { title: 'Completado', description: 'Finalizado' },
};

const AVATAR_COLORS = [
  'hsl(217 91% 55%)',
  'hsl(262 60% 50%)',
  'hsl(160 60% 40%)',
  'hsl(30 90% 50%)',
  'hsl(340 65% 50%)',
  'hsl(190 80% 42%)',
];

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// 1. Droppable Column
function DroppableColumn({ id, children, count }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const config = COLUMN_CONFIG[id];
  if (!config) return null; // Seguridad contra estados obsoletos
  
  const { title, description } = config;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-shrink-0 w-[300px] rounded-3xl transition-all duration-300 ease-in-out border-2 ${isOver ? 'bg-primary/5 border-primary/30 scale-[1.02] shadow-xl' : 'bg-muted/30 border-transparent'
        }`}
    >
      {/* Column Header */}
      <div className="px-5 pt-5 pb-4">
        <div
          className="h-1.5 w-12 rounded-full mb-4"
          style={{ backgroundColor: `var(--status-${id.toLowerCase()})` }}
        />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground tracking-tight uppercase">
              {title}
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
              {description}
            </p>
          </div>
          <span
            className="flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black shadow-sm"
            style={{
              backgroundColor: `var(--status-${id.toLowerCase()}-bg)`,
              color: `var(--status-${id.toLowerCase()})`,
            }}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 px-3 pb-4 space-y-3 overflow-y-auto max-h-[calc(80vh-100px)] custom-scrollbar">
        {children}
        {count === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-muted-foreground/10 rounded-2xl animate-pulse">
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Vacio
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Shared Card UI
function KanbanCardUI({ task, isOverlay, dragHandleProps, onEdit }) {
  // If the task belongs to a company, we might have company data
  const companyName = task.companies ? task.companies.name : 'Global';
  const avatarColor = getAvatarColor(companyName);
  const initials = getInitials(companyName);
  const isLaunched = task.status === 'done';

  return (
    <Card
      className={`
        border-border/40 overflow-hidden bg-card transition-all duration-300 rounded-xl w-full
        ${isOverlay ? 'ring-2 ring-primary/40 shadow-2xl opacity-95' : 'hover:border-primary/30 hover:shadow-lg hover:shadow-black/5'}
      `}
    >
      <div className="flex items-stretch min-h-[48px]">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="flex items-center justify-center px-1.5 text-muted-foreground/45 bg-muted/5 border-r border-border/30 cursor-grab active:cursor-grabbing group-hover:text-muted-foreground/70 transition-colors duration-200"
        >
          <GripVertical size={12} />
        </div>

        {/* Card Body */}
        <div
          className="flex-1 flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none"
          onClick={() => onEdit && onEdit(task)}
        >
          <div
            className="flex items-center justify-center shrink-0 w-7 h-7 rounded-lg text-white text-[9px] font-black shadow-sm"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div className="space-y-0 text-left">
            <p className="text-[11px] font-bold text-foreground leading-tight line-clamp-1">
              {task.title}
            </p>
            <div className="flex items-center gap-1 opacity-60">
              <div className={`w-1 h-1 rounded-full ${isLaunched ? 'bg-status-done' : 'bg-primary/40'}`} />
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                {companyName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// 3. Sortable Wrapper
function SortableCard({ task, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <KanbanCardUI
        task={task}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
        isOverlay={false}
      />
    </div>
  );
}

export default function Kanban() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Estrategia de colision personalizada para mejorar la deteccion entre columnas
  const collisionDetectionStrategy = (args) => {
    // 1. Priorizar donde esta el puntero (mas intuitivo para el usuario)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;

    // 2. Si no hay puntero, usar interseccion de rectangulos (solapamiento de la tarjeta)
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;

    // 3. Fallback a esquinas mas cercanas para el efecto "magnetico" entre gaps
    return closestCorners(args);
  };

  const columns = ['todo', 'in_progress', 'blocked', 'done'];

  async function fetchTasks() {
    const { data } = await supabase
      .from('personal_tasks')
      .select('*, companies(name)')
      .order('position', { ascending: true });
    setTasks(data || []);
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);

    if (!activeTask) return;

    const activeContainer = activeTask.status;
    const overContainer = overTask ? overTask.status : overId;

    if (!Object.keys(COLUMN_CONFIG).includes(overContainer)) return;

    if (activeContainer !== overContainer) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex(t => t.id === activeId);

        let overIndex;
        if (overTask) {
          overIndex = prev.findIndex(t => t.id === overId);
        } else {
          const lastIndexInCol = prev.map((t, i) => t.status === overContainer ? i : -1).reduce((max, i) => Math.max(max, i), -1);
          overIndex = lastIndexInCol !== -1 ? lastIndexInCol + 1 : prev.length;
        }

        const updated = [...prev];
        updated[activeIndex] = {
          ...activeTask,
          status: overContainer
        };

        return arrayMove(updated, activeIndex, Math.min(overIndex, updated.length - 1));
      });
    } else {
      setTasks((prev) => {
        const activeIndex = prev.findIndex(t => t.id === activeId);
        const overIndex = prev.findIndex(t => t.id === overId);
        if (activeIndex !== overIndex) {
          return arrayMove(prev, activeIndex, overIndex);
        }
        return prev;
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeIndex = tasks.findIndex(t => t.id === activeId);
    const overIndex = tasks.findIndex(t => t.id === overId);

    let newTasks = tasks;
    if (activeIndex !== overIndex) {
      newTasks = arrayMove(tasks, activeIndex, overIndex);
      setTasks(newTasks);
    }

    const activeTask = newTasks.find(t => t.id === activeId);
    const overTask = newTasks.find(t => t.id === overId);
    const overStatus = overTask ? overTask.status : overId;
    const newPos = overTask ? overTask.position : 0;

    const { error } = await supabase
        .from('personal_tasks')
        .update({ status: overStatus, position: newPos })
        .eq('id', activeId);

      if (!error) {
        showToast('Tarea movida con éxito', 'info');
      } else {
        console.error("Error al guardar el orden:", error);
      }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleSaveTask = async (taskData) => {
      if (editingTask) {
          await supabase.from('personal_tasks').update(taskData).eq('id', editingTask.id);
          fetchTasks();
      } else {
          const maxPos = tasks.reduce((max, t) => t.status === 'nuevo' && t.position > max ? t.position : max, -1);
          const { error } = await supabase.from('personal_tasks').insert([{
              ...taskData,
              status: 'nuevo',
              position: maxPos + 1
          }]);
          if (!error) {
            await fetchTasks();
            showToast('¡Pendiente creado!', 'success');
          }
      }
  };

  const handleOpenCreate = () => {
      setEditingTask(null);
      setIsModalOpen(true);
  };

  return (
    <div className="p-8 animate-kanban-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">
            Mis Pendientes
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            Gestiona tus tareas personales y vincúlalas a proyectos si lo necesitas.
          </p>
        </div>
        <Button
            onClick={handleOpenCreate}
            className="gap-2 text-[13px] font-bold px-5 h-10 rounded-xl transition-all shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90"
        >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo Pendiente
        </Button>
      </div>

      {/* Kanban Board */ }
  <DndContext
    sensors={sensors}
    collisionDetection={collisionDetectionStrategy}
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
    onDragEnd={handleDragEnd}
    onDragCancel={handleDragCancel}
  >
    <div className="h-[calc(100vh-180px)] flex gap-4 overflow-x-auto pb-4">
      {Object.keys(COLUMN_CONFIG).map((col) => {
        const columnTasks = tasks.filter(t => t.status === col);
        return (
          <DroppableColumn key={col} id={col} count={columnTasks.length}>
            <SortableContext
              items={columnTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {columnTasks.map((task) => (
                <SortableCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                  }}
                />
              ))}
            </SortableContext>
          </DroppableColumn>
        );
      })}
    </div>
    {createPortal(
      <DragOverlay
        zIndex={1000}
        dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeTask ? (
          <div className="w-[280px]">
            <KanbanCardUI task={activeTask} isOverlay={true} />
          </div>
        ) : null}
      </DragOverlay>,
      document.body
    )}
  </DndContext>

  {/* Task Modal */}
  <TaskModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    task={editingTask}
    onSave={handleSaveTask}
  />
    </div >
  );
}