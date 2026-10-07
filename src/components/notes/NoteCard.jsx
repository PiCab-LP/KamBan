import { Pin, Trash2, Edit2, Globe, Layers, GitBranch, Bug, Clock, PencilLine } from 'lucide-react';
import { getNoteLink } from '@/hooks/useNotes';
import { getInitials, getAvatarColor } from '@/lib/format';

const LINK_ICONS = { epic: Layers, feature: GitBranch, bug: Bug };

const fmtFull = new Intl.DateTimeFormat('es', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const fmtTime = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export function NoteCard({ note, profilesById = {}, onEdit, onDelete, onTogglePin }) {
    const link = getNoteLink(note);
    const LinkIcon = link ? LINK_ICONS[link.type] : Globe;
    const authorName = note.created_by ? profilesById[note.created_by] : null;

    // El trigger pone updated_at = now() en cada UPDATE; en el INSERT es igual a
    // created_at. Consideramos "editada" solo si hay más de 1s de diferencia.
    const edited =
        note.updated_at && note.created_at &&
        new Date(note.updated_at) - new Date(note.created_at) > 1000;
    const editedLabel = edited
        ? (sameDay(note.updated_at, note.created_at)
            ? fmtTime.format(new Date(note.updated_at))
            : fmtFull.format(new Date(note.updated_at)))
        : null;

    return (
        <div
            className="group relative flex flex-col rounded-2xl border border-border/50 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{ backgroundColor: note.color || 'var(--card)', color: 'var(--card-foreground)' }}
        >
            {/* 1 · Header: vínculo a la izquierda, autor en la esquina derecha */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 min-w-0 rounded-full bg-black/5 dark:bg-white/10 pl-2 pr-2.5 py-1">
                    <LinkIcon size={13} className="shrink-0 opacity-70" strokeWidth={2.5} />
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-50 shrink-0">
                        {link ? link.label : 'Global'}
                    </span>
                    {link && (
                        <span className="text-[11px] font-bold opacity-80 truncate">
                            {link.name || 'Sin nombre'}
                        </span>
                    )}
                </span>

                {authorName && (
                    <div className="flex items-center gap-1.5 min-w-0 shrink-0 max-w-[55%]" title={`Creado por ${authorName}`}>
                        <span className="text-[11px] font-semibold opacity-70 truncate">{authorName}</span>
                        <div
                            className="flex items-center justify-center w-6 h-6 rounded-lg text-white text-[9px] font-black shrink-0"
                            style={{ backgroundColor: getAvatarColor(authorName) }}
                        >
                            {getInitials(authorName)}
                        </div>
                    </div>
                )}
            </div>

            {/* 2 · Contenido (primario) */}
            <div className="flex-1 text-[15px] leading-relaxed whitespace-pre-wrap font-semibold break-words">
                {note.content}
            </div>

            {/* 3 · Pie: acciones, luego autor y fechas agrupados, separados del contenido */}
            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 space-y-3">
                {/* Acciones: cada ícono en su propio container para distinguirse */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTogglePin(note.id, !!note.is_pinned);
                        }}
                        className={`p-2 rounded-lg border transition-all duration-200 ${note.is_pinned ? 'text-primary bg-primary/15 border-primary/30 shadow-sm' : 'text-foreground/50 bg-black/[0.04] dark:bg-white/[0.06] border-black/5 dark:border-white/10 hover:text-foreground hover:bg-black/[0.07] dark:hover:bg-white/10'}`}
                        title={note.is_pinned ? 'Desfijar' : 'Fijar al inicio'}
                    >
                        <Pin size={16} className={note.is_pinned ? 'fill-current' : ''} />
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => onEdit(note)}
                            className="p-2 rounded-lg border text-foreground/50 bg-black/[0.04] dark:bg-white/[0.06] border-black/5 dark:border-white/10 hover:text-foreground hover:bg-black/[0.07] dark:hover:bg-white/10 transition-colors"
                            title="Editar"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(note.id)}
                            className="p-2 rounded-lg border text-foreground/50 bg-black/[0.04] dark:bg-white/[0.06] border-black/5 dark:border-white/10 hover:text-destructive hover:bg-destructive/15 hover:border-destructive/30 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Fechas: creado a la izquierda, editado a la derecha */}
                <div className="flex items-center justify-between gap-3 text-[10px] font-medium opacity-55">
                    <span className="flex items-center gap-1 min-w-0" title="Fecha de creación">
                        <Clock size={11} className="shrink-0" />
                        <span className="truncate">Creado {fmtFull.format(new Date(note.created_at))}</span>
                    </span>
                    {editedLabel && (
                        <span className="flex items-center gap-1 min-w-0 shrink-0" title="Última modificación">
                            <PencilLine size={11} className="shrink-0" />
                            <span className="truncate">Editado {editedLabel}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
