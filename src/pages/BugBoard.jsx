import { useEffect, useState, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { GripVertical, Bug as BugIcon, Code2 } from 'lucide-react';
import {
  DndContext,
  closestCorners,
  useDroppable,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBugs } from '../hooks/useBugs';
import { useProfiles } from '../hooks/useProfiles';
import { useAuth } from '../context/AuthContext';
import { BUG_COLUMNS, BUG_STATUS, BUG_SEVERITY, BUG_PRIORITY, DEV_STATUS } from '../lib/domain';
import { StatusBadge, ReopenedBadge } from '../components/ui/StatusBadge';
import { LoadingSkeleton } from '../components/ui/StatCard';
import { BugFormSheet } from '../components/backlog/BugFormSheet';
import '../App.css';

const COLUMN_IDS = BUG_COLUMNS.map((c) => c.id);

function DroppableColumn({ id, title, description, count, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const color = BUG_STATUS[id]?.color || 'var(--primary)';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-shrink-0 w-[272px] xl:w-[300px] rounded-3xl transition-all duration-300 ease-in-out border-2 ${
        isOver ? 'bg-primary/5 border-primary/30 scale-[1.02] shadow-xl' : 'bg-muted/30 border-transparent'
      }`}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="h-1.5 w-12 rounded-full mb-4" style={{ backgroundColor: color }} />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground tracking-tight uppercase">{title}</h2>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
              {description}
            </p>
          </div>
          <span
            className="flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black shadow-sm"
            style={{
              backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
              color,
            }}
          >
            {count}
          </span>
        </div>
      </div>

      <div className="flex-1 px-3 pt-2 pb-4 space-y-3 overflow-y-auto max-h-[calc(80vh-100px)] custom-scrollbar">
        {children}
        {count === 0 && (
          <div className="flex flex-col items-center justify-center h-[118px] px-4 text-center border-2 border-dashed border-muted-foreground/10 rounded-xl bg-card/30">
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Vacío
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const BugCard = ({ bug, isOverlay, dragHandleProps, onEdit, highlighted = false, readOnly = false, devName }) => {
  const featureName = bug.features?.name;
  const epicName = bug.features?.epics?.name;
  const severityColor = BUG_SEVERITY[bug.severity]?.color || 'var(--primary)';
  const devStage = bug.dev_status && bug.dev_status !== 'pendiente' ? DEV_STATUS[bug.dev_status] : null;

  return (
    <Card
      className={`
        border-border/40 overflow-hidden bg-card transition-all duration-300 rounded-xl w-full group
        ${isOverlay ? 'ring-2 ring-primary/40 shadow-2xl opacity-95' : 'hover:border-primary/30 hover:shadow-lg hover:shadow-black/5'}
        ${highlighted ? 'ring-2 ring-primary shadow-xl shadow-primary/20 scale-[1.03]' : ''}
      `}
    >
      <div className="flex items-stretch min-h-[48px]">
        {!readOnly && (
          <div
            {...dragHandleProps}
            className="flex items-center justify-center px-1.5 text-muted-foreground/45 bg-muted/5 border-r border-border/30 cursor-grab active:cursor-grabbing group-hover:text-muted-foreground/70 transition-colors duration-200"
          >
            <GripVertical size={12} />
          </div>
        )}

        <div
          className={`flex-1 flex items-start gap-3 px-3 py-2.5 select-none min-w-0 ${readOnly ? '' : 'cursor-pointer'}`}
          onClick={readOnly ? undefined : () => onEdit(bug)}
        >
          <div
            className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg mt-0.5"
            style={{ backgroundColor: `color-mix(in oklch, ${severityColor} 15%, transparent)` }}
            title={`Severidad: ${BUG_SEVERITY[bug.severity]?.label}`}
          >
            <BugIcon size={15} strokeWidth={2.5} style={{ color: severityColor }} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
              {bug.title}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge value={bug.severity} map={BUG_SEVERITY} showDot={false} className="!px-2 !py-0.5 !text-[9px]" />
              <StatusBadge value={bug.priority} map={BUG_PRIORITY} showDot={false} className="!px-2 !py-0.5 !text-[9px]" />
              {bug.is_reopened && <ReopenedBadge />}
              {devStage && (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${devStage.color} 15%, transparent)`,
                    color: devStage.color,
                  }}
                  title={`Avance del Dev: ${devStage.label}`}
                >
                  {devStage.label}
                </span>
              )}
            </div>
            {featureName && (
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter truncate">
                {epicName ? `${epicName} › ${featureName}` : featureName}
              </p>
            )}
            {devName && (
              <p className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/60 truncate">
                <Code2 size={10} className="shrink-0" /> {devName}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

function SortableCard({ bug, onEdit, highlighted, readOnly, devName }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bug.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group" data-bug-id={bug.id}>
      <BugCard
        bug={bug}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
        isOverlay={false}
        highlighted={highlighted}
        readOnly={readOnly}
        devName={devName}
      />
    </div>
  );
}

export default function BugBoard() {
  const { bugs, loading, moveBug, updateBug } = useBugs();
  const { role } = useAuth();
  const { profiles } = useProfiles();
  const readOnly = role === 'viewer';
  const devNameById = useMemo(() => {
    const map = {};
    profiles.forEach((p) => { map[p.id] = p.email; });
    return map;
  }, [profiles]);
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [editingBug, setEditingBug] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const targetBugId = searchParams.get('bug');

  // Llegada desde "Ver en el tablero" del Backlog (/bugs?bug=<id>): centra la
  // tarjeta, la resalta unos segundos y limpia el parámetro para que recargar
  // la página no vuelva a resaltarla.
  useEffect(() => {
    if (!targetBugId || loading) return;

    // `items` se llena un render después de `bugs`: hasta entonces la tarjeta no existe.
    const exists = bugs.some((b) => b.id === targetBugId);
    if (exists && !items.some((b) => b.id === targetBugId)) return;

    const card = document.querySelector(`[data-bug-id="${targetBugId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setHighlightedId(targetBugId);
    }
    setSearchParams({}, { replace: true });
  }, [targetBugId, loading, bugs, items, setSearchParams]);

  useEffect(() => {
    if (!highlightedId) return undefined;
    const timer = setTimeout(() => setHighlightedId(null), 3500);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  // El orden visual lo manda `position`; durante el drag manda el orden del array.
  useEffect(() => {
    setItems([...bugs].sort((a, b) => Number(a.position) - Number(b.position)));
  }, [bugs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetectionStrategy = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;
    return closestCorners(args);
  };

  const handleDragStart = (event) => setActiveId(event.active.id);
  const handleDragCancel = () => setActiveId(null);

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const activeBug = prev.find((b) => b.id === active.id);
      if (!activeBug) return prev;

      const overBug = prev.find((b) => b.id === over.id);
      const overContainer = overBug ? overBug.status : over.id;
      if (!COLUMN_IDS.includes(overContainer)) return prev;
      if (activeBug.status === overContainer) return prev;

      const activeIndex = prev.findIndex((b) => b.id === active.id);
      let overIndex;
      if (overBug) {
        overIndex = prev.findIndex((b) => b.id === over.id);
      } else {
        const lastInColumn = prev.reduce((max, b, i) => (b.status === overContainer ? i : max), -1);
        overIndex = lastInColumn !== -1 ? lastInColumn + 1 : prev.length;
      }

      const updated = [...prev];
      updated[activeIndex] = { ...activeBug, status: overContainer };
      return arrayMove(updated, activeIndex, Math.min(overIndex, updated.length - 1));
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeBug = items.find((b) => b.id === active.id);
    if (!activeBug) return;

    const overBug = items.find((b) => b.id === over.id);
    const destStatus = overBug ? overBug.status : over.id;
    if (!COLUMN_IDS.includes(destStatus)) return;

    let next = items.map((b) => (b.id === active.id ? { ...b, status: destStatus } : b));
    const fromIndex = next.findIndex((b) => b.id === active.id);
    const toIndex = overBug ? next.findIndex((b) => b.id === over.id) : -1;
    if (toIndex !== -1 && fromIndex !== toIndex) {
      next = arrayMove(next, fromIndex, toIndex);
    }
    setItems(next);

    // Vecinos en la columna destino: bastan para calcular la posición fraccionaria.
    const column = next.filter((b) => b.status === destStatus);
    const index = column.findIndex((b) => b.id === active.id);
    await moveBug(active.id, destStatus, column[index - 1] ?? null, column[index + 1] ?? null);
  };

  const handleEdit = (bug) => {
    setEditingBug(bug);
    setIsSheetOpen(true);
  };

  const activeBug = activeId ? items.find((b) => b.id === activeId) : null;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 lg:p-6 xl:p-8 animate-kanban-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">Tablero de Bugs</h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            {readOnly
              ? 'Vista de solo lectura de los bugs y su estado.'
              : 'Arrastra un bug para cambiar su estado, o ábrelo para clasificarlo y asignarlo. Los bugs se registran desde el Backlog de QA.'}
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="h-[calc(100vh-180px)] flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {BUG_COLUMNS.map((column, index) => {
            const columnBugs = items.filter((b) => b.status === column.id);
            return (
              <Fragment key={column.id}>
                <DroppableColumn
                  id={column.id}
                  title={column.title}
                  description={column.description}
                  count={columnBugs.length}
                >
                  <SortableContext items={columnBugs.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {columnBugs.map((bug) => (
                      <SortableCard
                        key={bug.id}
                        bug={bug}
                        onEdit={handleEdit}
                        highlighted={bug.id === highlightedId}
                        readOnly={readOnly}
                        devName={bug.assigned_dev_id ? devNameById[bug.assigned_dev_id] : null}
                      />
                    ))}
                  </SortableContext>
                </DroppableColumn>
                {index < BUG_COLUMNS.length - 1 && (
                  <div className="w-[3px] bg-border/50 self-stretch my-12 shrink-0 rounded-full" />
                )}
              </Fragment>
            );
          })}
        </div>

        {createPortal(
          <DragOverlay
            zIndex={1000}
            dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}
          >
            {activeBug ? (
              <div className="w-[280px]">
                <BugCard bug={activeBug} isOverlay onEdit={handleEdit} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      <BugFormSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        bug={editingBug}
        mode="board"
        onSave={(data) => updateBug(editingBug.id, data)}
      />
    </div>
  );
}
