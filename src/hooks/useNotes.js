import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';

const NOTE_FIELDS = `
    id, epic_id, feature_id, bug_id, content, created_at, updated_at, is_pinned, color,
    epics ( name ),
    features ( name ),
    bugs ( title )
`;

/** Devuelve `{ type, label, name }` del vínculo de una nota, o null si es global. */
export function getNoteLink(note) {
    if (note.epic_id) return { type: 'epic', label: 'Epic', name: note.epics?.name };
    if (note.feature_id) return { type: 'feature', label: 'Feature', name: note.features?.name };
    if (note.bug_id) return { type: 'bug', label: 'Bug', name: note.bugs?.title };
    return null;
}

/** Convierte el `{ type, id }` del EntityPicker en las tres columnas de la tabla. */
export function linkToColumns(link) {
    return {
        epic_id: link?.type === 'epic' ? link.id : null,
        feature_id: link?.type === 'feature' ? link.id : null,
        bug_id: link?.type === 'bug' ? link.id : null,
    };
}

export function useNotes() {
    const { showToast } = useToast();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNotes = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notes')
                .select(NOTE_FIELDS)
                .order('is_pinned', { ascending: false })
                .order('updated_at', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (err) {
            console.error('Error fetching notes:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // updated_at lo pone el trigger notes_set_updated_at, ya no el cliente.
    const createNote = async (noteData) => {
        try {
            const { error } = await supabase.from('notes').insert([noteData]);
            if (error) throw error;
            showToast('Nota creada correctamente', 'success');
            await fetchNotes();
            return { success: true };
        } catch (err) {
            console.error('Error creating note:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateNote = async (id, noteData) => {
        try {
            const { error } = await supabase.from('notes').update(noteData).eq('id', id);
            if (error) throw error;
            showToast('Nota actualizada', 'success');
            await fetchNotes();
            return { success: true };
        } catch (err) {
            console.error('Error updating note:', err.message);
            return { success: false, error: err.message };
        }
    };

    const deleteNote = async (id) => {
        try {
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) throw error;
            setNotes((prev) => prev.filter((note) => note.id !== id));
            showToast('Nota eliminada', 'info');
            return { success: true };
        } catch (err) {
            console.error('Error deleting note:', err.message);
            return { success: false, error: err.message };
        }
    };

    const togglePin = async (id, currentPinState) => {
        const oldNotes = [...notes];
        const newPinState = !currentPinState;

        setNotes((prev) => prev.map((note) =>
            note.id === id ? { ...note, is_pinned: newPinState } : note
        ));

        try {
            const { error } = await supabase
                .from('notes')
                .update({ is_pinned: newPinState })
                .eq('id', id);

            if (error) throw error;

            await fetchNotes();
            return { success: true };
        } catch (err) {
            console.error('Error toggling pin:', err);
            setNotes(oldNotes);
            return { success: false, error: err.message };
        }
    };

    return {
        notes,
        loading,
        error,
        fetchNotes,
        createNote,
        updateNote,
        deleteNote,
        togglePin,
    };
}
