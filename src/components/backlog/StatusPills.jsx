/** Grupo de pills segmentadas para elegir estado, severidad o prioridad. */
export function StatusPills({ label, map, value, onChange, disabled = false }) {
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {label}
            </p>
            <div className="flex flex-wrap gap-2">
                {Object.entries(map).map(([key, config]) => {
                    const isActive = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(key)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${
                                isActive
                                    ? 'text-white shadow-md'
                                    : 'bg-card border border-border hover:border-primary/50 text-muted-foreground'
                            }`}
                            style={isActive ? { backgroundColor: config.color } : undefined}
                        >
                            {config.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
