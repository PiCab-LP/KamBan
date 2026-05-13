import { Pin, Trash2, Edit2, Clock, Globe, Building } from 'lucide-react';

function getRelativeTime(dateInput) {
    if (!dateInput) return '';
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateInput) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) return 'hoy';
    if (daysDifference === -1) return 'ayer';
    if (daysDifference > -7 && daysDifference < 0) return rtf.format(daysDifference, 'day');
    
    // For older dates
    return new Intl.DateTimeFormat('es', { month: 'short', day: 'numeric' }).format(new Date(dateInput));
}

export function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
    const isGlobal = !note.company_id;
    const companyName = isGlobal ? 'Global' : note.companies?.name || 'Desconocida';
    
    // Formatting date
    const dateToUse = note.updated_at || note.created_at;
    const timeAgo = getRelativeTime(dateToUse);

    return (
        <div 
            className="group relative flex flex-col rounded-2xl border border-border/50 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{ 
                backgroundColor: note.color || 'var(--card)',
                color: 'var(--card-foreground)'
            }}
        >
            {/* Header: Company & Date */}
            <div className="flex items-center justify-between mb-3 text-xs font-semibold opacity-70">
                <div className="flex items-center gap-1.5">
                    {isGlobal ? <Globe size={14} /> : <Building size={14} />}
                    <span className="uppercase tracking-widest">{companyName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span className="capitalize">{timeAgo}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words">
                {note.content}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 dark:border-white/5 transition-all duration-200">
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTogglePin(note.id, !!note.is_pinned);
                    }}
                    className={`p-2 rounded-xl transition-all duration-200 ${note.is_pinned ? 'text-primary bg-primary/10 shadow-sm opacity-100 scale-110' : 'text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                    title={note.is_pinned ? "Desfijar" : "Fijar al inicio"}
                >
                    <Pin size={16} className={note.is_pinned ? 'fill-current' : ''} />
                </button>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onEdit(note)}
                        className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title="Editar"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(note.id)}
                        className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
}
