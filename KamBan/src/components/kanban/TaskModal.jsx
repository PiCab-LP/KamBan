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
import { ChevronDown, Search, Building, Globe, Check } from 'lucide-react';

export function TaskModal({ isOpen, onClose, task, onSave }) {
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [companyId, setCompanyId] = useState('');
    
    const [companies, setCompanies] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [companySearch, setCompanySearch] = useState('');

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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-black tracking-tight">
                        {task ? 'Editar Pendiente' : 'Nuevo Pendiente'}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/60 font-medium">
                        Completa los campos para {task ? 'actualizar' : 'crear'} tu tarea personal.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Título (Requerido)
                        </label>
                        <Input 
                            placeholder="¿Qué necesitas hacer?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-11 px-4 text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all"
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
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Detalles (Opcional)
                        </label>
                        <Textarea 
                            placeholder="Añade contexto adicional si lo necesitas..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="min-h-[100px] resize-none text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-2">
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
            </DialogContent>
        </Dialog>
    );
}
