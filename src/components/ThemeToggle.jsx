import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Cambiar modo oscuro"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-9 w-16 shrink-0 items-center rounded-lg border border-border bg-muted p-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className
      )}
    >
      <Sun size={16} className="absolute left-2 text-muted-foreground/50" />
      <Moon size={16} className="absolute right-2 text-muted-foreground/50" />
      <span
        className={cn(
          'relative z-10 flex size-7 items-center justify-center rounded-md bg-background text-primary shadow-sm transition-transform duration-200',
          isDark ? 'translate-x-7' : 'translate-x-0'
        )}
      >
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </button>
  );
}
