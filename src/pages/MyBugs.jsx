import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug as BugIcon, MessageSquare, ClipboardCheck } from 'lucide-react';
import { useBugs } from '../hooks/useBugs';
import { BUG_STATUS, BUG_SEVERITY, BUG_PRIORITY, DEV_STATUS } from '../lib/domain';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatusPills } from '../components/backlog/StatusPills';
import { CommentsPanel } from '../components/backlog/CommentsPanel';
import { LoadingSkeleton } from '../components/ui/StatCard';

/**
 * Pantalla del rol Dev. El RLS garantiza que `useBugs()` solo devuelve los bugs
 * donde el usuario es `assigned_dev_id`. El Dev lee el contexto (solo lectura) y
 * marca su avance (Pendiente → Corregido → Revisado), nada más.
 */
export default function MyBugs() {
    const { bugs, loading, setDevStatus } = useBugs();
    const [commentTarget, setCommentTarget] = useState(null);
    const [savingId, setSavingId] = useState(null);

    const handleDevStatus = async (bug, next) => {
        if (next === bug.dev_status) return;
        setSavingId(bug.id);
        await setDevStatus(bug.id, next);
        setSavingId(null);
    };

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="p-6 lg:p-10 max-w-[900px] mx-auto w-full space-y-8">
            <div className="animate-kanban-fade-in space-y-1">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Mis Bugs</h1>
                <p className="text-sm text-muted-foreground">
                    Bugs asignados a ti. Marca tu avance y coordina con QA en los comentarios.
                </p>
            </div>

            {bugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-kanban-fade-in">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/20 text-muted-foreground mb-4">
                        <ClipboardCheck className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">No tienes bugs asignados</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        Cuando QA te asigne un bug, aparecerá aquí.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bugs.map((bug) => {
                        const featureName = bug.features?.name;
                        const epicName = bug.features?.epics?.name;
                        const severityColor = BUG_SEVERITY[bug.severity]?.color || 'var(--primary)';
                        return (
                            <Card key={bug.id} className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="flex items-center justify-center shrink-0 w-9 h-9 rounded-xl mt-0.5"
                                            style={{ backgroundColor: `color-mix(in oklch, ${severityColor} 15%, transparent)` }}
                                        >
                                            <BugIcon size={16} strokeWidth={2.5} style={{ color: severityColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            {featureName && (
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter truncate">
                                                    {epicName ? `${epicName} › ${featureName}` : featureName}
                                                </p>
                                            )}
                                            <h3 className="text-sm font-bold text-foreground leading-snug">{bug.title}</h3>
                                            {bug.description && (
                                                <p className="text-xs text-muted-foreground whitespace-pre-wrap pt-1">
                                                    {bug.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <StatusBadge value={bug.status} map={BUG_STATUS} className="!text-[10px]" />
                                        <StatusBadge value={bug.severity} map={BUG_SEVERITY} showDot={false} className="!px-2 !py-0.5 !text-[10px]" />
                                        <StatusBadge value={bug.priority} map={BUG_PRIORITY} showDot={false} className="!px-2 !py-0.5 !text-[10px]" />
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-4 border-t border-border/40">
                                        <StatusPills
                                            label="Mi avance"
                                            map={DEV_STATUS}
                                            value={bug.dev_status || 'pendiente'}
                                            onChange={(next) => handleDevStatus(bug, next)}
                                            disabled={savingId === bug.id}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => setCommentTarget({ type: 'bug', id: bug.id, title: bug.title })}
                                            className="h-9 gap-2 text-xs font-bold rounded-xl shrink-0 self-start sm:self-auto"
                                        >
                                            <MessageSquare size={14} />
                                            Comentarios
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <CommentsPanel
                open={Boolean(commentTarget)}
                onClose={() => setCommentTarget(null)}
                target={commentTarget}
            />
        </div>
    );
}
