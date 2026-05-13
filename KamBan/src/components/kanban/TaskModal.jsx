import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { ChevronDown, Search, Building, Globe, Check, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

export function TaskModal({ isOpen, onClose, task, onSave, onDelete }) {
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [companyId, setCompanyId] = useState('');
    
    const [companies, setCompanies] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [companySearch, setCompanySearch] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const selectedCompany = useMemo(() => 
        companies.find(c => c.id === companyId), 
    [companies, companyId]);

    const filteredCompanies = useMemo(() => 
        companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())),
    [companies, companySearch]);

    useEffect(() => {
        // Fetch companies for dropdown
        const fetchCompanies = async () => {
            const { data } = await supabase.from('companies').select('id, name').order('name');
            if (data) setCompanies(data);
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (task) {
                setTitle(task.title || '');
                setDetails(task.details || '');
                setCompanyId(task.company_id || '');
            } else {
                setTitle('');
                setDetails('');
                setCompanyId('');
            }
            setCompanySearch('');
        }
    }, [isOpen, task]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsSaving(true);
        
        const taskData = {
            title: title.trim(),
            details: details.trim() || null,
            company_id: companyId || null,
        };

        await onSave(taskData);
        setIsSaving(false);
        onClose();
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDelete(task.id);
        setIsDeleting(false);
        setIsConfirmOpen(false);
        onClose();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-black tracking-tight">
                        {task ? 'Editar Pendiente' : 'Nuevo Pendiente'}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/60 font-medium">
                        Completa los campos para {task ? 'actualizar' : 'crear'} tu tarea personal.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 pt-2 min-w-0">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                                Título (Requerido)
                            </label>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${title.length >= 200 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                                {title.length}/200
                            </span>
                        </div>
                        <Input 
                            placeholder="¿Qué necesitas hacer?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            className="h-11 px-4 text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all w-full min-w-0"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Asignar a Compañía (Opcional)
                        </label>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className="w-full h-11 px-4 justify-between text-sm rounded-2xl border-border/60 bg-muted/30 hover:bg-background transition-all font-medium"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedCompany ? (
                                            <>
                                                <Building size={16} className="text-primary/70 shrink-0" />
                                                <span className="truncate">{selectedCompany.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Globe size={16} className="text-muted-foreground/50 shrink-0" />
                                                <span className="text-muted-foreground/70">Global (Sin asignar)</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown size={16} className="text-muted-foreground/40 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[300px] p-2 rounded-2xl border-border/40 shadow-2xl animate-in fade-in-0 zoom-in-95"
                                align="start"
                            >
                                <div className="relative mb-2 px-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                                    <Input 
                                        placeholder="Buscar compañía..." 
                                        value={companySearch}
                                        onChange={(e) => setCompanySearch(e.target.value)}
                                        className="h-9 pl-8 text-xs rounded-xl border-none bg-muted/50 focus:bg-muted"
                                    />
                                </div>
                                
                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-0.5">
                                    <DropdownMenuItem 
                                        onClick={() => setCompanyId('')}
                                        className="flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors focus:bg-primary/5"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe size={14} className={!companyId ? 'text-primary' : 'text-muted-foreground/40'} />
                                            <span className={!companyId ? 'font-bold text-primary' : 'text-foreground/70'}>Global (Sin asignar)</span>
                                        </div>
                                        {!companyId && <Check size={14} className="text-primary" />}
                                    </DropdownMenuItem>
                                    
                                    {filteredCompanies.map(c => (
                                        <DropdownMenuItem 
                                            key={c.id} 
                                            onClick={() => setCompanyId(c.id)}
                                            className="flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors focus:bg-primary/5"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Building size={14} className={companyId === c.id ? 'text-primary' : 'text-muted-foreground/40'} />
                                                <span className={`truncate ${companyId === c.id ? 'font-bold text-primary' : 'text-foreground/70'}`}>
                                                    {c.name}
                                                </span>
                                            </div>
                                            {companyId === c.id && <Check size={14} className="text-primary" />}
                                        </DropdownMenuItem>
                                    ))}
                                    
                                    {filteredCompanies.length === 0 && companySearch && (
                                        <div className="py-4 text-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                            No hay resultados
                                        </div>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                                Detalles (Opcional)
                            </label>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${details.length >= 500 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
                                {details.length}/500
                            </span>
                        </div>
                        <Textarea 
                            placeholder="Añade contexto adicional si lo necesitas..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            maxLength={500}
                            className="min-h-[100px] resize-none text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all w-full min-w-0 break-words overflow-wrap-anywhere"
                        />
                    </div>

                    <div className="flex justify-between items-center gap-3 mt-2">
                        <div>
                            {task && (
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setIsConfirmOpen(true)}
                                    className="text-xs font-bold h-11 px-4 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                                >
                                    <Trash2 size={16} className="mr-2" />
                                    Eliminar
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={onClose}
                                className="text-xs font-bold h-11 px-6 rounded-xl hover:bg-muted"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={!title.trim() || isSaving}
                                className="text-xs font-black h-11 px-8 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Pendiente'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <ConfirmDeleteModal 
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={handleDelete}
            isLoading={isDeleting}
            title="¿Eliminar pendiente?"
            description="Este pendiente se borrará permanentemente. Esta acción no se puede revertir."
        />
    </>
);
}
