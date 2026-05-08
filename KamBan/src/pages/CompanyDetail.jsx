import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, ArrowLeft, Briefcase, FileSearch, Paintbrush, Database, ClipboardCheck, PartyPopper } from 'lucide-react';

const STATUS_LABELS = {
    onboarding: 'En Onboarding',
    design: 'Diseño',
    integration: 'Integración',
    QA: 'QA',
    launched: 'Lanzada',
};

// Static definition of phases for the accordions
const PHASES = [
    { id: 'Fase 1: Comercial y Administrativa', title: 'Fase 1: Comercial y Administrativa', subtitle: 'Inicio y pagos', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'Fase 2: Recopilación de Información', title: 'Fase 2: Recopilación de Información', subtitle: 'Formularios y datos iniciales', icon: FileSearch, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { id: 'Fase 3: Diseño y Assets', title: 'Fase 3: Diseño y Assets', subtitle: 'Gráficas y branding', icon: Paintbrush, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'Fase 4: Configuración e Integración (Backend)', title: 'Fase 4: Configuración e Integración', subtitle: 'Despliegue técnico', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'Fase 5: QA & Testing', title: 'Fase 5: QA & Testing', subtitle: 'Pruebas de funcionamiento', icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'Fase 6: Cierre y Handover', title: 'Fase 6: Cierre y Handover', subtitle: 'Entrega final al cliente', icon: PartyPopper, color: 'text-emerald-500', bg: 'bg-emerald-50' }
];

export default function CompanyDetail() {
    const { companyId } = useParams();
    const navigate = useNavigate();
    
    const [company, setCompany] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPhases, setExpandedPhases] = useState({
        'Fase 1: Comercial y Administrativa': true,
        'Fase 2: Recopilación de Información': true,
        'Fase 3: Diseño y Assets': true,
        'Fase 4: Configuración e Integración (Backend)': false,
        'Fase 5: QA & Testing': false,
        'Fase 6: Cierre y Handover': false
    });

    useEffect(() => {
        if (companyId) {
            fetchCompanyData();
        }
    }, [companyId]);

    const fetchCompanyData = async () => {
        setLoading(true);
        // Fetch company details
        const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (companyError) {
            console.error("Error fetching company:", companyError);
            setLoading(false);
            return;
        }

        setCompany(companyData);

        // Fetch checklist items for this company
        const { data: tasksData, error: tasksError } = await supabase
            .from('company_checklists')
            .select('*')
            .eq('company_id', companyId)
            .order('position', { ascending: true });

        if (tasksError) {
            console.error("Error fetching tasks:", tasksError);
        } else {
            setTasks(tasksData || []);
        }

        setLoading(false);
    };

    const togglePhase = (phaseId) => {
        setExpandedPhases(prev => ({
            ...prev,
            [phaseId]: !prev[phaseId]
        }));
    };

    const handleToggleTask = async (task) => {
        const newStatus = !task.is_completed;
        
        // Optimistic UI update
        setTasks(currentTasks => 
            currentTasks.map(t => 
                t.id === task.id ? { ...t, is_completed: newStatus } : t
            )
        );

        // Supabase update
        const { error } = await supabase
            .from('company_checklists')
            .update({ is_completed: newStatus, updated_at: new Date().toISOString() })
            .eq('id', task.id);

        if (error) {
            console.error("Error updating task:", error);
            // Revert on error
            setTasks(currentTasks => 
                currentTasks.map(t => 
                    t.id === task.id ? { ...t, is_completed: !newStatus } : t
                )
            );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-destructive">Compañía no encontrada</h2>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Volver al Dashboard</Button>
            </div>
        );
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.is_completed).length;
    const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto animate-kanban-fade-in">
            {/* Navigation & Header */}
            <Button 
                variant="ghost" 
                className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/')}
            >
                <ArrowLeft size={16} /> Volver al Dashboard
            </Button>

            <Card className="p-6 md:p-8 mb-8 border-border/40 shadow-sm bg-card flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span 
                            className="inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                            style={{ 
                                backgroundColor: `var(--status-${company.status}-bg)`, 
                                color: `var(--status-${company.status})` 
                            }}
                        >
                            Fase de {STATUS_LABELS[company.status] || company.status}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground/60">• ID: {company.id.split('-')[0].toUpperCase()}</span>
                    </div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">{company.name}</h1>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        Detalle del progreso de integración y despliegue de la compañía.
                    </p>
                </div>

                {/* Overall Progress */}
                <div className="w-full md:w-64 shrink-0">
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Progreso General</span>
                        <span className="text-2xl font-black text-primary leading-none">{overallProgress}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted-foreground/10 overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                </div>
            </Card>

            {/* Phases Accordions */}
            <div className="space-y-6">
                {PHASES.map((phase) => {
                    const phaseTasks = tasks.filter(t => t.phase === phase.id);
                    const phaseCompleted = phaseTasks.filter(t => t.is_completed).length;
                    const phaseTotal = phaseTasks.length;
                    const isExpanded = expandedPhases[phase.id];
                    const Icon = phase.icon;

                    // Skip rendering section if no tasks exist for this phase, unless you want empty sections visible.
                    // For now, we'll render them always to match the static structure request.

                    return (
                        <Card key={phase.id} className="border-border/40 shadow-sm overflow-hidden bg-card transition-all duration-300">
                            {/* Accordion Header */}
                            <div 
                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors select-none"
                                onClick={() => togglePhase(phase.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${phase.bg} ${phase.color}`}>
                                        <Icon size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground tracking-tight">{phase.title}</h3>
                                        <p className="text-xs font-medium text-muted-foreground">{phase.subtitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                                        <span className="text-xs font-bold text-foreground">{phaseCompleted}/{phaseTotal}</span>
                                    </div>
                                    {isExpanded ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                                </div>
                            </div>

                            {/* Accordion Content (Tasks) */}
                            {isExpanded && (
                                <div className="border-t border-border/40 bg-background/50">
                                    {phaseTasks.length === 0 ? (
                                        <div className="p-8 text-center text-sm font-medium text-muted-foreground/60">
                                            No hay tareas asignadas a esta fase todavía.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col divide-y divide-border/40">
                                            {phaseTasks.map((task) => (
                                                <div 
                                                    key={task.id} 
                                                    className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Checkbox 
                                                            checked={task.is_completed}
                                                            onCheckedChange={() => handleToggleTask(task)}
                                                            className={`w-5 h-5 rounded border-2 transition-colors ${task.is_completed ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}
                                                        />
                                                        <span className={`text-sm font-semibold transition-all ${task.is_completed ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>
                                                            {task.task_key}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Optional Status Indicators */}
                                                    {task.is_completed && (
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">
                                                            Done
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
