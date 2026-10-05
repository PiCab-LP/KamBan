import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { shouldFlagReopen } from '../lib/domain';
import { positionAtEnd, positionBetween } from '../lib/position';

const BUG_FIELDS = `
    id, feature_id, title, description, status, severity, priority,
    is_reopened, position, created_at
`;

/**
 * Con `featureId` trae los bugs de ese feature (vista de backlog).
 * Sin él trae todos, con su feature y epic, para el Tablero de Bugs.
 */
export function useBugs({ featureId = null } = {}) {
    const { showToast } = useToast();
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isBoardMode = featureId === null;

    const fetchBugs = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('bugs')
                .select(isBoardMode ? `${BUG_FIELDS}, features ( id, name, epics ( id, name ) )` : BUG_FIELDS);

            query = isBoardMode
                ? query.order('position', { ascending: true })
                : query.eq('feature_id', featureId).order('created_at', { ascending: true });

            const { data, error } = await query;
            if (error) throw error;
            setBugs(data || []);
        } catch (err) {
            console.error('Error fetching bugs:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [featureId, isBoardMode]);

    useEffect(() => {
        fetchBugs();
    }, [fetchBugs]);

    const createBug = async (bugData) => {
        try {
            const targetStatus = bugData.status || 'nuevo';
            const sameColumn = bugs.filter((b) => b.status === targetStatus);
            const { error } = await supabase.from('bugs').insert([{
                ...bugData,
                feature_id: bugData.feature_id ?? featureId,
                position: positionAtEnd(sameColumn),
            }]);
            if (error) throw error;
            showToast('Bug registrado correctamente', 'success');
            await fetchBugs();
            return { success: true };
        } catch (err) {
            console.error('Error creating bug:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateBug = async (id, bugData) => {
        const bug = bugs.find((b) => b.id === id);
        const payload = { ...bugData };
        let reopening = false;

        // Cambiar el estado desde el formulario debe comportarse como arrastrar o usar
        // el dropdown: marcar "Reabierto" y caer al final de la columna destino.
        if (bug && payload.status && payload.status !== bug.status) {
            reopening = shouldFlagReopen(bug.status, payload.status);
            if (reopening) payload.is_reopened = true;
            if (isBoardMode) {
                payload.position = positionAtEnd(bugs.filter((b) => b.status === payload.status));
            }
        }

        try {
            const { error } = await supabase.from('bugs').update(payload).eq('id', id);
            if (error) throw error;
            showToast(reopening ? 'Bug reabierto' : 'Bug actualizado', reopening ? 'warning' : 'success');
            await fetchBugs();
            return { success: true };
        } catch (err) {
            console.error('Error updating bug:', err.message);
            return { success: false, error: err.message };
        }
    };

    /**
     * Drag en el tablero (el formulario de clasificación usa `updateBug`; ambos pasan por
     * `shouldFlagReopen` para no discrepar): un UPDATE de una sola fila gracias a las posiciones
     * fraccionarias. `prevItem`/`nextItem` son los vecinos en el destino.
     */
    const moveBug = async (id, status, prevItem, nextItem) => {
        const bug = bugs.find((b) => b.id === id);
        if (!bug) return { success: false, error: 'Bug no encontrado' };

        const reopening = shouldFlagReopen(bug.status, status);
        const payload = {
            status,
            position: positionBetween(prevItem, nextItem),
            ...(reopening && { is_reopened: true }),
        };

        try {
            const { error } = await supabase.from('bugs').update(payload).eq('id', id);
            if (error) throw error;
            setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, ...payload } : b)));
            if (reopening) showToast('Bug reabierto', 'warning');
            return { success: true };
        } catch (err) {
            console.error('Error moving bug:', err.message);
            showToast('No se pudo guardar el cambio', 'error');
            await fetchBugs();
            return { success: false, error: err.message };
        }
    };

    const deleteBug = async (id) => {
        try {
            const { error } = await supabase.from('bugs').delete().eq('id', id);
            if (error) throw error;
            setBugs((prev) => prev.filter((b) => b.id !== id));
            showToast('Bug eliminado', 'info');
            return { success: true };
        } catch (err) {
            console.error('Error deleting bug:', err.message);
            return { success: false, error: err.message };
        }
    };

    return {
        bugs,
        loading,
        error,
        fetchBugs,
        createBug,
        updateBug,
        moveBug,
        deleteBug,
    };
}
