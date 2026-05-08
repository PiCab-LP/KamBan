import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';

const PREDEFINED_COLORS = [
    { label: 'Amarillo', value: '#FEF3C7' }, // amber-100
    { label: 'Azul', value: '#DBEAFE' },     // blue-100
    { label: 'Verde', value: '#DCFCE7' },    // green-100
    { label: 'Rosa', value: '#FCE7F3' },     // pink-100
    { label: 'Púrpura', value: '#F3E8FF' }   // purple-100
];

export function NoteForm({ isOpen, onClose, note, onSave }) {
    const [content, setContent] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [color, setColor] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    
    const [companies, setCompanies] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

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
            if (note) {
                setContent(note.content || '');
                setCompanyId(note.company_id || '');
                setColor(note.color || '');
                setIsPinned(note.is_pinned || false);
            } else {
                setContent('');
                setCompanyId('');
                setColor('');
                setIsPinned(false);
            }
        }
    }, [isOpen, note]);

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);
        
        const noteData = {
            content: content.trim(),
            company_id: companyId || null,
            color: color || null,
            is_pinned: isPinned
        };

        await onSave(noteData);
        setIsSaving(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-black tracking-tight">
                        {note ? 'Editar Nota' : 'Nueva Nota'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-5 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Contenido
                        </label>
                        <Textarea 
                            placeholder="Escribe tu nota aquí..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[120px] resize-none text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                            Asignar a Compañía
                        </label>
                        <select 
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="w-full h-11 px-3 text-sm rounded-2xl border border-border/60 bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                        >
                            <option value="">Global (Sin asignar)</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                                Color de Tarjeta
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setColor('')}
                                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${!color ? 'border-primary' : 'border-transparent bg-muted'}`}
                                    title="Sin color"
                                >
                                    {!color && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                                {PREDEFINED_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setColor(c.value)}
                                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${color === c.value ? 'border-primary shadow-sm' : 'border-transparent'}`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mr-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 cursor-pointer select-none" htmlFor="pin-checkbox">
                                Fijar nota
                            </label>
                            <input 
                                type="checkbox"
                                id="pin-checkbox"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="w-4 h-4 rounded border-border/60 text-primary focus:ring-primary/20 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="text-xs font-bold h-11 px-6 rounded-xl hover:bg-muted"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={!content.trim() || isSaving}
                            className="text-xs font-black h-11 px-8 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Nota'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
