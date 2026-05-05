import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Columns } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-6 flex flex-col gap-6">
        <h1 className="text-xl font-bold">KamBan App</h1>
        <nav className="flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link to="/kanban" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
            <Columns size={20} />
            Tablero Kanban
          </Link>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-auto">
        <Outlet /> 
      </main>
    </div>
  );
}