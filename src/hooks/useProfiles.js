import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Lista de perfiles para los selectores de asignación. Devuelve todos y los
 * agrupa por rol (`qaUsers`, `devUsers`). Solo lectura; los roles se gestionan
 * en el dashboard de Supabase.
 */
export function useProfiles({ enabled = true } = {}) {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(enabled);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, role')
            .order('email', { ascending: true });
        if (error) {
            console.error('Error fetching profiles:', error.message);
            setProfiles([]);
        } else {
            setProfiles(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (enabled) fetchProfiles();
    }, [enabled, fetchProfiles]);

    const profilesById = {};
    profiles.forEach((p) => { profilesById[p.id] = p.email; });

    return {
        profiles,
        profilesById,
        qaUsers: profiles.filter((p) => p.role === 'qa'),
        devUsers: profiles.filter((p) => p.role === 'dev'),
        loading,
        fetchProfiles,
    };
}
