import { useEffect, useRef, useState, useCallback } from 'react';
import { ImagePlus, X, Loader2, Paperclip } from 'lucide-react';
import { useBugImages } from '@/hooks/useBugImages';
import { useToast } from '@/context/ToastContext';
import { ACCEPT_ATTR, MAX_IMAGES, prepareFile } from '@/lib/images';

/**
 * Zona de imágenes de un bug. Dos modos según `bugId`:
 *  - Sin `bugId` (crear): acumula archivos localmente (valida + comprime al elegirlos)
 *    y los entrega al padre por `onPendingChange`; la subida real ocurre cuando el bug
 *    ya existe (tras crearlo).
 *  - Con `bugId` (editar / ver): carga la galería firmada desde el backend. Si `canEdit`
 *    (QA), permite agregar y eliminar al instante; si no, es solo lectura (dev/viewer).
 *
 * Las imágenes nunca son públicas: el backend firma cada URL y solo las entrega a
 * quien el RLS autoriza.
 */
export function BugImages({ bugId, canEdit = false, onPendingChange }) {
    const isCreate = !bugId;
    const { listImages, uploadImages, removeImage } = useBugImages();
    const { showToast } = useToast();

    const inputRef = useRef(null);
    const [images, setImages] = useState([]);   // existentes (modo editar/ver)
    const [pending, setPending] = useState([]);  // staged en crear: { file, url, name }
    const [loading, setLoading] = useState(!isCreate);
    const [busy, setBusy] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const total = images.length + pending.length;
    const full = total >= MAX_IMAGES;

    // Carga inicial de las imágenes existentes.
    useEffect(() => {
        if (isCreate) return undefined;
        let active = true;
        setLoading(true);
        listImages(bugId).then((res) => {
            if (active) {
                setImages(res.images || []);
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [bugId, isCreate, listImages]);

    // Avisa al padre de los archivos staged (solo en crear).
    useEffect(() => {
        if (isCreate) onPendingChange?.(pending.map((p) => p.file));
    }, [pending, isCreate, onPendingChange]);

    // Libera los object URLs al desmontar (el ref mantiene la última lista sin re-ejecutar el cleanup).
    const pendingRef = useRef(pending);
    useEffect(() => { pendingRef.current = pending; }, [pending]);
    useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

    const addFiles = useCallback(async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        const room = MAX_IMAGES - total;
        if (room <= 0) {
            showToast(`Máximo ${MAX_IMAGES} imágenes por bug.`, 'warning');
            return;
        }
        const take = files.slice(0, room);
        if (files.length > room) {
            showToast(`Solo caben ${room} imagen(es) más (máximo ${MAX_IMAGES} por bug).`, 'warning');
        }

        setBusy(true);
        if (isCreate) {
            // Valida y comprime ahora para dar feedback inmediato y guardar el File listo.
            const staged = [];
            for (const file of take) {
                const prepared = await prepareFile(file);
                if (!prepared.ok) {
                    showToast(prepared.error, 'error', file.name, 7000);
                    continue;
                }
                staged.push({
                    file: prepared.file,
                    url: URL.createObjectURL(prepared.file),
                    name: file.name,
                });
            }
            setPending((prev) => [...prev, ...staged]);
        } else {
            await uploadImages(bugId, take);
            const fresh = await listImages(bugId);
            setImages(fresh.images || []);
        }
        setBusy(false);
    }, [total, isCreate, bugId, uploadImages, listImages, showToast]);

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (canEdit && !busy) addFiles(e.dataTransfer.files);
    };

    const onInputChange = (e) => {
        addFiles(e.target.files);
        e.target.value = ''; // permite volver a elegir el mismo archivo
    };

    const removePending = (idx) => {
        setPending((prev) => {
            URL.revokeObjectURL(prev[idx]?.url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const removeExisting = async (img) => {
        setBusy(true);
        const res = await removeImage(img);
        if (res.success) setImages((prev) => prev.filter((i) => i.id !== img.id));
        setBusy(false);
    };

    const tiles = [
        ...images.map((img) => ({ key: img.id, src: img.thumbUrl, fullSrc: img.fullUrl, onRemove: () => removeExisting(img) })),
        ...pending.map((p, idx) => ({ key: `p-${idx}`, src: p.url, fullSrc: p.url, onRemove: () => removePending(idx) })),
    ];

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Imágenes
                </p>
                {total > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black">
                        <Paperclip size={10} strokeWidth={2.5} />
                        {total}/{MAX_IMAGES}
                    </span>
                )}
            </div>

            {canEdit && (
                <div
                    role="button"
                    tabIndex={full || busy ? -1 : 0}
                    aria-disabled={full || busy}
                    onClick={() => { if (!full && !busy) inputRef.current?.click(); }}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !full && !busy) inputRef.current?.click(); }}
                    onDragOver={(e) => { e.preventDefault(); if (!full && !busy) setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={`flex flex-col items-center justify-center gap-1.5 px-4 py-6 text-center rounded-xl border-2 border-dashed transition-colors select-none ${
                        full || busy
                            ? 'opacity-60 cursor-not-allowed border-border/70 bg-muted/20'
                            : dragOver
                                ? 'border-primary bg-primary/5 cursor-pointer'
                                : 'border-border/70 bg-muted/20 hover:border-primary/50 cursor-pointer'
                    }`}
                >
                    {busy ? (
                        <Loader2 size={22} strokeWidth={1.8} className="text-muted-foreground/70 animate-spin" />
                    ) : (
                        <ImagePlus size={22} strokeWidth={1.8} className="text-muted-foreground/70" />
                    )}
                    <p className="text-xs font-bold text-foreground/80">
                        {full ? `Alcanzaste el máximo de ${MAX_IMAGES} imágenes` : 'Arrastra imágenes aquí o haz clic para elegirlas'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                        JPG, PNG, WebP o GIF · máx. 5 MB por imagen
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPT_ATTR}
                        multiple
                        hidden
                        onChange={onInputChange}
                    />
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 py-3 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px] font-bold">Cargando imágenes...</span>
                </div>
            ) : tiles.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {tiles.map((tile) => (
                        <div key={tile.key} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-border/40 bg-muted/30">
                            <img
                                src={tile.src}
                                alt=""
                                loading="lazy"
                                onClick={() => setLightbox(tile.fullSrc)}
                                className="w-full h-full object-cover cursor-zoom-in"
                            />
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => tile.onRemove()}
                                    disabled={busy}
                                    title="Eliminar imagen"
                                    className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-40"
                                >
                                    <X size={13} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                !canEdit && (
                    <p className="text-[11px] text-muted-foreground/60 py-1">Sin imágenes.</p>
                )
            )}

            {lightbox && (
                <div
                    className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
                    onClick={() => setLightbox(null)}
                >
                    <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg shadow-2xl" />
                    <button
                        type="button"
                        onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}
