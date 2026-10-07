import { Fragment, useState } from 'react';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
 * reales. Se elimina en cuanto se conecte la tabla a la base de datos; cuando eso
 * pase, cada caso colgará de un Feature (`feature_id`).
 */
const EXAMPLE_ROW = {
    id: 'example',
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

/**
 * Tabla de casos de prueba de un Feature. Hoy es una maqueta: muestra la estructura
 * con una fila de ejemplo. `rows` por defecto es `[EXAMPLE_ROW]`.
 */
export function TestCaseTable({ rows = [EXAMPLE_ROW] }) {
    const [expandedId, setExpandedId] = useState(null);

    return (
        // Table ya trae su propio contenedor con overflow-x-auto; envolverlo en otro
        // anida dos scrolls y la rueda no engancha.
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
                {rows.map((testCase) => {
                    const isOpen = expandedId === testCase.id;
                    return (
                        <Fragment key={testCase.id}>
                            <TableRow className={`border-b border-border/60 transition-colors ${isOpen ? 'bg-muted/10' : 'hover:bg-muted/10'}`}>
                                <TableCell className="py-4 pl-6">
                                    <button
                                        onClick={() => setExpandedId(isOpen ? null : testCase.id)}
                                        title={isOpen ? 'Ocultar detalle' : 'Ver detalle'}
                                        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${isOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground/50 hover:text-primary hover:bg-primary/5'}`}
                                    >
                                        {isOpen
                                            ? <ChevronUp size={16} strokeWidth={2.5} />
                                            : <ChevronDown size={16} strokeWidth={2.5} />}
                                    </button>
                                </TableCell>
                                {COLUMNS.map((column, index) => (
                                    <TableCell
                                        key={column.key}
                                        className={`py-4 text-[13px] text-foreground/90 ${index === 0 ? 'font-bold' : ''}`}
                                    >
                                        {testCase[column.key]}
                                    </TableCell>
                                ))}
                            </TableRow>
                            {isOpen && (
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={COLUMNS.length + 1} className="p-0">
                                        <TestCaseExpandedDetail testCase={testCase} />
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );
}
