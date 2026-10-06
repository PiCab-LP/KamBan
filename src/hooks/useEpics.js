import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { COMPLETED_STATUS } from '../lib/domain';
import { checkCanComplete, isCompletionBlocked } from '../lib/completionGuard';

const DUPLICATE_NAME = '23505';

export function useEpics() {
    const { showToast } = useToast();
    const [epics, setEpics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEpics = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('epics')
                .select('id, name, status, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEpics(data || []);
        } catch (err) {
            console.error('Error fetching epics:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEpics();
    }, [fetchEpics]);

    /**
     * Devuelve el motivo si `nextStatus` es un completado no permitido; null si procede.
     * Solo evalúa cuando el estado realmente cambia a Completado, igual que el trigger.
     */
    const completionBlockReason = async (id, nextStatus) => {
        const current = epics.find((x) => x.id === id);
        if (nextStatus !== COMPLETED_STATUS || current?.status === COMPLETED_STATUS) return null;
        const check = await checkCanComplete('epic', id);
        return check.ok ? null : check.message;
    };

    const blockedResult = (message) => {
        showToast(message, 'warning', 'No se puede completar', 7000);
        return { success: false, error: message };
    };

    const createEpic = async (epicData) => {
        try {
            const { error } = await supabase.from('epics').insert([epicData]);
            // El índice único vive en la base, así que detecta duplicados aunque
            // el epic existente esté en otra página de la tabla.
            if (error?.code === DUPLICATE_NAME) {
                return { success: false, error: 'Ya existe un Epic con ese nombre.' };
            }
            if (error) throw error;
            showToast('Epic creado correctamente', 'success');
            await fetchEpics();
            return { success: true };
        } catch (err) {
            console.error('Error creating epic:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateEpic = async (id, epicData) => {
        const blocked = await completionBlockReason(id, epicData.status);
        if (blocked) return { success: false, error: blocked };

        try {
            const { error } = await supabase.from('epics').update(epicData).eq('id', id);
            if (error?.code === DUPLICATE_NAME) {
                return { success: false, error: 'Ya existe un Epic con ese nombre.' };
            }
            if (error) throw error;
            showToast('Epic actualizado', 'success');
            await fetchEpics();
            return { success: true };
        } catch (err) {
            console.error('Error updating epic:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateEpicStatus = async (id, status) => {
        const blocked = await completionBlockReason(id, status);
        if (blocked) return blockedResult(blocked);

        const previous = epics;
        setEpics((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));

        try {
            const { error } = await supabase.from('epics').update({ status }).eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error updating epic status:', err.message);
            setEpics(previous);
            if (isCompletionBlocked(err)) return blockedResult(err.message);
            showToast('No se pudo actualizar el estado', 'error');
            return { success: false, error: err.message };
        }
    };

    const deleteEpic = async (id) => {
        try {
            const { error } = await supabase.from('epics').delete().eq('id', id);
            if (error) throw error;
            setEpics((prev) => prev.filter((e) => e.id !== id));
            showToast('Epic eliminado junto con sus features y bugs', 'info');
            return { success: true };
        } catch (err) {
            console.error('Error deleting epic:', err.message);
            return { success: false, error: err.message };
        }
    };

    return {
        epics,
        loading,
        error,
        fetchEpics,
        createEpic,
        updateEpic,
        updateEpicStatus,
        deleteEpic,
    };
}
