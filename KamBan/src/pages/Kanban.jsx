import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DndContext, closestCenter, useDroppable } from '@dnd-kit/core'; // <--- Importa useDroppable
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 1. Componente que hace que la columna sea una zona de "drop"
function DroppableColumn({ id, children, title }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-gray-50 p-4 rounded-xl w-80 flex-shrink-0 border border-gray-200 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-4 uppercase text-sm tracking-wide">{title}</h2>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

// 2. Componente de tarjeta arrastrable
function SortableCard({ company }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: company.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function Kanban() {
  const [companies, setCompanies] = useState([]);
  const columns = ['onboarding', 'design', 'integration', 'QA', 'launched'];

  useEffect(() => {
    async function fetchCompanies() {
      const { data } = await supabase.from('companies').select('*');
      setCompanies(data || []);
    }
    fetchCompanies();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const companyId = active.id;
    let newStatus = over.id; // Aquí recibiremos el ID del DroppableColumn

    // Si soltamos sobre otra tarjeta, obtenemos el status de esa tarjeta destino
    const droppedOnCompany = companies.find(c => c.id === over.id);
    if (droppedOnCompany) {
      newStatus = droppedOnCompany.status;
    }

    // Validación
    if (!columns.includes(newStatus)) return;

    const activeCompany = companies.find(c => c.id === companyId);
    if (activeCompany.status === newStatus) return;

    // Actualización local
    setCompanies((prev) => 
      prev.map(c => c.id === companyId ? { ...c, status: newStatus } : c)
    );

    // Actualización Supabase
    await supabase.from('companies').update({ status: newStatus }).eq('id', companyId);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="p-6 h-[85vh] flex gap-4 overflow-x-auto">
        {columns.map((col) => (
          <DroppableColumn key={col} id={col} title={col}>
             <SortableContext items={companies.filter(c => c.status === col).map(c => c.id)} strategy={verticalListSortingStrategy}>
                {companies
                  .filter((c) => c.status === col)
                  .map((company) => (
                    <SortableCard key={company.id} company={company} />
                  ))}
              </SortableContext>
          </DroppableColumn>
        ))}
      </div>
    </DndContext>
  );
}