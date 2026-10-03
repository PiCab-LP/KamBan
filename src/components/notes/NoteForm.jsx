import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { supabase } from '@/lib/supabaseClient';
import { linkToColumns } from '@/hooks/useNotes';
import { Layers, GitBranch, Bug } from 'lucide-react';

const PREDEFINED_COLORS = [
    { label: 'Amarillo', value: '#FEF3C7' }, // amber-100
    { label: 'Azul', value: '#DBEAFE' },     // blue-100
    { label: 'Verde', value: '#DCFCE7' },    // green-100
    { label: 'Rosa', value: '#FCE7F3' },     // pink-100
    { label: 'Púrpura', value: '#F3E8FF' }   // purple-100
];

function noteToLink(note) {
    if (note?.epic_id) return { type: 'epic', id: note.epic_id };
    if (note?.feature_id) return { type: 'feature', id: note.feature_id };
    if (note?.bug_id) return { type: 'bug', id: note.bug_id };
    return null;
}

export function NoteForm({ isOpen, onClose, note, onSave }) {
    const [content, setContent] = useState('');
    const [link, setLink] = useState(null);
    const [color, setColor] = useState('');
    const [isPinned, setIsPinned] = useState(false);

    const [groups, setGroups] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Una nota puede colgar de cualquiera de los tres niveles de la jerarquía.
    useEffect(() => {
        const fetchTargets = async () => {
            const [epics, features, bugs] = await Promise.all([
                supabase.from('epics').select('id, name').order('name'),
                supabase.from('features').select('id, name').order('name'),
                supabase.from('bugs').select('id, title').order('title'),
            ]);

            setGroups([
                { type: 'epic', label: 'Epics', icon: Layers, items: epics.data || [] },
                { type: 'feature', label: 'Features', icon: GitBranch, items: features.data || [] },
                {
                    type: 'bug',
                    label: 'Bugs',
                    icon: Bug,
                    items: (bugs.data || []).map((b) => ({ id: b.id, name: b.title })),
                },
            ]);
        };
        fetchTargets();
    }, []);

    useEffect(() => {
        if (isOpen) {
            setContent(note?.content || '');
            setLink(noteToLink(note));
            setColor(note?.color || '');
            setIsPinned(note?.is_pinned || false);
        }
    }, [isOpen, note]);

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);

        const noteData = {
            content: content.trim(),
            ...linkToColumns(link),
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
                    <DialogDescription className="text-[11px] text-muted-foreground/60 font-medium">
                        Escribe tus pensamientos o información relevante para recordar luego.
                    </DialogDescription>
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
                            Vincular a
                        </label>
                        <EntityPicker
                            value={link}
                            onChange={setLink}
                            groups={groups}
                            searchPlaceholder="Buscar epic, feature o bug..."
                            disabled={isSaving}
                        />
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
