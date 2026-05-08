import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useNotes() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNotes = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notes')
                .select(`
                    id, 
                    company_id, 
                    content, 
                    image_url, 
                    created_at, 
                    updated_at, 
                    is_pinned, 
                    color,
                    companies ( name )
                `)
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

    const createNote = async (noteData) => {
        try {
            const { error } = await supabase.from('notes').insert([{
                ...noteData,
                updated_at: new Date().toISOString()
            }]);
            if (error) throw error;
            await fetchNotes();
            return { success: true };
        } catch (err) {
            console.error('Error creating note:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateNote = async (id, noteData) => {
        try {
            const { error } = await supabase.from('notes').update({
                ...noteData,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
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
            setNotes(notes.filter(note => note.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting note:', err.message);
            return { success: false, error: err.message };
        }
    };

    const togglePin = async (id, currentPinState) => {
        const oldNotes = [...notes];
        const newPinState = !currentPinState;
        
        setNotes(notes.map(note => 
            note.id === id ? { ...note, is_pinned: newPinState } : note
        ));

        try {
            const { error } = await supabase
                .from('notes')
                .update({ 
                    is_pinned: newPinState,
                    updated_at: new Date().toISOString()
                })
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
        togglePin
    };
}
