import { useEffect, useState, useRef, Fragment } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Building2, Activity, Rocket, Search,
    Calendar, Plus,
    ChevronLeft, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import '../App.css';
import { CompanyExpandedDetail } from '@/components/dashboard/CompanyExpandedDetail';

const STATUS_LABELS = {
    'nuevo': 'Nuevo',
    'diseno': 'Diseño',
    'integracion': 'Integración',
    'qa': 'QA',
    'entrega': 'Lanzamiento',
    'done': 'Entregada',
};

const PHASE_TO_STATUS = {
    'Fase 1: Comercial y Administrativa': 'nuevo',
    'Fase 2: Recopilación de Información': 'nuevo',
    'Fase 3: Diseño y Assets': 'diseno',
    'Fase 4: Configuración e Integración (Backend)': 'integracion',
    'Fase 5: QA & Testing': 'qa',
    'Fase 6: Cierre y Handover': 'entrega',
};

const PHASE_ORDER = [
    'Fase 1: Comercial y Administrativa',
    'Fase 2: Recopilación de Información',
    'Fase 3: Diseño y Assets',
    'Fase 4: Configuración e Integración (Backend)',
    'Fase 5: QA & Testing',
    'Fase 6: Cierre y Handover',
];

const AVATAR_COLORS = [
    'oklch(0.55 0.18 260)',
    'oklch(0.55 0.18 300)',
    'oklch(0.55 0.16 150)',
    'oklch(0.7 0.16 60)',
    'oklch(0.6 0.2 15)',
    'oklch(0.55 0.15 200)',
];

function getInitials(name) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Sparkline({ data, color, width = 80, height = 32 }) {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');

    const gradientId = `sparkGrad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill={`url(#${gradientId})`}
            />
            <polyline
                points={points}
                className="sparkline-path"
                stroke={color}
            />
        </svg>
    );
}

function StatusBadge({ status }) {
    const label = STATUS_LABELS[status] || status;

    const statusColors = {
        'nuevo': 'oklch(0.6 0.22 300)',      // Púrpura (Nuevo)
        'diseno': 'oklch(0.55 0.15 200)',    // Cyan (Diseño)
        'integracion': 'oklch(0.55 0.18 260)', // Azul (Integración)
        'qa': 'oklch(0.7 0.16 60)',          // Naranja (QA)
        'entrega': 'oklch(0.6 0.16 150)',    // Verde (Lanzamiento)
        'done': 'oklch(0.6 0.16 150)',       // Verde (Entregada)
    };

    const color = statusColors[status] || 'var(--primary)';

    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{
                backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
                color: color,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
            />
            {label}
        </span>
    );
}

