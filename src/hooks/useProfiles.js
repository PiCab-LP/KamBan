import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Nombre a mostrar de un perfil: el nombre completo, o el correo si no hay nombre. */
export const profileDisplayName = (profile) =>
    (profile?.full_name?.trim() || profile?.email || '');

/**
 * Lista de perfiles para los selectores de asignación. Devuelve todos y los
 * agrupa por rol (`qaUsers`, `devUsers`), cada uno con `.name` (nombre a mostrar).
 * `profilesById` mapea id → nombre a mostrar. Solo lectura; roles y nombres se
 * gestionan en el dashboard de Supabase.
 */
export function useProfiles({ enabled = true } = {}) {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(enabled);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, role, full_name')
            .order('full_name', { ascending: true, nullsFirst: false })
            .order('email', { ascending: true });
        if (error) {
            console.error('Error fetching profiles:', error.message);
            setProfiles([]);
        } else {
            setProfiles((data || []).map((p) => ({ ...p, name: profileDisplayName(p) })));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (enabled) fetchProfiles();
    }, [enabled, fetchProfiles]);

    const profilesById = {};
    profiles.forEach((p) => { profilesById[p.id] = p.name; });

    return {
        profiles,
        profilesById,
        qaUsers: profiles.filter((p) => p.role === 'qa'),
        devUsers: profiles.filter((p) => p.role === 'dev'),
        loading,
        fetchProfiles,
    };
}
