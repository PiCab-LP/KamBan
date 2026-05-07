import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { GripVertical, Plus } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  closestCorners,
  useDroppable, 
  DragOverlay, 
  useSensors, 
  useSensor, 
  PointerSensor,
  KeyboardSensor
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable, 
  arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CompanyDetailsModal } from './CompanyDetailsModal';
import '../App.css';

const STATUS_COLORS = {
  onboarding: 'var(--status-onboarding)',
  design: 'var(--status-design)',
  integration: 'var(--status-integration)',
  QA: 'var(--status-qa)',
  launched: 'var(--status-launched)',
};

const STATUS_BG = {
  onboarding: 'var(--status-onboarding-bg)',
  design: 'var(--status-design-bg)',
  integration: 'var(--status-integration-bg)',
  QA: 'var(--status-qa-bg)',
  launched: 'var(--status-launched-bg)',
};

const COLUMN_CONFIG = {
  onboarding: { title: 'Onboarding', description: 'Registro inicial' },
  design: { title: 'Design', description: 'Fase de diseno' },
  integration: { title: 'Integration', description: 'Desarrollo activo' },
  QA: { title: 'QA', description: 'Control de calidad' },
  launched: { title: 'Launched', description: 'En produccion' },
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
          style={{ backgroundColor: `var(--status-${id})` }}
        />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground tracking-tight uppercase">
              {config.title}
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
              {config.description}
            </p>
          </div>
          <span
            className="flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black shadow-sm"
            style={{
              backgroundColor: `var(--status-${id}-bg)`,
              color: `var(--status-${id})`,
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
function KanbanCardUI({ company, isOverlay, dragHandleProps, onEdit }) {
  const avatarColor = getAvatarColor(company.name);
  const initials = getInitials(company.name);

  return (
    <Card
      className={`
        border-border/40 overflow-hidden bg-card transition-all duration-300 rounded-2xl w-full
        ${isOverlay ? 'ring-2 ring-primary/40 shadow-2xl opacity-95' : 'hover:border-primary/30 hover:shadow-lg hover:shadow-black/5'}
      `}
    >
      <div className="flex items-stretch min-h-[64px]">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className={`flex items-center justify-center px-2 text-muted-foreground/20 bg-muted/5 border-r border-border/30 ${isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing group-hover:text-muted-foreground/60 transition-colors duration-200'}`}
        >
          <GripVertical size={14} />
        </div>

        {/* Card Body */}
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          onClick={() => onEdit && onEdit(company)}
        >
          <div
            className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg text-white text-[10px] font-black shadow-sm"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground leading-tight line-clamp-1">
              {company.name}
            </p>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-primary/40" />
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Detalles</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// 3. Sortable Wrapper
function SortableCard({ company, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <KanbanCardUI
        company={company}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
        isOverlay={false}
      />
    </div>
  );
}

export default function Kanban() {
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
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

  const columns = ['onboarding', 'design', 'integration', 'QA', 'launched'];

  async function fetchCompanies() {
    const { data } = await supabase.from('companies').select('*');
    setCompanies(data || []);
  }

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    const { data, error } = await supabase
      .from('companies')
      .insert([{ name: newCompanyName, status: 'onboarding' }])
      .select();

    if (!error && data) {
      setCompanies([...companies, ...data]);
      setNewCompanyName("");
      setIsDialogOpen(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeCompany = companies.find(c => c.id === activeId);
    const overCompany = companies.find(c => c.id === overId);

    if (!activeCompany) return;

    const activeContainer = activeCompany.status;
    const overContainer = overCompany ? overCompany.status : overId;

    if (!columns.includes(overContainer)) return;

    if (activeContainer !== overContainer) {
      setCompanies((prev) => {
        const activeIndex = prev.findIndex(c => c.id === activeId);
        
        // Si estamos sobre otra tarjeta, usamos su índice
        // Si estamos sobre una columna vacía, lo mandamos al final
        let overIndex;
        if (overCompany) {
          overIndex = prev.findIndex(c => c.id === overId);
        } else {
          // Encontrar el último índice de esa columna
          const lastIndexInCol = prev.map((c, i) => c.status === overContainer ? i : -1).reduce((max, i) => Math.max(max, i), -1);
          overIndex = lastIndexInCol !== -1 ? lastIndexInCol + 1 : prev.length;
        }

        const updated = [...prev];
        updated[activeIndex] = { ...activeCompany, status: overContainer };
        
        return arrayMove(updated, activeIndex, Math.min(overIndex, updated.length - 1));
      });
    } else {
      // Reordenamiento en la misma columna
      setCompanies((prev) => {
        const activeIndex = prev.findIndex(c => c.id === activeId);
        const overIndex = prev.findIndex(c => c.id === overId);
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

    const activeIndex = companies.findIndex(c => c.id === activeId);
    const overIndex = companies.findIndex(c => c.id === overId);

    if (activeIndex !== overIndex) {
      setCompanies((prev) => arrayMove(prev, activeIndex, overIndex));
    }

    const activeCompany = companies.find(c => c.id === activeId);
    if (activeCompany) {
      await supabase
        .from('companies')
        .update({ status: activeCompany.status })
        .eq('id', activeId);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeCompany = activeId ? companies.find(c => c.id === activeId) : null;

  return (
    <div className="p-8 animate-kanban-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">
            Tablero Kanban
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            Arrastra las companias entre columnas para actualizar su estado.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 text-[13px] font-semibold px-5 h-10 rounded-xl"
              style={{
                background: 'hsl(217 91% 60%)',
                color: 'white',
                boxShadow: '0 2px 8px hsla(217, 91%, 60%, 0.3)',
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Nueva Compania
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-[17px] font-bold tracking-tight">
                Agregar Nueva Compania
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                Ingresa el nombre de la compania para comenzar su proceso de integracion.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <Input
                placeholder="Nombre de la empresa"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="h-11 text-[14px] rounded-xl border-border/60"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-[13px] h-10 rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddCompany}
                  className="text-[13px] h-10 rounded-lg"
                  style={{
                    background: 'hsl(217 91% 60%)',
                    color: 'white',
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="h-[calc(100vh-180px)] flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const columnCompanies = companies.filter(c => c.status === col);
            return (
              <DroppableColumn key={col} id={col} count={columnCompanies.length}>
                <SortableContext 
                  items={columnCompanies.map(c => c.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {columnCompanies.map((company) => (
                    <SortableCard
                      key={company.id}
                      company={company}
                      onEdit={(c) => setEditingCompany(c)}
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
            {activeCompany ? (
              <div className="w-[280px]">
                <KanbanCardUI company={activeCompany} isOverlay={true} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* Company Details Modal */}
      <CompanyDetailsModal
        company={editingCompany}
        onClose={() => setEditingCompany(null)}
        onUpdate={fetchCompanies}
      />
    </div>
  );
}