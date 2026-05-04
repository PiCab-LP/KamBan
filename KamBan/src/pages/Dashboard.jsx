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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

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
            console.error('Error al cargar compañías:', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Compañías</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Cargando empresas...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Creada el</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((company) => (
                                    <TableRow key={company.id}>
                                        <TableCell className="font-medium">{company.name}</TableCell>
                                        <TableCell>{company.status}</TableCell>
                                        <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}