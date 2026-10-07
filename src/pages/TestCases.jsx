import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FlaskConical, Plus, Folder, FolderOpen, ChevronRight, ChevronLeft, Layers, Loader2,
} from 'lucide-react';
import { useEpics } from '@/hooks/useEpics';
import { useFeatures } from '@/hooks/useFeatures';
import { TestCaseTable } from '@/components/testcases/TestCaseTable';

/** Tarjeta-carpeta clickable para un Epic o un Feature. */
function FolderCard({ onClick, icon: Icon = Folder, iconColor = 'var(--primary)', title, subtitle }) {
    return (
        <button
            onClick={onClick}
            className="group flex items-center gap-3 text-left p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-black/5 transition-all"
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                <Icon size={18} style={{ color: iconColor }} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground/70 truncate">{subtitle}</p>}
            </div>
            <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
        </button>
    );
}

/** Estado vacío centrado, reutilizado en los distintos niveles. */
function EmptyState({ icon: Icon, title, hint }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/20 text-muted-foreground mb-4">
                <Icon className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            {hint && <p className="text-sm text-muted-foreground mt-2 max-w-xs">{hint}</p>}
        </div>
    );
}

function LoadingRow({ label }) {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs font-bold">{label}</span>
        </div>
    );
}

/** Nivel 1: features de un Epic (hook propio para no consultar hasta entrar al Epic). */
function FeatureGrid({ epicId, onSelect }) {
    const { features, loading } = useFeatures(epicId);

    if (loading) return <LoadingRow label="Cargando features..." />;
    if (features.length === 0) {
        return (
            <EmptyState
                icon={Folder}
                title="Este epic no tiene features todavía"
                hint="Crea features en el Backlog de QA para registrar sus casos de prueba."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {features.map((feature) => (
                <FolderCard
                    key={feature.id}
                    icon={Folder}
                    iconColor="var(--primary)"
                    title={feature.name}
                    subtitle={feature.description}
                    onClick={() => onSelect({ id: feature.id, name: feature.name })}
                />
            ))}
        </div>
    );
}

export default function TestCases() {
    const { epics, loading: epicsLoading } = useEpics();
    const [selectedEpic, setSelectedEpic] = useState(null);
    const [selectedFeature, setSelectedFeature] = useState(null);

    const goToEpics = () => { setSelectedEpic(null); setSelectedFeature(null); };
    const goToFeatures = () => setSelectedFeature(null);

    // Nivel activo: derivado del estado.
    const level = selectedFeature ? 'table' : selectedEpic ? 'features' : 'epics';

    return (
        // Sin tope de ancho: con 11 columnas, cada píxel cuenta.
        <div className="p-5 lg:p-6 w-full space-y-6">

            <div className="animate-kanban-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-foreground tracking-tight">
                            Casos de Prueba
                        </h1>
                    </div>
                    {level === 'table' && (
                        <Button
                            disabled
                            title="Pendiente de definir los valores de cada campo"
                            className="gap-2 text-[13px] font-bold px-6 h-11 rounded-2xl shadow-lg shadow-primary/20"
                            style={{ background: 'var(--primary)', color: 'white' }}
                        >
                            <Plus size={18} strokeWidth={3} />
                            Nuevo Caso
                        </Button>
                    )}
                </div>
            </div>

            {/* Breadcrumb + volver. Altura fija (min-h-9) para que el texto no salte
                cuando aparece/desaparece el botón de volver. */}
            <div className="flex items-center gap-3 min-h-9">
                {level !== 'epics' && (
                    <button
                        onClick={level === 'table' ? goToFeatures : goToEpics}
                        title="Volver"
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
                <nav className="flex items-center gap-1.5 text-xs font-bold min-w-0 flex-wrap">
                    <button
                        onClick={goToEpics}
                        className={level === 'epics' ? 'text-foreground' : 'text-muted-foreground hover:text-primary transition-colors'}
                    >
                        Casos de Prueba
                    </button>
                    {selectedEpic && (
                        <>
                            <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />
                            <button
                                onClick={goToFeatures}
                                className={`truncate ${level === 'features' ? 'text-foreground' : 'text-muted-foreground hover:text-primary transition-colors'}`}
                            >
                                {selectedEpic.name}
                            </button>
                        </>
                    )}
                    {selectedFeature && (
                        <>
                            <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />
                            <span className="text-foreground truncate">{selectedFeature.name}</span>
                        </>
                    )}
                </nav>
            </div>

            {/* Nivel 0 — Epics */}
            {level === 'epics' && (
                <section className="animate-kanban-slide-up">
                    {epicsLoading ? (
                        <LoadingRow label="Cargando epics..." />
                    ) : epics.length === 0 ? (
                        <EmptyState
                            icon={Layers}
                            title="Aún no hay epics"
                            hint="Crea epics y features en el Backlog de QA; aquí registrarás sus casos de prueba."
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {epics.map((epic) => (
                                <FolderCard
                                    key={epic.id}
                                    title={epic.name}
                                    onClick={() => setSelectedEpic({ id: epic.id, name: epic.name })}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Nivel 1 — Features del Epic */}
            {level === 'features' && (
                <section className="animate-kanban-slide-up">
                    <div className="flex items-center gap-2 mb-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <FolderOpen size={14} className="text-primary" />
                        Features de {selectedEpic.name}
                    </div>
                    <FeatureGrid epicId={selectedEpic.id} onSelect={setSelectedFeature} />
                </section>
            )}

            {/* Nivel 2 — Tabla de casos del Feature */}
            {level === 'table' && (
                <section className="animate-kanban-slide-up space-y-4">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-muted/20">
                        <FlaskConical size={14} className="text-muted-foreground/60 shrink-0" />
                        <p className="text-[11px] text-muted-foreground">
                            Estructura de ejemplo. Falta definir los valores seleccionables de cada campo
                            antes de conectar la tabla a la base de datos.
                        </p>
                    </div>

                    <Card className="border-border/40 overflow-hidden bg-card shadow-lg shadow-black/5 rounded-2xl p-0">
                        <TestCaseTable />
                    </Card>
                </section>
            )}
        </div>
    );
}
