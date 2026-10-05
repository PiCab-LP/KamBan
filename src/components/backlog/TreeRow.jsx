import {
    ChevronDown, ChevronRight, MessageSquare, Pencil, Trash2, FolderPlus, MoreVertical,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

/**
 * Rejilla compartida por todos los niveles del árbol.
 *
 * La sangría se aplica SOLO a la etiqueta (prop `indent` de TreeLabel), nunca al
 * contenedor de la fila: así las columnas de estado, severidad y acciones quedan
 * alineadas verticalmente en todo el árbol pese a la jerarquía.
 */
export const TREE_GRID = 'minmax(0,1fr) 170px 90px 90px 215px';

/** Sangría de cada nivel de anidación, en píxeles. */
export const TREE_INDENT = 26;

/**
 * Desplazamiento del ícono dentro de una fila: ancho del chevron (20px) más el
 * gap (8px). Las filas sin chevron lo replican como padding para alinearse.
 */
export const TREE_ICON_OFFSET = 28;

export function TreeLabel({
    indent = 0,
    expandable = false,
    expanded = false,
    onToggle,
    icon: Icon,
    iconColor,
    title,
    subtitle,
    toggleTitle,
    titleClassName = 'text-[13px] font-bold text-foreground',
}) {
    return (
        <div
            className="flex items-center gap-2 min-w-0 py-2.5"
            style={{ paddingLeft: indent }}
        >
            {expandable ? (
                <button
                    onClick={onToggle}
                    title={toggleTitle}
                    className="flex items-center justify-center w-5 h-5 shrink-0 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                    {expanded
                        ? <ChevronDown size={14} strokeWidth={2.5} />
                        : <ChevronRight size={14} strokeWidth={2.5} />}
                </button>
            ) : (
                <span className="w-5 shrink-0" />
            )}

            <Icon size={16} strokeWidth={2} className="shrink-0" style={{ color: iconColor }} />

            <button
                onClick={onToggle}
                disabled={!expandable}
                className="min-w-0 text-left disabled:cursor-default"
            >
                <span className={`block truncate ${titleClassName}`}>{title}</span>
                {subtitle && (
                    <span className="block text-[11px] text-muted-foreground/70 truncate">{subtitle}</span>
                )}
            </button>
        </div>
    );
}

/**
 * Acciones de una fila: las constructivas (agregar, notas) van con texto a la
 * vista; editar y eliminar quedan en el menú de tres puntos para no competir.
 */
export function RowActions({
    onComment, commentCount = 0, onEdit, onDelete, entityLabel,
    onAdd, addLabel, addText,
}) {
    const textButton = 'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold transition-colors';

    return (
        <div className="flex items-center justify-end gap-1 pr-2">
            {onAdd && (
                <button
                    onClick={onAdd}
                    title={addLabel}
                    className={`${textButton} text-primary hover:bg-primary/10`}
                >
                    <FolderPlus size={14} strokeWidth={2.2} />
                    {addText}
                </button>
            )}

            {onComment && (
                <button
                    onClick={onComment}
                    title="Comentarios"
                    className={`${textButton} text-muted-foreground/70 hover:text-primary hover:bg-primary/10`}
                >
                    <MessageSquare size={14} strokeWidth={2} />
                    Notas
                    {commentCount > 0 && (
                        <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center leading-none">
                            {commentCount > 9 ? '9+' : commentCount}
                        </span>
                    )}
                </button>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title="Más acciones"
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                        <MoreVertical size={16} strokeWidth={2} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border-border/40">
                    <button
                        onClick={onEdit}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold hover:bg-muted/60 rounded-md transition-colors cursor-pointer"
                    >
                        <Pencil size={13} strokeWidth={2.5} />
                        Editar {entityLabel}
                    </button>
                    <div className="h-px bg-border/40 my-1" />
                    <button
                        onClick={onDelete}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                    >
                        <Trash2 size={13} strokeWidth={2.5} />
                        Eliminar
                    </button>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
