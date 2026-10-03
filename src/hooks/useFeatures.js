import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';

export function useFeatures(epicId) {
    const { showToast } = useToast();
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFeatures = useCallback(async () => {
        if (!epicId) {
            setFeatures([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('features')
                .select('id, epic_id, name, description, status, created_at, bugs(count)')
                .eq('epic_id', epicId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setFeatures(data || []);
        } catch (err) {
            console.error('Error fetching features:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [epicId]);

    useEffect(() => {
        fetchFeatures();
    }, [fetchFeatures]);

    const createFeature = async (featureData) => {
        try {
            const { error } = await supabase
                .from('features')
                .insert([{ ...featureData, epic_id: epicId }]);
            if (error) throw error;
            showToast('Feature creado correctamente', 'success');
            await fetchFeatures();
            return { success: true };
        } catch (err) {
            console.error('Error creating feature:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateFeature = async (id, featureData) => {
        try {
            const { error } = await supabase.from('features').update(featureData).eq('id', id);
            if (error) throw error;
            showToast('Feature actualizado', 'success');
            await fetchFeatures();
            return { success: true };
        } catch (err) {
            console.error('Error updating feature:', err.message);
            return { success: false, error: err.message };
        }
    };

    const updateFeatureStatus = async (id, status) => {
        const previous = features;
        setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));

        try {
            const { error } = await supabase.from('features').update({ status }).eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error updating feature status:', err.message);
            setFeatures(previous);
            showToast('No se pudo actualizar el estado', 'error');
            return { success: false, error: err.message };
        }
    };

    const deleteFeature = async (id) => {
        try {
            const { error } = await supabase.from('features').delete().eq('id', id);
            if (error) throw error;
            setFeatures((prev) => prev.filter((f) => f.id !== id));
            showToast('Feature eliminado junto con sus bugs', 'info');
            return { success: true };
        } catch (err) {
            console.error('Error deleting feature:', err.message);
            return { success: false, error: err.message };
        }
    };

    return {
        features,
        loading,
        error,
        fetchFeatures,
        createFeature,
        updateFeature,
        updateFeatureStatus,
        deleteFeature,
    };
}
