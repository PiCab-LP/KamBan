import { supabase } from './supabaseClient';
import {
    OPEN_BUG_STATUSES,
    COMPLETED_STATUS,
    COMPLETION_BLOCKED_CODE,
    completionBlockedMessage,
} from './domain';

/**
 * Regla: un Feature/Epic no puede pasar a "Completado" con trabajo pendiente debajo.
 * La base la hace cumplir con triggers (20261006120000_completion_guard.sql); esto es
 * el mismo chequeo hecho de antemano para dar el aviso sin esperar al error.
 *
 * Devuelve `{ ok: true }` o `{ ok: false, message }`. Si la consulta falla devuelve
 * ok: true y deja la decisión a la base, que es la que manda.
 */
export async function checkCanComplete(kind, id) {
    const countOpenBugs = (apply) => apply(
        supabase.from('bugs')
            .select(kind === 'epic' ? 'id, features!inner(epic_id)' : 'id', { count: 'exact', head: true })
            .in('status', OPEN_BUG_STATUSES),
    );

    const queries = [
        countOpenBugs((q) => (kind === 'epic' ? q.eq('features.epic_id', id) : q.eq('feature_id', id))),
    ];
    if (kind === 'epic') {
        queries.push(
            supabase.from('features')
                .select('id', { count: 'exact', head: true })
                .eq('epic_id', id)
                .neq('status', COMPLETED_STATUS),
        );
    }

    const [bugs, features] = await Promise.all(queries);
    const failed = [bugs, features].find((r) => r?.error);
    if (failed) {
        console.error('Error checking completion rule:', failed.error.message);
        return { ok: true };
    }

    const openBugs = bugs.count ?? 0;
    const pendingFeatures = features?.count ?? 0;
    if (openBugs === 0 && pendingFeatures === 0) return { ok: true };

    return { ok: false, message: completionBlockedMessage(kind, { openBugs, pendingFeatures }) };
}

/** ¿El error de Supabase viene del trigger que bloquea el completado? */
export const isCompletionBlocked = (error) => error?.code === COMPLETION_BLOCKED_CODE;