function StatCard({ icon: Icon, label, value, delay = 0, trend, trendLabel, color, sparkData }) {
    return (
        <div className="animate-kanban-slide-up w-full" style={{ animationDelay: `${delay}ms` }}>
            <Card className="group border-border/40 hover:border-primary/30 transition-all duration-300 bg-card overflow-hidden shadow-sm hover:shadow-md py-0 gap-0">
                <CardContent className="p-6 flex items-center gap-5 min-h-[100px]">
                    <div
                        className="flex items-center justify-center w-12 h-12 rounded-2xl transition-transform group-hover:scale-110 duration-300 shrink-0"
                        style={{
                            backgroundColor: color ? `color-mix(in oklch, ${color} 12%, transparent)` : 'var(--accent)',
                        }}
                    >
                        <Icon size={24} strokeWidth={2.5} style={{ color: color || 'var(--primary)' }} />
                    </div>

                    <div className="flex-1 flex flex-col items-start text-left min-w-0">
                        <p className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] truncate w-full mb-1">{label}</p>
                        <div className="flex items-baseline gap-2.5">
                            <p className="text-3xl font-black text-foreground tracking-tight leading-none">{value}</p>
                            {trend && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${trend > 0 ? 'bg-status-launched-bg text-status-launched' : 'bg-destructive/10 text-destructive'}`}>
                                    {trendLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    {sparkData && (
                        <div className="shrink-0 opacity-20 group-hover:opacity-80 transition-opacity duration-300 hidden xl:block">
                            <Sparkline data={sparkData} color={color || 'var(--primary)'} width={60} height={20} />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6 p-8">
            <div className="space-y-2">
                <div className="h-7 w-56 skeleton-shimmer rounded-lg" />
                <div className="h-4 w-80 skeleton-shimmer rounded-md" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="h-[120px] skeleton-shimmer rounded-xl" />
                ))}
            </div>
            <div className="h-72 skeleton-shimmer rounded-xl" />
        </div>
    );
}


function formatLocalDate(dateVal) {
    if (!dateVal) return '—';
    const dateObj = typeof dateVal === 'string' && dateVal.includes('-') && !dateVal.includes('T')
        ? new Date(dateVal.replace(/-/g, '/'))
        : new Date(dateVal);
    
    return dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function Dashboard() {
    const { showToast } = useToast();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [newCompanyName, setNewCompanyName] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState("");
    const [expandedCompanyIds, setExpandedCompanyIds] = useState(new Set());
    const [companyTasks, setCompanyTasks] = useState({});
    const [loadingTasks, setLoadingTasks] = useState({});
    const hasCelebrated = useRef({});
    const ITEMS_PER_PAGE = 10;

    async function fetchCompanies() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('companies')
                .select(`
                    *,
                    company_checklists (
                        is_completed,
                        item_status
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Error al cargar companias:', error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const handleAddCompany = async () => {
        const name = newCompanyName.trim();
        if (!name) return;

        // Validar si ya existe una compañía con ese nombre
        const exists = companies.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            setAddError("Ya existe una compañía con este nombre.");
            return;
        }

        try {
            setIsAdding(true);
            setAddError("");

            // Calcular la posición más alta actual
            const maxPos = companies.length > 0
                ? Math.max(...companies.map(c => c.position || 0))
                : 0;

            const { data, error } = await supabase
                .from('companies')
                .insert([{
                    name: name,
                    status: 'nuevo',
                    position: maxPos + 1
                }])
                .select();

            if (!error && data) {
                setNewCompanyName("");
                setIsDialogOpen(false);
                showToast(`¡${name} agregada con éxito!`, 'success');
                await fetchCompanies();
            } else if (error) {
                console.error("Error al agregar compañia:", error.message);
                setAddError("Error al guardar en la base de datos.");
            }
        } finally {
            setIsAdding(false);
        }
    };

    const fetchCompanyTasks = async (companyId) => {
        setLoadingTasks(prev => ({ ...prev, [companyId]: true }));
        const { data } = await supabase
            .from('company_checklists')
            .select('*')
            .eq('company_id', companyId)
            .order('position', { ascending: true });
        setCompanyTasks(prev => ({ ...prev, [companyId]: data || [] }));
        setLoadingTasks(prev => ({ ...prev, [companyId]: false }));
    };

    const handleExpandToggle = (companyId) => {
        setExpandedCompanyIds(prev => {
            const next = new Set(prev);
            if (next.has(companyId)) {
                next.delete(companyId);
            } else {
                next.add(companyId);
                if (!companyTasks[companyId]) fetchCompanyTasks(companyId);
            }
            return next;
        });
    };

    const getEffectiveStatus = (task) =>
        task.item_status ?? (task.is_completed ? 'listo' : 'pendiente');

    const recalcAndSyncCompanyStatus = async (companyId, updatedTasks) => {
        const allListo = updatedTasks.length > 0 && updatedTasks.every(t => getEffectiveStatus(t) === 'listo');
        let newCompanyStatus = 'nuevo';
        if (allListo) {
            newCompanyStatus = 'done';
        } else {
            for (const phaseTitle of PHASE_ORDER) {
                const phaseTasks = updatedTasks.filter(t => t.phase?.startsWith(phaseTitle.substring(0, 7)));
                if (phaseTasks.length > 0 && phaseTasks.some(t => getEffectiveStatus(t) !== 'listo')) {
                    newCompanyStatus = PHASE_TO_STATUS[phaseTitle] || 'nuevo';
                    break;
                }
            }
        }
        const updatePayload = {
            status: newCompanyStatus,
            launch_date: newCompanyStatus === 'done' ? new Date().toISOString().split('T')[0] : null,
        };
        await supabase.from('companies').update(updatePayload).eq('id', companyId);
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updatePayload } : c));
        if (newCompanyStatus === 'done' && !hasCelebrated.current[companyId]) {
            hasCelebrated.current[companyId] = true;
            confetti({ particleCount: 220, spread: 90, origin: { y: 0.55 },
                colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e879f9'] });
        } else if (newCompanyStatus !== 'done') {
            hasCelebrated.current[companyId] = false;
        }
    };

    const handleUpdateTaskStatus = async (companyId, taskId, newItemStatus) => {
        const prevTasks = companyTasks[companyId] || [];
        const prevTask = prevTasks.find(t => t.id === taskId);
        if (!prevTask) return;

        const updatedTasks = prevTasks.map(t =>
            t.id === taskId ? { ...t, item_status: newItemStatus } : t
        );
        setCompanyTasks(prev => ({ ...prev, [companyId]: updatedTasks }));

        const { error } = await supabase
            .from('company_checklists')
            .update({ item_status: newItemStatus })
            .eq('id', taskId);

        if (error) {
            setCompanyTasks(prev => ({ ...prev, [companyId]: prevTasks }));
            showToast('Error al actualizar el estado', 'error');
        } else {
            await recalcAndSyncCompanyStatus(companyId, updatedTasks);
        }
    };

    const handleReorderTasks = async (companyId, reorderedTasks) => {
        setCompanyTasks(prev => ({ ...prev, [companyId]: reorderedTasks }));
        try {
            await Promise.all(
                reorderedTasks.map((t, i) =>
                    supabase.from('company_checklists').update({ position: i }).eq('id', t.id)
                )
            );
            showToast('El nuevo orden ha sido guardado', 'info', 'Orden actualizado');
        } catch {
            showToast('No se pudo guardar el nuevo orden', 'error', 'Error al reordenar');
        }
    };

    const handleEditTask = async (companyId, taskId, newName) => {
        setCompanyTasks(prev => ({
            ...prev,
            [companyId]: prev[companyId].map(t =>
                t.id === taskId ? { ...t, task_key: newName } : t
            ),
        }));
        const { error } = await supabase
            .from('company_checklists')
            .update({ task_key: newName })
            .eq('id', taskId);
        if (error) {
            showToast('No se pudo guardar el nuevo nombre', 'error', 'Error al editar');
        } else {
            showToast(`"${newName}"`, 'success', 'Nombre actualizado');
        }
    };

    const handleDeleteTask = async (companyId, taskId) => {
        const prevTasks = companyTasks[companyId] || [];
        const deleted = prevTasks.find(t => t.id === taskId);
        const updatedTasks = prevTasks.filter(t => t.id !== taskId);
        setCompanyTasks(prev => ({ ...prev, [companyId]: updatedTasks }));
        const { error } = await supabase
            .from('company_checklists')
            .delete()
            .eq('id', taskId);
        if (error) {
            setCompanyTasks(prev => ({ ...prev, [companyId]: prevTasks }));
            showToast('No se pudo eliminar la tarea', 'error', 'Error al eliminar');
        } else {
            showToast(deleted?.task_key ?? 'La tarea fue eliminada permanentemente', 'warning', 'Tarea eliminada');
            await recalcAndSyncCompanyStatus(companyId, updatedTasks);
        }
    };

    const handleDuplicateTask = async (companyId, task) => {
        const tasks = companyTasks[companyId] || [];
        const maxPos = tasks.reduce((m, t) => Math.max(m, t.position ?? 0), 0);
        const { data, error } = await supabase
            .from('company_checklists')
            .insert([{
                company_id: companyId,
                task_key: task.task_key + ' (copia)',
                phase: task.phase,
                position: maxPos + 1,
                item_status: 'pendiente',
                is_completed: false,
            }])
            .select()
            .single();
        if (!error && data) {
            setCompanyTasks(prev => ({ ...prev, [companyId]: [...prev[companyId], data] }));
            showToast(`"${task.task_key} (copia)" fue creada`, 'success', 'Tarea duplicada');
        } else {
            showToast('No se pudo duplicar la tarea', 'error', 'Error al duplicar');
        }
    };

    if (loading) return <LoadingSkeleton />;

    const totalCompanies = companies.length;
    const activeCount = companies.filter((company) => company.status !== 'done').length;
    const launchedCount = companies.filter((company) => company.status === 'done').length;
    const recentCount = companies.filter((company) => {
        const created = new Date(company.created_at);
        const now = new Date();
        return (now - created) < 7 * 24 * 60 * 60 * 1000;
    }).length;

    const filteredCompanies = companies.filter((company) => {
        const matchSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || company.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
    const paginatedCompanies = filteredCompanies.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="p-6 lg:p-10 max-w-[1400px] mx-auto w-full space-y-10">

            {/* ── Header bar ─────────────────────── */}
            <div className="animate-kanban-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-foreground tracking-tight">
                            Directorio de Compañías
                        </h1>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80 group">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Buscar empresa..."
                                className="w-full h-11 pl-11 pr-4 bg-card border border-border/60 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className="gap-2 text-[13px] font-bold px-6 h-11 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                                    style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                    }}
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    Nueva Compañía
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl bg-card">
                                <DialogHeader className="pb-2">
                                    <DialogTitle className="text-xl font-black tracking-tight">
                                        Agregar Nueva Compañía
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground/60">
                                        Ingresa el nombre de la empresa para registrarla en el sistema.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-5 pt-1">
                                    <div className="space-y-1">
                                        <Input
                                            placeholder="Ej: Company Test"
                                            value={newCompanyName}
                                            onChange={(e) => {
                                                setNewCompanyName(e.target.value);
                                                setAddError("");
                                            }}
                                            className={`h-12 text-sm rounded-2xl border-border/60 bg-muted/30 focus:bg-background transition-all ${addError ? 'border-destructive focus:ring-destructive/10' : ''}`}
                                            onKeyDown={(e) => e.key === 'Enter' && !isAdding && handleAddCompany()}
                                            autoFocus
                                            disabled={isAdding}
                                        />
                                        {addError && <p className="text-[10px] font-bold text-destructive mt-2 ml-1 uppercase tracking-wider">{addError}</p>}
                                    </div>
                                    <div className="flex justify-end gap-3 mt-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsDialogOpen(false)}
                                            className="text-xs font-bold h-11 px-6 rounded-xl hover:bg-muted"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleAddCompany}
                                            disabled={isAdding || !newCompanyName.trim()}
                                            className="text-xs font-black h-11 px-8 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                                        >
                                            {isAdding ? 'Guardando...' : 'Guardar Compañía'}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* ── Company directory table ─────────── */}
            <div className="grid grid-cols-1 gap-6">
                <section className="animate-kanban-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-2">Filtrar por:</span>
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterStatus === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-md border-transparent'
                                    : 'bg-card border border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary'
                                    }`}
                            >
                                Todas
                            </button>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterStatus(key)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterStatus === key
                                        ? 'bg-primary text-primary-foreground shadow-md border-transparent'
                                        : 'bg-card border border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
                            Visualizando {paginatedCompanies.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredCompanies.length)} de {filteredCompanies.length} resultados
                        </p>
                    </div>

                    <Card className="border-border/40 overflow-hidden bg-card shadow-lg shadow-black/5 rounded-2xl p-0">
                        <CardContent className="p-0 bg-muted">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted border-b-2 border-border">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 pl-8 h-16 w-[400px]">
                                                Compañía
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 w-[180px]">
                                                Estado
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 w-[200px]">
                                                Progreso
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 w-[200px] text-center">
                                                Fecha de Onboarding
                                            </TableHead>


                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 w-[180px] text-center">
                                                Fecha de Entrega
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 w-[120px] text-center h-16">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-card">
                                        {paginatedCompanies.map((company, index) => {
                                            const avatarColor = getAvatarColor(company.name);
                                            const initials = getInitials(company.name);
                                            const isExpanded = expandedCompanyIds.has(company.id);

                                            // Use loaded tasks for progress if available, else fall back to nested checklists
                                            const taskSource = companyTasks[company.id] ?? company.company_checklists ?? [];
                                            const totalTasks = taskSource.length;
                                            const completedTasks = taskSource.filter(t =>
                                                (t.item_status ?? (t.is_completed ? 'listo' : 'pendiente')) === 'listo'
                                            ).length;
                                            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                                            const statusColors = {
                                                'nuevo': 'oklch(0.6 0.22 300)',
                                                'diseno': 'oklch(0.55 0.15 200)',
                                                'integracion': 'oklch(0.55 0.18 260)',
                                                'qa': 'oklch(0.7 0.16 60)',
                                                'entrega': 'oklch(0.6 0.16 150)',
                                                'done': 'oklch(0.6 0.16 150)',
                                            };
                                            const progressColor = statusColors[company.status] || 'var(--primary)';

                                            return (
                                                <Fragment key={company.id}>
                                                    <TableRow
                                                        className={`border-b border-border/60 animate-kanban-fade-in group transition-colors ${isExpanded ? 'bg-muted/10' : 'hover:bg-muted/10'}`}
                                                        style={{ animationDelay: `${150 + index * 30}ms` }}
                                                    >
                                                        <TableCell className="pl-8 py-5">
                                                            <div className="flex items-center gap-3.5">
                                                                <div
                                                                    className="flex items-center justify-center w-9 h-9 rounded-xl text-white text-[10px] font-black shadow-sm"
                                                                    style={{ backgroundColor: avatarColor }}
                                                                >
                                                                    {initials}
                                                                </div>
                                                                <span className="text-sm font-bold text-foreground">
                                                                    {company.name}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <StatusBadge status={company.status} />
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <div className="flex items-center gap-3 pr-8">
                                                                <div className="h-2 flex-1 bg-muted-foreground/20 rounded-full overflow-hidden shadow-inner">
                                                                    <div
                                                                        className="h-full transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(0,0,0,0.05)]"
                                                                        style={{
                                                                            width: `${progress}%`,
                                                                            backgroundColor: progressColor,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] font-black text-foreground tabular-nums min-w-[35px]">
                                                                    {progress}%
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-muted-foreground/80">
                                                            {formatLocalDate(company.onboarding_date || company.created_at)}
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-muted-foreground/80">
                                                            {formatLocalDate(company.launch_date)}
                                                        </TableCell>
                                                        <TableCell className="py-5 text-center">
                                                            <div className="flex items-center justify-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className={`h-9 px-4 gap-2 rounded-xl transition-all text-[11px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 ${isExpanded ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                                                                    onClick={() => handleExpandToggle(company.id)}
                                                                >
                                                                    {isExpanded
                                                                        ? <><ChevronUp size={16} /><span>Ocultar</span></>
                                                                        : <><ChevronDown size={16} /><span>Ver Detalles</span></>
                                                                    }
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded && (
                                                        <TableRow className="hover:bg-transparent border-none">
                                                            <TableCell colSpan={6} className="p-0 border-b border-border/60">
                                                                <CompanyExpandedDetail
                                                                    tasks={companyTasks[company.id] || []}
                                                                    loading={!!loadingTasks[company.id]}
                                                                    onUpdateTaskStatus={(taskId, status) => handleUpdateTaskStatus(company.id, taskId, status)}
                                                                    onReorderTasks={(reordered) => handleReorderTasks(company.id, reordered)}
                                                                    onEditTask={(taskId, newName) => handleEditTask(company.id, taskId, newName)}
                                                                    onDeleteTask={(taskId) => handleDeleteTask(company.id, taskId)}
                                                                    onDuplicateTask={(task) => handleDuplicateTask(company.id, task)}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-8 py-4 bg-card border-t border-border/60">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            Página <span className="text-foreground">{currentPage}</span> de <span className="text-foreground">{totalPages}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0 rounded-xl border-border/60 hover:bg-muted transition-all active:scale-95 disabled:opacity-30"
                                        >
                                            <ChevronLeft size={16} />
                                        </Button>

                                        <div className="flex items-center gap-1 mx-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    // Mostrar siempre primera, última y las cercanas a la actual
                                                    if (totalPages <= 7) return true;
                                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                                })
                                                .map((page, index, array) => {
                                                    const showDots = index > 0 && page - array[index - 1] > 1;
                                                    return (
                                                        <div key={page} className="flex items-center gap-1">
                                                            {showDots && <span className="text-muted-foreground/40 text-[10px] px-1">...</span>}
                                                            <button
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`h-8 min-w-[32px] px-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${currentPage === page
                                                                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                                                                    : 'hover:bg-muted text-muted-foreground'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0 rounded-xl border-border/60 hover:bg-muted transition-all active:scale-95 disabled:opacity-30"
                                        >
                                            <ChevronRight size={16} />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {filteredCompanies.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-kanban-fade-in bg-muted/5">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/20 text-muted-foreground mb-4">
                                        <Search className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-base font-bold text-foreground">No se encontraron resultados</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                                        Intenta ajustar los términos de búsqueda o los filtros aplicados.
                                    </p>
                                    <Button variant="outline" className="mt-6 rounded-xl text-xs font-bold" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>
                                        Limpiar filtros
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>

            {/* ── Summary stats ───────────────────── */}
            <section className="animate-kanban-fade-in space-y-6" style={{ animationDelay: '200ms' }}>
                <div className="border-b border-border/40 pb-4">
                    <h2 className="text-xl font-black text-foreground tracking-tight">Pipeline de Compañías</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon={Building2}
                        label="Total Compañías"
                        value={totalCompanies}
                        delay={0}
                        trend={1}
                        trendLabel="+12%"
                        color="oklch(0.55 0.18 260)"
                        sparkData={[2, 3, 4, 3, 5, 4, totalCompanies]}
                    />
                    <StatCard
                        icon={Activity}
                        label="En Desarrollo"
                        value={activeCount}
                        delay={50}
                        trend={1}
                        trendLabel="Activo"
                        color="oklch(0.55 0.18 300)"
                        sparkData={[1, 2, 2, 3, 3, 2, activeCount]}
                    />
                    <StatCard
                        icon={Rocket}
                        label="Lanzadas"
                        value={launchedCount}
                        delay={100}
                        color="oklch(0.55 0.16 150)"
                        sparkData={[0, 1, 1, 2, 2, 3, launchedCount]}
                    />
                    <StatCard
                        icon={Calendar}
                        label="Nuevas (7 días)"
                        value={recentCount}
                        delay={150}
                        trend={1}
                        trendLabel={`+${recentCount}`}
                        color="oklch(0.7 0.16 60)"
                        sparkData={[0, 0, 1, 1, 2, 1, recentCount]}
                    />
                </div>
            </section>
        </div>
    );
}
