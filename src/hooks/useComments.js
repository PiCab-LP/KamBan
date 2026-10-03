import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Un solo hook para los dos niveles que admiten comentarios: features y bugs. */
export function useComments({ featureId = null, bugId = null } = {}) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const column = bugId ? 'bug_id' : 'feature_id';
    const parentId = bugId ?? featureId;

    const fetchComments = useCallback(async () => {
        if (!parentId) {
            setComments([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('comments')
                .select('id, feature_id, bug_id, content, created_at')
                .eq(column, parentId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (err) {
            console.error('Error fetching comments:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [column, parentId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const createComment = async (content) => {
        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([{ [column]: parentId, content }])
                .select()
                .single();
            if (error) throw error;
            setComments((prev) => [...prev, data]);
            return { success: true };
        } catch (err) {
            console.error('Error creating comment:', err.message);
            return { success: false, error: err.message };
        }
    };

    const deleteComment = async (id) => {
        try {
            const { error } = await supabase.from('comments').delete().eq('id', id);
            if (error) throw error;
            setComments((prev) => prev.filter((c) => c.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting comment:', err.message);
            return { success: false, error: err.message };
        }
    };

    return { comments, loading, error, fetchComments, createComment, deleteComment };
}

/**
 * Conteo de comentarios para varios padres a la vez, en una sola query.
 * `type` es 'feature' o 'bug'. Devuelve { [parentId]: n }.
 */
export function useCommentCounts(type, parentIds) {
    const [counts, setCounts] = useState({});
    const key = parentIds.join(',');

    useEffect(() => {
        const ids = key ? key.split(',') : [];
        if (!ids.length) {
            setCounts({});
            return;
        }
        const column = type === 'bug' ? 'bug_id' : 'feature_id';

        (async () => {
            const { data, error } = await supabase
                .from('comments')
                .select(column)
                .in(column, ids);

            if (error) {
                console.error('Error fetching comment counts:', error.message);
                return;
            }
            const next = {};
            (data || []).forEach((row) => {
                const id = row[column];
                next[id] = (next[id] || 0) + 1;
            });
            setCounts(next);
        })();
    }, [type, key]);

    return counts;
}
