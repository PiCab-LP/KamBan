import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useBugImages } from './useBugImages';
import { positionAtEnd, positionBetween } from '../lib/position';

const BUG_FIELDS = `
    id, feature_id, title, description, status, severity, priority,
    position, created_at,
    created_by, assigned_qa_id, assigned_dev_id, dev_status,
    bug_images ( count )
`;

/**
 * Con `featureId` trae los bugs de ese feature (vista de backlog).
 * Sin él trae todos, con su feature y epic, para el Tablero de Bugs.
 */
export function useBugs({ featureId = null } = {}) {
    const { showToast } = useToast();
    const { deleteAllForBug } = useBugImages();
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
            // .select() para recuperar el id: el formulario lo necesita para asociar
            // las imágenes recién subidas al bug que acaba de nacer.
            const { data, error } = await supabase.from('bugs').insert([{
                ...bugData,
                feature_id: bugData.feature_id ?? featureId,
                position: positionAtEnd(sameColumn),
            }]).select('id').single();
            if (error) throw error;
            showToast('Bug registrado correctamente', 'success');
            await fetchBugs();
            return { success: true, id: data.id };
        } catch (err) {
            console.error('Error creating bug:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateBug = async (id, bugData) => {
        const bug = bugs.find((b) => b.id === id);
        const payload = { ...bugData };

        // Cambiar el estado desde el formulario, igual que arrastrar: la tarjeta cae
        // al final de la columna destino.
        if (bug && payload.status && payload.status !== bug.status && isBoardMode) {
            payload.position = positionAtEnd(bugs.filter((b) => b.status === payload.status));
        }

        try {
            const { error } = await supabase.from('bugs').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Bug actualizado', 'success');
            await fetchBugs();
            return { success: true };
        } catch (err) {
            console.error('Error updating bug:', err.message);
            return { success: false, error: err.message };
        }
    };

    /**
     * Drag en el tablero: un UPDATE de una sola fila gracias a las posiciones
     * fraccionarias. `prevItem`/`nextItem` son los vecinos en el destino.
     */
    const moveBug = async (id, status, prevItem, nextItem) => {
        const bug = bugs.find((b) => b.id === id);
        if (!bug) return { success: false, error: 'Bug no encontrado' };

        const payload = {
            status,
            position: positionBetween(prevItem, nextItem),
        };

        try {
            const { error } = await supabase.from('bugs').update(payload).eq('id', id);
            if (error) throw error;
            setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, ...payload } : b)));
            return { success: true };
        } catch (err) {
            console.error('Error moving bug:', err.message);
            showToast('No se pudo guardar el cambio', 'error');
            await fetchBugs();
            return { success: false, error: err.message };
        }
    };

    /**
     * Única escritura que el Dev puede hacer sobre un bug: su avance de corrección.
     * El RLS y el trigger `guard_dev_bug_update` (SQLSTATE QA002) lo respaldan.
     */
    const setDevStatus = async (id, devStatus) => {
        try {
            const { error } = await supabase.from('bugs').update({ dev_status: devStatus }).eq('id', id);
            if (error) throw error;
            setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, dev_status: devStatus } : b)));
            showToast('Avance actualizado', 'success');
            return { success: true };
        } catch (err) {
            console.error('Error updating dev_status:', err.message);
            showToast('No se pudo actualizar el avance', 'error');
            return { success: false, error: err.message };
        }
    };

    const deleteBug = async (id) => {
        try {
            // Primero borra los archivos de Cloudinary (por prefijo). Si falla, se aborta
            // el borrado del bug para no dejar imágenes huérfanas en Cloudinary.
            const cleanup = await deleteAllForBug(id);
            if (!cleanup.success) {
                showToast('No se pudieron eliminar las imágenes del bug. Intenta de nuevo.', 'error');
                return { success: false, error: cleanup.error };
            }
            // El delete del bug arrastra las filas de bug_images por CASCADE.
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
        setDevStatus,
        deleteBug,
    };
}
