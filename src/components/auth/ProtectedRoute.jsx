import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { homePathForRole } from '@/lib/domain';

/** Pantalla breve mientras se resuelve la sesión, para no parpadear a /login. */
function AuthLoading() {
    return (
        <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
            <Loader2 className="animate-spin" size={24} />
        </div>
    );
}

/**
 * Exige sesión. Con `allow` exige además que el rol esté en la lista; si no, manda
 * al home de su rol. El RLS es la barrera real; esto solo evita mostrar pantallas
 * que igual fallarían.
 */
export function ProtectedRoute({ children, allow }) {
    const { session, role, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AuthLoading />;
    if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
    if (allow && role && !allow.includes(role)) {
        return <Navigate to={homePathForRole(role)} replace />;
    }
    return children;
}
