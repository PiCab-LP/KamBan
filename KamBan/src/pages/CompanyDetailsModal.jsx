import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Save, ListChecks, StickyNote } from 'lucide-react';

const STATUS_COLORS = {
    onboarding: 'var(--status-onboarding)',
    design: 'var(--status-design)',
    integration: 'var(--status-integration)',
    QA: 'var(--status-qa)',
    launched: 'var(--status-launched)',
};

const STATUS_BG = {
    onboarding: 'var(--status-onboarding-bg)',
    design: 'var(--status-design-bg)',
    integration: 'var(--status-integration-bg)',
    QA: 'var(--status-qa-bg)',
    launched: 'var(--status-launched-bg)',
};

const STATUS_LABELS = {
    onboarding: 'En Onboarding',
    design: 'Diseño',
    integration: 'Integración',
    QA: 'QA',
    launched: 'Lanzada',
};

const AVATAR_COLORS = [
    'hsl(217 91% 55%)',
    'hsl(262 60% 50%)',
    'hsl(160 60% 40%)',
    'hsl(30 90% 50%)',
    'hsl(340 65% 50%)',
    'hsl(190 80% 42%)',
];

function getInitials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function CompanyDetailsModal({ company, onClose, onUpdate }) {
    const [checklists, setChecklists] = useState([]);
    const [note, setNote] = useState("");
    const [newTask, setNewTask] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (company) {
            fetchData();
        }
    }, [company]);

    async function fetchData() {
        const { data: ck } = await supabase.from('company_checklists').select('*').eq('company_id', company.id);
        const { data: nt } = await supabase.from('notes').select('content').eq('company_id', company.id).single();

        setChecklists(ck || []);
        setNote(nt?.content || "");
    }

    const addTask = async () => {
        if (!newTask.trim()) return;
        const { data } = await supabase.from('company_checklists')
            .insert([{ company_id: company.id, task: newTask, completed: false }]).select();

        if (data) {
            setChecklists([...checklists, ...data]);
            setNewTask("");
            if (onUpdate) onUpdate();
        }
    };

    const toggleTask = async (id, completed) => {
        await supabase.from('company_checklists').update({ completed: !completed }).eq('id', id);
        setChecklists(checklists.map(t => t.id === id ? { ...t, completed: !completed } : t));
        if (onUpdate) onUpdate();
    };

    const saveNote = async () => {
        setSaving(true);
        await supabase.from('notes').upsert({ company_id: company.id, content: note }, { onConflict: 'company_id' });
        setSaving(false);
        if (onUpdate) onUpdate();
    };

    const completedCount = checklists.filter(t => t.completed).length;
    const totalTasks = checklists.length;
    const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    const avatarColor = company ? getAvatarColor(company.name) : 'hsl(217 91% 55%)';
    const initials = company ? getInitials(company.name) : '';

    return (
        <Dialog open={!!company} onOpenChange={onClose}>
            <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl max-w-[700px] border-none shadow-2xl">
                {/* Header */}
                <DialogHeader className="border-b border-border/50 p-6 pr-14 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div
                            className="flex items-center justify-center shrink-0 w-12 h-12 rounded-xl text-white text-lg font-bold shadow-lg shadow-black/5"
                            style={{
                                backgroundColor: avatarColor,
                                boxShadow: `0 8px 16px -4px ${avatarColor}40`
                            }}
                        >
                            {initials}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                {company?.name}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span
                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full`}
                                    style={{
                                        backgroundColor: company ? `var(--status-${company.status}-bg)` : 'transparent',
                                        color: company ? `var(--status-${company.status})` : 'inherit',
                                    }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: company ? `var(--status-${company.status})` : 'transparent' }}
                                    />
                                    {company ? STATUS_LABELS[company.status] : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {totalTasks > 0 && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Progreso de tareas
                                </span>
                                <span className="text-xs font-bold text-foreground tabular-nums">
                                    {completedCount}/{totalTasks} completadas
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted-foreground/20 overflow-hidden shadow-inner">
                                <div
                                    className="h-full transition-all duration-700 ease-out rounded-full bg-gradient-to-r from-primary to-primary/60"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </DialogHeader>

                {/* Content */}
                <div className="grid grid-cols-2 divide-x divide-border/50">
                    {/* Checklist Panel */}
                    <div className="p-6 space-y-5 bg-background">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                                <ListChecks size={16} />
                            </div>
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                                Checklist
                            </h3>
                        </div>

                        {/* Add task input */}
                        <div className="flex gap-2">
                            <Input
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder="Nueva tarea..."
                                className="h-10 text-sm border-border/60 rounded-xl bg-card focus-visible:ring-primary/20"
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                            />
                            <Button
                                onClick={addTask}
                                size="sm"
                                className="h-10 w-10 p-0 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                            >
                                <Plus size={18} />
                            </Button>
                        </div>

                        {/* Task list */}
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {checklists.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer group hover:bg-muted/40 ${item.completed ? 'bg-muted/20' : 'bg-transparent'
                                        }`}
                                    onClick={() => toggleTask(item.id, item.completed)}
                                >
                                    <Checkbox
                                        checked={item.completed}
                                        onCheckedChange={() => toggleTask(item.id, item.completed)}
                                        className={`border-2 transition-colors ${item.completed ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                                            }`}
                                    />
                                    <span
                                        className={`text-sm leading-snug transition-all duration-300 select-none ${item.completed ? 'line-through text-muted-foreground/60 italic' : 'text-foreground font-medium'
                                            }`}
                                    >
                                        {item.task}
                                    </span>
                                </div>
                            ))}
                            {checklists.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground/60">
                                    <p className="text-sm font-medium">No hay tareas todavía.</p>
                                    <p className="text-xs mt-1">Agrega una para comenzar.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Panel */}
                    <div className="p-6 space-y-5 flex flex-col bg-muted/5">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600">
                                <StickyNote size={16} />
                            </div>
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                                Notas internas
                            </h3>
                        </div>

                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="flex-1 min-h-[220px] text-sm leading-relaxed resize-none border-border/50 rounded-xl bg-card focus-visible:ring-amber-500/20"
                            placeholder="Escribe notas internas sobre esta compañía..."
                        />

                        <Button
                            onClick={saveNote}
                            className="w-full gap-2 h-11 text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
                            disabled={saving}
                        >
                            <Save size={16} />
                            {saving ? 'Guardando...' : 'Guardar Notas'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}