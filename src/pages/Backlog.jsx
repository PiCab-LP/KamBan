import { useEffect, useMemo, useState, Fragment } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { StatCard, LoadingSkeleton } from '@/components/ui/StatCard';
import {
    Layers, GitBranch, Bug as BugIcon, AlertCircle, Search, Plus,
    ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useEpics } from '../hooks/useEpics';
import { useBacklogStats } from '../hooks/useBacklogStats';
import { useProfiles } from '../hooks/useProfiles';
import { useAuth } from '../context/AuthContext';
import { ENTITY_STATUS, canManageBacklog } from '../lib/domain';
import { formatLocalDate, getInitials, getAvatarColor } from '../lib/format';
import { StatusDropdown } from '../components/backlog/StatusDropdown';
import { EpicFormModal } from '../components/backlog/EpicFormModal';
import { EpicExpandedDetail } from '../components/backlog/EpicExpandedDetail';
import { RowActions } from '../components/backlog/TreeRow';
import {
    TREE_STATUS_WIDTH, TREE_DATE_WIDTH, TREE_ACTIONS_WIDTH,
} from '../components/backlog/treeLayout';
import '../App.css';

const ITEMS_PER_PAGE = 10;

export default function Backlog() {
    const {
        epics, loading, createEpic, updateEpic, updateEpicStatus, deleteEpic,
    } = useEpics();
    const { role } = useAuth();
    const canManage = canManageBacklog(role);
    const { profilesById } = useProfiles();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedEpicIds, setExpandedEpicIds] = useState(new Set());
    const [formEpic, setFormEpic] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deletingEpic, setDeletingEpic] = useState(null);
    const [addFeatureFor, setAddFeatureFor] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [childCount, setChildCount] = useState(0);

    const stats = useBacklogStats(`${epics.length}-${childCount}`);

    // Las filas expandidas que quedan fuera de la vista no deben seguir abiertas.
    useEffect(() => {
        setCurrentPage(1);
        setExpandedEpicIds(new Set());
    }, [searchTerm, filterStatus]);

    const filteredEpics = useMemo(() => epics.filter((epic) => {
        const matchesSearch = epic.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || epic.status === filterStatus;
        return matchesSearch && matchesStatus;
    }), [epics, searchTerm, filterStatus]);

    const totalPages = Math.ceil(filteredEpics.length / ITEMS_PER_PAGE);
    const paginatedEpics = filteredEpics.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

    const goToPage = (page) => {
        setCurrentPage(page);
        setExpandedEpicIds(new Set());
    };

    // Agregar un feature exige que el Epic esté desplegado: el formulario vive
    // en EpicExpandedDetail, junto a la mutación.
    const handleAddFeature = (epicId) => {
        setExpandedEpicIds((prev) => new Set(prev).add(epicId));
        setAddFeatureFor(epicId);
    };

    const handleExpandToggle = (epicId) => {
        setExpandedEpicIds((prev) => {
            const next = new Set(prev);
            if (next.has(epicId)) next.delete(epicId);
            else next.add(epicId);
            return next;
        });
    };

    const handleSaveEpic = (data) => (formEpic ? updateEpic(formEpic.id, data) : createEpic(data));

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteEpic(deletingEpic.id);
        setIsDeleting(false);
        setDeletingEpic(null);
        setChildCount((n) => n + 1);
    };

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="p-6 lg:p-10 max-w-[1400px] mx-auto w-full space-y-10">

            {/* ── Header ─────────────────────────── */}
            <div className="animate-kanban-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-foreground tracking-tight">
                            Backlog de QA
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
                                placeholder="Buscar epic..."
                                className="w-full h-11 pl-11 pr-4 bg-card border border-border/60 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>

                        {canManage && (
                            <Button
                                onClick={() => { setFormEpic(null); setFormOpen(true); }}
                                className="gap-2 text-[13px] font-bold px-6 h-11 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                                style={{ background: 'var(--primary)', color: 'white' }}
                            >
                                <Plus size={18} strokeWidth={3} />
                                Nuevo Epic
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Tabla de epics ─────────────────── */}
            <div className="grid grid-cols-1 gap-6">
                <section className="animate-kanban-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-2">
                                Filtrar por:
                            </span>
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterStatus === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-md border-transparent'
                                    : 'bg-card border border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary'
                                    }`}
                            >
                                Todos
                            </button>
                            {Object.entries(ENTITY_STATUS).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterStatus(key)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterStatus === key
                                        ? 'bg-primary text-primary-foreground shadow-md border-transparent'
                                        : 'bg-card border border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary'
                                        }`}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>

                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
                            Visualizando {paginatedEpics.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredEpics.length)} de {filteredEpics.length} resultados
                        </p>
                    </div>

                    <Card className="border-border/40 overflow-hidden bg-card shadow-lg shadow-black/5 rounded-2xl p-0">
                        <CardContent className="p-0 bg-muted">
                            <div className="overflow-x-auto">
                                {/* Una sola tabla para los tres niveles: la primera columna lleva el
                                    nombre del Epic, del Feature o del Bug (según la sangría) y las
                                    demás son comunes. Layout fijo para que los anchos no bailen al
                                    desplegar filas. */}
                                <Table className="table-fixed min-w-[1000px]">
                                    <TableHeader className="bg-muted border-b-2 border-border">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 pl-8 h-16">
                                                Elemento
                                            </TableHead>
                                            <TableHead
                                                className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16"
                                                style={{ width: TREE_STATUS_WIDTH }}
                                            >
                                                Estado
                                            </TableHead>
                                            <TableHead
                                                className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 text-center"
                                                style={{ width: TREE_DATE_WIDTH }}
                                            >
                                                Fecha de Creación
                                            </TableHead>
                                            <TableHead
                                                className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 text-center"
                                                style={{ width: TREE_ACTIONS_WIDTH }}
                                            >
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-card">
                                        {paginatedEpics.map((epic, index) => {
                                            const isExpanded = expandedEpicIds.has(epic.id);
                                            return (
                                                <Fragment key={epic.id}>
                                                    <TableRow
                                                        className={`border-b border-border/60 animate-kanban-fade-in group transition-colors ${isExpanded ? 'bg-muted/10' : 'hover:bg-muted/10'}`}
                                                        style={{ animationDelay: `${150 + index * 30}ms` }}
                                                    >
                                                        <TableCell className="pl-5 py-5">
                                                            <div className="flex items-center gap-2.5">
                                                                {/* El control de desplegar abre el árbol, así que va
                                                                    a la izquierda del ícono, no en Acciones. */}
                                                                <button
                                                                    onClick={() => handleExpandToggle(epic.id)}
                                                                    title={isExpanded ? 'Ocultar features' : 'Ver features'}
                                                                    className={`flex items-center justify-center w-6 h-6 shrink-0 rounded-lg transition-colors ${isExpanded ? 'text-primary bg-primary/10' : 'text-muted-foreground/50 hover:text-primary hover:bg-primary/10'}`}
                                                                >
                                                                    {isExpanded
                                                                        ? <ChevronDown size={16} strokeWidth={2.5} />
                                                                        : <ChevronRight size={16} strokeWidth={2.5} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleExpandToggle(epic.id)}
                                                                    className="flex items-center gap-3 text-left min-w-0"
                                                                >
                                                                    <div
                                                                        className="flex items-center justify-center w-9 h-9 rounded-xl text-white text-[10px] font-black shadow-sm shrink-0"
                                                                        style={{ backgroundColor: getAvatarColor(epic.name) }}
                                                                    >
                                                                        {getInitials(epic.name)}
                                                                    </div>
                                                                    <span className="text-sm font-bold text-foreground truncate">
                                                                        {epic.name}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <StatusDropdown
                                                                value={epic.status}
                                                                map={ENTITY_STATUS}
                                                                onChange={(status) => updateEpicStatus(epic.id, status)}
                                                                readOnly={!canManage}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-muted-foreground/80">
                                                            {formatLocalDate(epic.created_at)}
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <RowActions
                                                                canManage={canManage}
                                                                entityLabel="epic"
                                                                addLabel="Agregar feature"
                                                                addText="Feature"
                                                                onAdd={() => handleAddFeature(epic.id)}
                                                                onEdit={() => { setFormEpic(epic); setFormOpen(true); }}
                                                                onDelete={() => setDeletingEpic(epic)}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Features y bugs son filas de esta misma tabla. */}
                                                    {isExpanded && (
                                                        <EpicExpandedDetail
                                                            epicId={epic.id}
                                                            canManage={canManage}
                                                            profilesById={profilesById}
                                                            openFeatureForm={addFeatureFor === epic.id}
                                                            onFeatureFormOpened={() => setAddFeatureFor(null)}
                                                            onContentChange={() => setChildCount((n) => n + 1)}
                                                        />
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-8 py-4 bg-card border-t border-border/60">
                                    <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                        Página <span className="text-foreground">{currentPage}</span> de <span className="text-foreground">{totalPages}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0 rounded-xl border-border/60 hover:bg-muted transition-all active:scale-95 disabled:opacity-30"
                                        >
                                            <ChevronLeft size={16} />
                                        </Button>

                                        <div className="flex items-center gap-1 mx-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter((page) => {
                                                    if (totalPages <= 7) return true;
                                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                                })
                                                .map((page, index, array) => {
                                                    const showDots = index > 0 && page - array[index - 1] > 1;
                                                    return (
                                                        <div key={page} className="flex items-center gap-1">
                                                            {showDots && <span className="text-muted-foreground/40 text-[10px] px-1">...</span>}
                                                            <button
                                                                onClick={() => goToPage(page)}
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
                                            onClick={() => goToPage(Math.min(currentPage + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0 rounded-xl border-border/60 hover:bg-muted transition-all active:scale-95 disabled:opacity-30"
                                        >
                                            <ChevronRight size={16} />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {filteredEpics.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-kanban-fade-in bg-muted/5">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/20 text-muted-foreground mb-4">
                                        <Search className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-base font-bold text-foreground">
                                        {epics.length === 0 ? 'Todavía no hay epics' : 'No se encontraron resultados'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                                        {epics.length === 0
                                            ? 'Crea tu primer Epic para empezar a organizar features y bugs.'
                                            : 'Intenta ajustar los términos de búsqueda o los filtros aplicados.'}
                                    </p>
                                    {epics.length > 0 && (
                                        <Button
                                            variant="outline"
                                            className="mt-6 rounded-xl text-xs font-bold"
                                            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                                        >
                                            Limpiar filtros
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>

            {/* ── Métricas ───────────────────────── */}
            <section className="animate-kanban-fade-in space-y-6" style={{ animationDelay: '200ms' }}>
                <div className="border-b border-border/40 pb-4">
                    <h2 className="text-lg font-black text-foreground tracking-tight">Resumen</h2>
                </div>
                <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <StatCard icon={Layers} label="Total de Epics" value={stats.epics} delay={0} color="oklch(0.58 0.20 277)" />
                    <StatCard icon={GitBranch} label="Total de Features" value={stats.features} delay={60} color="oklch(0.55 0.15 200)" />
                    <StatCard icon={BugIcon} label="Total de Bugs" value={stats.bugs} delay={120} color="oklch(0.70 0.16 60)" />
                    <StatCard icon={AlertCircle} label="Bugs Abiertos" value={stats.openBugs} delay={180} color="oklch(0.58 0.22 25)" />
                </div>
            </section>

            <EpicFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                epic={formEpic}
                onSave={handleSaveEpic}
            />

            <ConfirmDeleteModal
                isOpen={Boolean(deletingEpic)}
                onClose={() => setDeletingEpic(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title={`¿Eliminar "${deletingEpic?.name}"?`}
                description="Se eliminarán también todos sus features y bugs. Esta acción no se puede deshacer."
            />
        </div>
    );
}
