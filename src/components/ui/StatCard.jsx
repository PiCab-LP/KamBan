import { Card, CardContent } from '@/components/ui/card';

export function StatCard({ icon: Icon, label, value, delay = 0, color }) {
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
                        <p className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] truncate w-full mb-1">
                            {label}
                        </p>
                        <p className="text-3xl font-black text-foreground tracking-tight leading-none">{value}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function LoadingSkeleton() {
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
