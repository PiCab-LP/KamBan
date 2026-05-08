import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Building2, Activity, Rocket, Search, Filter, MoreHorizontal,
    ArrowUpRight, Eye, Archive, Calendar,
    ChevronDown, Kanban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

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

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
                backgroundColor: `var(--status-${status}-bg)`,
                color: `var(--status-${status})`,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: `var(--status-${status})` }}
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

export default function Dashboard() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchCompanies();
    }, []);

    async function fetchCompanies() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('companies')
                .select('*');

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Error al cargar companias:', error.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <LoadingSkeleton />;

    const totalCompanies = companies.length;
    const activeCount = companies.filter((company) => company.status !== 'launched').length;
    const launchedCount = companies.filter((company) => company.status === 'launched').length;
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
                            Visualizando {filteredCompanies.length} de {totalCompanies} registros
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
                                                Fecha de Lanzamiento
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 w-[120px] text-center h-16">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-card">
                                        {filteredCompanies.map((company, index) => {
                                            const avatarColor = getAvatarColor(company.name);
                                            const initials = getInitials(company.name);
                                            const progressMap = { onboarding: 15, design: 35, integration: 60, QA: 80, launched: 100 };
                                            const progress = progressMap[company.status] || 0;

                                            return (
                                                <TableRow
                                                    key={company.id}
                                                    className="border-b border-border/60 animate-kanban-fade-in group hover:bg-muted/10 transition-colors"
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
                                                                    className="h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(0,0,0,0.05)]"
                                                                    style={{
                                                                        width: `${progress}%`,
                                                                        backgroundColor: `var(--status-${company.status})`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-black text-foreground tabular-nums min-w-[35px]">
                                                                {progress}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium text-muted-foreground/80">
                                                        {(company.onboarding_date || company.created_at) ? new Date(company.onboarding_date || company.created_at).toLocaleDateString('es-ES', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        }) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium text-muted-foreground/80">
                                                        {company.launch_date ? new Date(company.launch_date).toLocaleDateString('es-ES', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        }) : '—'}
                                                    </TableCell>
                                                    <TableCell className="py-5 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2.5 gap-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors text-[11px] font-black uppercase tracking-wider"
                                                                onClick={() => navigate('/kanban')}
                                                            >
                                                                <Eye size={15} />
                                                                <span>Ver</span>
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5 shadow-xl border-border/40">
                                                                    <DropdownMenuItem onClick={() => navigate('/kanban')} className="cursor-pointer text-xs font-bold py-2.5 rounded-lg gap-2.5">
                                                                        <Kanban size={14} className="text-primary" /> Ver en Tablero
                                                                    </DropdownMenuItem>
                                                                    <div className="h-px bg-border/40 my-1" />
                                                                    <DropdownMenuItem className="cursor-pointer text-xs font-bold py-2.5 rounded-lg gap-2.5 text-destructive focus:bg-destructive/5 focus:text-destructive">
                                                                        <Archive size={14} /> Archivar Proyecto
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
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
                    <h2 className="text-xl font-black text-foreground tracking-tight">Resumen en vivo de Compañías</h2>
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
