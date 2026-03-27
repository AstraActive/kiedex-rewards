import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Clock, Calendar, Rocket, Zap } from 'lucide-react';
import { useRoadmap, type RoadmapPhase, type RoadmapStatus } from '@/hooks/useRoadmap';

const COLS = 4;
const CIRCLE_R = 20; // px — half of circle height (h-10 = 40px)
const CURVE_R = 28;  // border-radius for the river curves

const statusConfig: Record<RoadmapStatus, {
  icon: React.ElementType;
  circleClass: string;
  badgeVariant: 'default' | 'secondary';
  badgeClass: string;
  label: string;
}> = {
  completed:   { icon: CheckCheck, circleClass: 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400', badgeVariant: 'secondary', badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', label: 'Completed' },
  live:        { icon: Check,      circleClass: 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]', badgeVariant: 'default', badgeClass: '', label: 'Live' },
  in_progress: { icon: Zap,        circleClass: 'bg-blue-500/20 border-2 border-blue-500 text-blue-400', badgeVariant: 'secondary', badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', label: 'In Progress' },
  coming:      { icon: Clock,      circleClass: 'bg-card border-2 border-border text-muted-foreground', badgeVariant: 'secondary', badgeClass: '', label: 'Coming Soon' },
  planned:     { icon: Calendar,   circleClass: 'bg-card border-2 border-border text-muted-foreground', badgeVariant: 'secondary', badgeClass: '', label: 'Planned' },
  future:      { icon: Rocket,     circleClass: 'bg-card border-2 border-border text-muted-foreground', badgeVariant: 'secondary', badgeClass: '', label: 'Future' },
};

// ── Desktop phase cell ───────────────────────────────────────────────────────
function PhaseCell({ phase }: { phase: RoadmapPhase }) {
  const cfg = statusConfig[phase.status] ?? statusConfig.planned;
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col items-center text-center px-2 pb-6">
      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.circleClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground mt-3 mb-1">Phase {phase.phase_number}</p>
      <h3 className="text-sm font-semibold mb-2 leading-snug">{phase.title}</h3>
      {phase.description && <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>}
      <Badge variant={cfg.badgeVariant} className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
    </div>
  );
}

// ── Mobile phase row ─────────────────────────────────────────────────────────
function PhaseRow({ phase }: { phase: RoadmapPhase }) {
  const cfg = statusConfig[phase.status] ?? statusConfig.planned;
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-4 pl-1">
      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.circleClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="pt-1 pb-8">
        <p className="text-xs text-muted-foreground mb-0.5">Phase {phase.phase_number}</p>
        <h3 className="text-sm font-semibold mb-1 leading-snug">{phase.title}</h3>
        {phase.description && <p className="text-xs text-muted-foreground mb-1.5">{phase.description}</p>}
        <Badge variant={cfg.badgeVariant} className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
      </div>
    </div>
  );
}

// ── Desktop snake ────────────────────────────────────────────────────────────
// Key insight: connector is positioned WITHIN its row div (not after it).
// top: CIRCLE_R = starts at the row's circle center (the horizontal line).
// bottom: -CIRCLE_R = extends 20px BELOW the row = exactly the next row's circle center.
// This creates a perfectly aligned river curve connecting row N to row N+1.
function DesktopSnake({ phases }: { phases: RoadmapPhase[] }) {
  const rows: RoadmapPhase[][] = [];
  for (let i = 0; i < phases.length; i += COLS) rows.push(phases.slice(i, i + COLS));

  const halfColPct = 100 / (COLS * 2); // 12.5% for 4 cols

  return (
    <div className="hidden md:block">
      {rows.map((row, rowIdx) => {
        const isReversed = rowIdx % 2 !== 0;
        const isLastRow = rowIdx === rows.length - 1;
        const displayRow = isReversed ? [...row].reverse() : row;
        // Pad incomplete last row to maintain grid alignment
        const cells = [...displayRow, ...Array(COLS - displayRow.length).fill(null)];

        return (
          // overflow-visible so the snake connector can extend below
          <div key={rowIdx} className="relative overflow-visible">
            {/* Horizontal line — connects circle centers (12.5% to 87.5% for 4 cols) */}
            <div
              className="absolute h-0.5 bg-border"
              style={{ top: CIRCLE_R, left: `${halfColPct}%`, right: `${halfColPct}%` }}
            />

            {/* Phase cells */}
            <div className="grid grid-cols-4">
              {cells.map((phase, i) =>
                phase ? <PhaseCell key={phase.id} phase={phase} /> : <div key={`pad-${i}`} />
              )}
            </div>

            {/* Snake connector — aligned to circle centers, not row edges */}
            {!isLastRow && (
              isReversed ? (
                // Left-side curve: ╔ shaped, connects reversed row → forward row
                <div
                  className="absolute border-t-2 border-l-2 border-b-2 border-border"
                  style={{
                    top: CIRCLE_R,          // starts at THIS row's circle center
                    bottom: -CIRCLE_R,      // ends at NEXT row's circle center
                    left: 0,
                    width: `${halfColPct}%`,
                    borderTopLeftRadius: CURVE_R,
                    borderBottomLeftRadius: CURVE_R,
                  }}
                />
              ) : (
                // Right-side curve: ╗ shaped, connects forward row → reversed row
                <div
                  className="absolute border-t-2 border-r-2 border-b-2 border-border"
                  style={{
                    top: CIRCLE_R,          // starts at THIS row's circle center
                    bottom: -CIRCLE_R,      // ends at NEXT row's circle center
                    right: 0,
                    width: `${halfColPct}%`,
                    borderTopRightRadius: CURVE_R,
                    borderBottomRightRadius: CURVE_R,
                  }}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile vertical timeline ─────────────────────────────────────────────────
// Single continuous line at left-5 (20px = circle center), circles at z-10.
function MobileTimeline({ phases }: { phases: RoadmapPhase[] }) {
  return (
    <div className="md:hidden relative pl-0">
      {/* Continuous line from first to last circle center */}
      <div className="absolute left-5 top-5 w-0.5 bg-border" style={{ bottom: CIRCLE_R }} />
      <div className="space-y-0">
        {phases.map(phase => <PhaseRow key={phase.id} phase={phase} />)}
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="hidden md:grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3 pb-6">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="h-2.5 w-12 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
            <div className="space-y-2 pt-1">
              <div className="h-2.5 w-12 rounded bg-muted" />
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export function RoadmapSection() {
  const { data: phases = [], isLoading } = useRoadmap();
  if (!isLoading && phases.length === 0) return null;

  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Roadmap</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Our journey to building a full crypto exchange
          </p>
        </div>

        {isLoading ? <Skeleton /> : (
          <>
            <DesktopSnake phases={phases} />
            <MobileTimeline phases={phases} />
          </>
        )}
      </div>
    </section>
  );
}
