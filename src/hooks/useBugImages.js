import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import {
    prepareFile, apiPost, apiGet, uploadToCloudinary, MAX_IMAGES,
} from '../lib/images';

/**
 * Imágenes de un bug (Cloudinary + tabla bug_images). Sigue la convención del
 * proyecto: las mutaciones devuelven { success } / { success:false, error } y
 * lanzan sus propios toasts. La subida es por archivo: valida → comprime → firma
 * (backend) → sube a Cloudinary → inserta la fila (Supabase, RLS qa).
 */
export function useBugImages() {
    const { showToast } = useToast();

    const listImages = useCallback(async (bugId) => {
        try {
            const { images } = await apiGet(`/api/bug-images/list?bugId=${encodeURIComponent(bugId)}`);
            return { success: true, images: images || [] };
        } catch (err) {
            console.error('Error listing bug images:', err.message);
            return { success: false, error: err.message, images: [] };
        }
    }, []);

    const uploadImages = useCallback(async (bugId, files) => {
        const results = [];
        for (const file of files) {
            try {
                const prepared = await prepareFile(file);
                if (!prepared.ok) {
                    results.push({ name: file.name, ok: false, error: prepared.error });
                    continue;
                }
                const sig = await apiPost('/api/bug-images/sign-upload', { bugId });
                const uploaded = await uploadToCloudinary(prepared.file, sig);
                const { error } = await supabase.from('bug_images').insert([{
                    bug_id: bugId,
                    public_id: uploaded.public_id,
                    format: uploaded.format,
                    bytes: uploaded.bytes,
                    width: uploaded.width,
                    height: uploaded.height,
                }]);
                if (error) throw new Error(error.message);
                results.push({ name: file.name, ok: true });
            } catch (err) {
                results.push({ name: file.name, ok: false, error: err.message });
            }
        }

        const okCount = results.filter((r) => r.ok).length;
        const failed = results.filter((r) => !r.ok);
        if (okCount) {
            showToast(`${okCount} ${okCount === 1 ? 'imagen subida' : 'imágenes subidas'}`, 'success');
        }
        // Un toast por cada fallo, con el archivo como título y el motivo como mensaje.
        failed.forEach((f) => showToast(f.error, 'error', f.name, 7000));

        return { success: failed.length === 0, okCount, results };
    }, [showToast]);

    const removeImage = useCallback(async (image) => {
        try {
            await apiPost('/api/bug-images/delete', { publicId: image.publicId });
            showToast('Imagen eliminada', 'info');
            return { success: true };
        } catch (err) {
            showToast(err.message || 'No se pudo eliminar la imagen', 'error');
            return { success: false, error: err.message };
        }
    }, [showToast]);

    // Limpieza completa de Cloudinary antes de borrar el bug. No toca filas: caen por CASCADE.
    const deleteAllForBug = useCallback(async (bugId) => {
        try {
            await apiPost('/api/bug-images/delete', { bugId });
            return { success: true };
        } catch (err) {
            console.error('Error cleaning up bug images:', err.message);
            return { success: false, error: err.message };
        }
    }, []);

    return { listImages, uploadImages, removeImage, deleteAllForBug, MAX_IMAGES };
}
