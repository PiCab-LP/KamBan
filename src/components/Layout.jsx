import { Outlet, Link, useLocation } from 'react-router-dom';
import { BarChart3, Kanban, ShieldCheck, StickyNote, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/kanban', icon: Kanban, label: 'Tablero Kanban' },
  { to: '/notes', icon: StickyNote, label: 'Notas del Equipo' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      <aside className="flex flex-col shrink-0 w-[260px] bg-sidebar border-r border-sidebar-border shadow-sm">
        {/* Logo */}
        <div className="p-8">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary shadow-sm transition-transform group-hover:scale-105 duration-300">
              <ShieldCheck size={18} strokeWidth={2.5} className="text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold tracking-tight leading-none text-sidebar-foreground">
                QANBAN
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    group flex w-full items-center gap-3.5 px-4 py-3 text-xs font-bold transition-all duration-300 ease-out no-underline rounded-xl
                    ${isActive
                      ? 'bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 text-white shadow-lg shadow-sidebar-primary/20 translate-x-1'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-1'
                    }
                  `}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors ${isActive ? 'text-white' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground'}`}
                  />
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer: theme toggle + logout */}
        <div className="flex items-center justify-between p-4">
          <ThemeToggle />
          <Link
            to="/login"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-muted px-3.5 text-xs font-bold text-sidebar-foreground/60 transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut size={16} />
            Cerrar sesión
          </Link>
        </div>

      </aside>

      <main className="flex-1 overflow-hidden flex flex-col bg-background/50 backdrop-blur-3xl relative">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10" />
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="animate-kanban-fade-in min-h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
