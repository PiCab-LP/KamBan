import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteForm } from '@/components/notes/NoteForm';
import { Button } from '@/components/ui/button';
import { Edit3, Plus } from 'lucide-react';

export default function Notes() {
    const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useNotes();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    const handleOpenCreate = () => {
        setEditingNote(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (note) => {
        setEditingNote(note);
        setIsFormOpen(true);
    };

    const handleSaveNote = async (noteData) => {
        if (editingNote) {
            await updateNote(editingNote.id, noteData);
        } else {
            await createNote(noteData);
        }
    };

    return (
        <div className="p-8 animate-kanban-fade-in min-h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-[28px] font-black text-foreground tracking-tight">
                        Notas del Equipo
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1.5">
                        Recordatorios globales y pautas administrativas.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleOpenCreate}
                        className="gap-2 text-[13px] font-bold px-6 h-11 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90"
                    >
                        <Edit3 size={16} strokeWidth={2.5} />
                        Nueva Nota
                    </Button>
                </div>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-max">
                    {notes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onEdit={handleOpenEdit}
                            onDelete={deleteNote}
                            onTogglePin={togglePin}
                        />
                    ))}

                    {/* "Add Note" Empty Card Placeholder */}
                    <button
                        onClick={handleOpenCreate}
                        className="flex flex-col items-center justify-center min-h-[200px] rounded-2xl border-2 border-dashed border-border/60 bg-transparent hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground group"
                    >
                        <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <span className="text-sm font-bold tracking-wide">Añadir Nota</span>
                    </button>
                </div>
            )}

            <NoteForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                note={editingNote}
                onSave={handleSaveNote}
            />
        </div>
    );
}
