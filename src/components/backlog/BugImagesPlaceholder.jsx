import { ImagePlus } from 'lucide-react';

/**
 * MOCKUP de la zona para adjuntar imágenes a un bug. Es solo visual: no abre el
 * selector de archivos, no valida ni guarda nada. La integración real
 * (Cloudinary + tabla en Supabase) está pendiente; ver PENDIENTES.md.
 *
 * Los límites mostrados son los acordados: formatos de imagen comunes y 5 MB por imagen.
 */
const FORMATS = 'JPG, PNG, WebP, GIF';
const MAX_MB = 5;

export function BugImagesPlaceholder() {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Imágenes
                </p>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">
                    Próximamente
                </span>
            </div>

            {/* Inerte a propósito: aria-disabled y sin handlers. */}
            <div
                aria-disabled="true"
                className="flex flex-col items-center justify-center gap-1.5 px-4 py-6 text-center rounded-xl border-2 border-dashed border-border/70 bg-muted/20 opacity-70 cursor-not-allowed select-none"
            >
                <ImagePlus size={22} strokeWidth={1.8} className="text-muted-foreground/70" />
                <p className="text-xs font-bold text-foreground/80">
                    Arrastra imágenes aquí o haz clic para elegirlas
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                    {FORMATS} · máx. {MAX_MB} MB por imagen
                </p>
            </div>
        </div>
    );
}
