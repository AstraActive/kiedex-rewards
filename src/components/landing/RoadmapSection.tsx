import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Clock, Calendar, Rocket, Zap } from 'lucide-react';
import { useRoadmap, type RoadmapPhase, type RoadmapStatus } from '@/hooks/useRoadmap';

// ── Status config — icon, circle style, badge style ─────────────────────────
const statusConfig: Record<RoadmapStatus, {
  icon: React.ElementType;
  circleClass: string;
  badgeVariant: 'default' | 'secondary';
  badgeClass: string;
  label: string;
}> = {
  completed: {
    icon: CheckCheck,
    circleClass: 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400',
    badgeVariant: 'secondary',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    label: 'Completed',
  },
  live: {
    icon: Check,
    circleClass: 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]',
    badgeVariant: 'default',
    badgeClass: '',
    label: 'Live',
  },
  in_progress: {
    icon: Zap,
    circleClass: 'bg-blue-500/20 border-2 border-blue-500 text-blue-400',
    badgeVariant: 'secondary',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    label: 'In Progress',
  },
  coming: {
    icon: Clock,
    circleClass: 'bg-card border-2 border-border text-muted-foreground',
    badgeVariant: 'secondary',
    badgeClass: '',
    label: 'Coming Soon',
  },
  planned: {
    icon: Calendar,
    circleClass: 'bg-card border-2 border-border text-muted-foreground',
    badgeVariant: 'secondary',
    badgeClass: '',
    label: 'Planned',
  },
  future: {
    icon: Rocket,
    circleClass: 'bg-card border-2 border-border text-muted-foreground',
    badgeVariant: 'secondary',
    badgeClass: '',
    label: 'Future',
  },
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
function RoadmapSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="relative">
      <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-border/50" />
      <div className="grid md:grid-cols-4 gap-6 md:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-0 animate-pulse">
            <div className="relative z-10 h-12 w-12 shrink-0 rounded-full bg-card border-2 border-border" />
            <div className="md:text-center md:mt-4 space-y-2 w-full">
              <div className="h-2.5 w-12 rounded bg-muted mx-auto" />
              <div className="h-4 w-32 rounded bg-muted mx-auto" />
              <div className="h-5 w-16 rounded-full bg-muted mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Phase node ───────────────────────────────────────────────────────────────
function PhaseNode({ phase, isLast }: { phase: RoadmapPhase; isLast: boolean }) {
  const cfg = statusConfig[phase.status] ?? statusConfig.planned;
  const Icon = cfg.icon;

  return (
    <div className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-0">
      {/* Mobile connector line */}
      {!isLast && (
        <div className="md:hidden absolute top-12 left-6 bottom-0 w-0.5 bg-border translate-x-[-50%]" />
      )}

      {/* Circle icon */}
      <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${cfg.circleClass}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Text content */}
      <div className="md:text-center md:mt-4">
        <p className="text-xs text-muted-foreground mb-1">
          Phase {phase.phase_number}
        </p>
        <h3 className="text-sm md:text-base font-semibold mb-2 leading-snug">
          {phase.title}
        </h3>
        {phase.description && (
          <p className="text-xs text-muted-foreground mb-2 leading-snug">
            {phase.description}
          </p>
        )}
        <Badge
          variant={cfg.badgeVariant}
          className={`text-xs ${cfg.badgeClass}`}
        >
          {cfg.label}
        </Badge>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export function RoadmapSection() {
  const { data: phases = [], isLoading } = useRoadmap();

  if (!isLoading && phases.length === 0) return null;

  // Dynamic grid columns based on phase count
  const gridCols = phases.length <= 3
    ? `md:grid-cols-${phases.length}`
    : 'md:grid-cols-4';

  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Roadmap</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Our journey to building a full crypto exchange
          </p>
        </div>

        {isLoading ? (
          <RoadmapSkeleton />
        ) : (
          <div className="relative">
            {/* Horizontal connector line (desktop) */}
            <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-border" />

            <div className={`grid ${gridCols} gap-6 md:gap-4`}>
              {phases.map((phase, index) => (
                <PhaseNode
                  key={phase.id}
                  phase={phase}
                  isLast={index === phases.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
