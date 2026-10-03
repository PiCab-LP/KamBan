import { Fragment, useState } from 'react';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Plus, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Campos cortos: van como columnas de la tabla.
 * Los de texto largo viven en el detalle expandido (DETAIL_FIELDS) para no
 * inflar el ancho; solo esos cuatro sumaban ~900px.
 */
const COLUMNS = [
    { key: 'case_id', label: 'ID Caso', width: 110 },
    { key: 'suite', label: 'Suite', width: 170 },
    { key: 'application', label: 'Aplicación', width: 160 },
    { key: 'module', label: 'Módulo / Pantalla', width: 180 },
    { key: 'title', label: 'Título', width: 320 },
    { key: 'type', label: 'Tipo', width: 140 },
    { key: 'priority', label: 'Prioridad', width: 130 },
    { key: 'required_role', label: 'Rol Requerido', width: 170 },
    { key: 'company', label: 'Compañía', width: 160 },
    { key: 'automatable', label: 'Automatizable', width: 140 },
    { key: 'status', label: 'Estado del Caso', width: 160 },
];

const DETAIL_FIELDS = [
    { key: 'preconditions', label: 'Precondiciones' },
    { key: 'steps', label: 'Pasos' },
    { key: 'expected_result', label: 'Resultado Esperado' },
    { key: 'test_data', label: 'Datos de Prueba' },
];

/**
 * Fila de ejemplo para poder evaluar la estructura antes de que existan casos
 * reales. Se elimina en cuanto se conecte la tabla a la base de datos.
 */
const EXAMPLE_ROW = {
    case_id: 'TC-001',
    suite: 'Autenticación',
    application: 'Portal Web',
    module: 'Login',
    title: 'Inicio de sesión con credenciales válidas',
    type: 'Funcional',
    priority: 'Alta',
    required_role: 'Usuario registrado',
    company: '—',
    automatable: 'Sí',
    status: 'Diseñado',
    preconditions: 'El usuario existe en la base de datos y su cuenta está activa.\nEl portal está disponible.',
    steps: '1. Abrir la pantalla de login.\n2. Ingresar correo y contraseña válidos.\n3. Pulsar "Ingresar".',
    expected_result: 'El usuario accede al panel principal y se muestra su nombre en la barra superior.',
    test_data: 'Correo: qa.demo@empresa.com\nContraseña: Qa#Demo2026',
};

function TestCaseExpandedDetail({ testCase }) {
    return (
        <div className="bg-muted/10 border-t border-border/40">
            {/* sticky left-0: la celda abarca todo el ancho de la tabla, así que sin
                esto el detalle queda a la izquierda y se pierde al hacer scroll. */}
            <div className="sticky left-0 w-[min(1024px,100%)] px-8 py-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {DETAIL_FIELDS.map((field) => (
                        <div key={field.key} className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                {field.label}
                            </h4>
                            <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-line">
                                {testCase[field.key] || '—'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function TestCases() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        // Sin tope de ancho: con 11 columnas, cada píxel cuenta.
        <div className="p-5 lg:p-6 w-full space-y-6">

            <div className="animate-kanban-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-foreground tracking-tight">
                            Casos de Prueba
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Diseño y ejecución de casos de prueba de QA.
                        </p>
                    </div>
                    <Button
                        disabled
                        title="Pendiente de definir los valores de cada campo"
                        className="gap-2 text-[13px] font-bold px-6 h-11 rounded-2xl shadow-lg shadow-primary/20"
                        style={{ background: 'var(--primary)', color: 'white' }}
                    >
                        <Plus size={18} strokeWidth={3} />
                        Nuevo Caso
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-muted/20">
                <FlaskConical size={14} className="text-muted-foreground/60 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                    Estructura de ejemplo. Falta definir los valores seleccionables de cada campo
                    antes de conectar la tabla a la base de datos.
                </p>
            </div>

            <section className="animate-kanban-slide-up" style={{ animationDelay: '100ms' }}>
                <Card className="border-border/40 overflow-hidden bg-card shadow-lg shadow-black/5 rounded-2xl p-0">
                    <CardContent className="p-0 bg-muted">
                        {/* Table ya trae su propio contenedor con overflow-x-auto;
                            envolverlo en otro anida dos scrolls y la rueda no engancha. */}
                        <Table>
                            <TableHeader className="bg-muted border-b-2 border-border">
                                <TableRow className="hover:bg-transparent border-none">
                                    {/* El control de detalle va primero: al final obligaría a
                                        cruzar toda la tabla para abrirlo. */}
                                    <TableHead className="h-16 pl-6" style={{ width: 48, minWidth: 48 }} />
                                    {COLUMNS.map((column) => (
                                        <TableHead
                                            key={column.key}
                                            className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80 h-16 whitespace-nowrap"
                                            style={{ width: column.width, minWidth: column.width }}
                                        >
                                            {column.label}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-card">
                                <Fragment>
                                    <TableRow className={`border-b border-border/60 transition-colors ${isExpanded ? 'bg-muted/10' : 'hover:bg-muted/10'}`}>
                                        <TableCell className="py-4 pl-6">
                                            <button
                                                onClick={() => setIsExpanded((v) => !v)}
                                                title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${isExpanded ? 'text-primary bg-primary/10' : 'text-muted-foreground/50 hover:text-primary hover:bg-primary/5'}`}
                                            >
                                                {isExpanded
                                                    ? <ChevronUp size={16} strokeWidth={2.5} />
                                                    : <ChevronDown size={16} strokeWidth={2.5} />}
                                            </button>
                                        </TableCell>
                                        {COLUMNS.map((column, index) => (
                                            <TableCell
                                                key={column.key}
                                                className={`py-4 text-[13px] text-foreground/90 ${index === 0 ? 'font-bold' : ''}`}
                                            >
                                                {EXAMPLE_ROW[column.key]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableCell colSpan={COLUMNS.length + 1} className="p-0">
                                                <TestCaseExpandedDetail testCase={EXAMPLE_ROW} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
