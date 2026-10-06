import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

/**
 * Sesión y rol del usuario. El rol vive en la tabla `profiles` (qa/dev/viewer) y
 * lo fija un admin desde el dashboard de Supabase. Mientras `loading`, la app no
 * decide rutas todavía.
 */
export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadRole = useCallback(async (userId) => {
        if (!userId) {
            setRole(null);
            return;
        }
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
        if (error) {
            console.error('Error loading role:', error.message);
            setRole(null);
            return;
        }
        // Si el profile aún no existe (primer login antes del trigger), viewer por defecto.
        setRole(data?.role ?? 'viewer');
    }, []);

    useEffect(() => {
        let active = true;

        // Aplica una sesión y carga el rol. OJO: no se puede hacer `await` de una
        // consulta a Supabase DENTRO del callback de onAuthStateChange — bloquea el
        // lock interno de auth y getSession() nunca resuelve (deadlock conocido, deja
        // la app colgada en el spinner). Por eso la consulta del rol se difiere con
        // setTimeout(0), fuera del lock. Y loading SIEMPRE termina apagándose.
        const applySession = (nextSession) => {
            if (!active) return;
            setSession(nextSession);
            const userId = nextSession?.user?.id;
            if (!userId) {
                setRole(null);
                setLoading(false);
                return;
            }
            setTimeout(async () => {
                if (!active) return;
                await loadRole(userId);
                if (active) setLoading(false);
            }, 0);
        };

        // Restaura la sesión al cargar. Si falla (sin red, token corrupto, refresh
        // caducado), se trata como "sin sesión" y ProtectedRoute redirige a /login.
        supabase.auth.getSession()
            .then(({ data, error }) => {
                if (error) throw error;
                applySession(data.session);
            })
            .catch((err) => {
                console.error('Error restoring session:', err.message);
                if (active) { setSession(null); setRole(null); setLoading(false); }
            });

        // Reacciona a login, logout, refresh y a un refresh fallido (SIGNED_OUT).
        const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            applySession(nextSession);
        });

        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, [loadRole]);

    const signIn = useCallback(async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        return { success: true };
    }, []);

    const signOut = useCallback(async () => {
        try {
            // scope 'global': revoca el refresh token en el servidor e invalida la
            // sesión en todos los dispositivos, no solo en esta pestaña.
            const { error } = await supabase.auth.signOut({ scope: 'global' });
            if (error) console.error('Error signing out:', error.message);
        } finally {
            // Pase lo que pase con la llamada (p. ej. sin red), la sesión local se
            // borra: supabase-js limpia su storage y aquí vaciamos el estado.
            setSession(null);
            setRole(null);
        }
        return { success: true };
    }, []);

    const value = {
        session,
        user: session?.user ?? null,
        role,
        loading,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
