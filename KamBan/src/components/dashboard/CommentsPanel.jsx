import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function CommentsPanel({ open, onClose, task }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!open || !task) return;
        setLoading(true);
        supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true })
            .then(({ data }) => {
                setComments(data || []);
                setLoading(false);
            });
    }, [open, task?.id, task]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleSend = async () => {
        if (!newComment.trim() || !task) return;
        setSending(true);
        const { data, error } = await supabase
            .from('task_comments')
            .insert([{ task_id: task.id, content: newComment.trim() }])
            .select()
            .single();
        if (!error && data) {
            setComments(prev => [...prev, data]);
            setNewComment('');
        }
        setSending(false);
    };

    const handleDelete = async (commentId) => {
        setDeletingId(commentId);
        const { error } = await supabase
            .from('task_comments')
            .delete()
            .eq('id', commentId);
        if (!error) {
            setComments(prev => prev.filter(c => c.id !== commentId));
        }
        setDeletingId(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
    };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col p-0 gap-0">
                <SheetHeader className="px-6 py-4 border-b border-border/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquare size={16} className="text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <SheetTitle className="text-sm font-black text-foreground leading-tight truncate">
                                {task?.task_key}
                            </SheetTitle>
                            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">
                                Comentarios
                            </p>
                        </div>
                    </div>
                </SheetHeader>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                                <MessageSquare size={20} className="text-muted-foreground/40" strokeWidth={2} />
                            </div>
                            <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                Sin comentarios aún
                            </p>
                            <p className="text-xs text-muted-foreground/30 mt-1">
                                Sé el primero en comentar
                            </p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex flex-col gap-1 group/comment">
                                <div className="relative bg-card rounded-2xl rounded-tl-sm px-4 py-3 border border-border/40 shadow-sm">
                                    <p className="text-sm text-foreground leading-relaxed pr-7">{comment.content}</p>
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        disabled={deletingId === comment.id}
                                        className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground/0 group-hover/comment:text-muted-foreground/30 hover:!text-destructive hover:bg-destructive/10 transition-all disabled:opacity-40"
                                    >
                                        <Trash2 size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                                <span className="text-[10px] text-muted-foreground/40 font-bold ml-2">
                                    {formatDate(comment.created_at)}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t border-border/40 shrink-0 space-y-3">
                    <Textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un comentario... (Ctrl+Enter para enviar)"
                        rows={3}
                        className="resize-none text-sm rounded-xl border-border/40 focus:border-primary/40"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!newComment.trim() || sending}
                        className="w-full h-9 rounded-xl gap-2 text-[12px] font-black"
                    >
                        <Send size={14} strokeWidth={2.5} />
                        {sending ? 'Enviando...' : 'Enviar comentario'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
