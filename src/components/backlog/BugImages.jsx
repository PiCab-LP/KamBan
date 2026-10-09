import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, X, Loader2, Paperclip, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [lightboxIdx, setLightboxIdx] = useState(null);

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

    // Pegar desde el portapapeles (Ctrl/Cmd+V), p. ej. una captura de pantalla, sin
    // tener que guardarla como archivo. Solo se activa cuando se puede editar y solo
    // toma elementos que sean imagen; si no hay imagen en el portapapeles, no hace nada
    // (deja pasar el pegado normal de texto en otros campos).
    useEffect(() => {
        if (!canEdit) return undefined;
        const onPaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const imageFiles = [];
            for (const item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }
            if (imageFiles.length) {
                e.preventDefault();
                addFiles(imageFiles);
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [canEdit, addFiles]);

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

    const closeLightbox = () => setLightboxIdx(null);
    const stepLightbox = (delta) =>
        setLightboxIdx((i) => (i === null ? i : (i + delta + tiles.length) % tiles.length));

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
                        {full ? `Alcanzaste el máximo de ${MAX_IMAGES} imágenes` : 'Arrastra imágenes, haz clic para elegirlas o pega una captura (Ctrl/Cmd+V)'}
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
                    {tiles.map((tile, i) => (
                        <div key={tile.key} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-border/40 bg-muted/30">
                            <img
                                src={tile.src}
                                alt=""
                                loading="lazy"
                                onClick={() => setLightboxIdx(i)}
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

            {lightboxIdx !== null && tiles[lightboxIdx] && (
                <Lightbox
                    tiles={tiles}
                    index={lightboxIdx}
                    onClose={closeLightbox}
                    onStep={stepLightbox}
                    onJump={setLightboxIdx}
                />
            )}
        </div>
    );
}

/**
 * Visor de imágenes estilo Airtable: la imagen vive en un marco con su propio
 * espacio (mínimos para que una imagen pequeña no se vea perdida) y **nunca se
 * escala hacia arriba** (máximos por viewport + tamaño natural), así no pierde
 * calidad. Navegación con flechas/teclado y tira de miniaturas. Se renderiza en
 * un portal para cubrir toda la ventana sin importar dónde esté montado.
 */
function Lightbox({ tiles, index, onClose, onStep, onJump }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight') onStep(1);
            else if (e.key === 'ArrowLeft') onStep(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, onStep]);

    const tile = tiles[index];
    const count = tiles.length;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex flex-col bg-black/85 backdrop-blur-sm animate-kanban-fade-in"
            onClick={onClose}
        >
            {/* Barra superior: contador + acciones */}
            <div
                className="flex items-center justify-between px-5 h-14 shrink-0 text-white/90"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="text-xs font-bold tracking-wide tabular-nums">{index + 1} / {count}</span>
                <div className="flex items-center gap-1.5">
                    <a
                        href={tile.fullSrc}
                        download
                        target="_blank"
                        rel="noreferrer"
                        title="Descargar"
                        className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <Download size={17} strokeWidth={2.2} />
                    </a>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Cerrar (Esc)"
                        className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Escenario: la imagen en su marco, centrada */}
            <div
                className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16"
                onClick={onClose}
            >
                {count > 1 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onStep(-1); }}
                        title="Anterior (←)"
                        className="absolute left-3 sm:left-5 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                    </button>
                )}

                <div
                    className="flex items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 p-3 sm:p-4 min-w-[300px] min-h-[220px] max-w-full max-h-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={tile.fullSrc}
                        alt=""
                        className="object-contain rounded-lg"
                        style={{ maxHeight: '72vh', maxWidth: 'min(88vw, 1000px)' }}
                    />
                </div>

                {count > 1 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onStep(1); }}
                        title="Siguiente (→)"
                        className="absolute right-3 sm:right-5 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <ChevronRight size={22} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* Tira de miniaturas */}
            {count > 1 && (
                <div
                    className="shrink-0 flex items-center justify-center gap-2 px-4 py-4 overflow-x-auto custom-scrollbar"
                    onClick={(e) => e.stopPropagation()}
                >
                    {tiles.map((t, i) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onJump(i)}
                            className={`h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                                i === index ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                        >
                            <img src={t.src} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
