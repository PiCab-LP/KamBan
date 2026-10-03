import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { OPEN_BUG_STATUSES } from '../lib/domain';

const EMPTY = { epics: 0, features: 0, bugs: 0, openBugs: 0 };

/** Conteos globales para las tarjetas del backlog. `head: true` no trae filas. */
export function useBacklogStats(refreshKey) {
    const [stats, setStats] = useState(EMPTY);

    const fetchStats = useCallback(async () => {
        const countOf = (table, apply) => {
            const query = supabase.from(table).select('*', { count: 'exact', head: true });
            return apply ? apply(query) : query;
        };

        const [epics, features, bugs, openBugs] = await Promise.all([
            countOf('epics'),
            countOf('features'),
            countOf('bugs'),
            countOf('bugs', (q) => q.in('status', OPEN_BUG_STATUSES)),
        ]);

        const failed = [epics, features, bugs, openBugs].find((r) => r.error);
        if (failed) {
            console.error('Error fetching backlog stats:', failed.error.message);
            return;
        }

        setStats({
            epics: epics.count ?? 0,
            features: features.count ?? 0,
            bugs: bugs.count ?? 0,
            openBugs: openBugs.count ?? 0,
        });
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats, refreshKey]);

    return stats;
}
