import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Clock, Calendar, Rocket, Zap } from 'lucide-react';
import { useRoadmap, type RoadmapPhase, type RoadmapStatus } from '@/hooks/useRoadmap';

const COLS = 4; // phases per row on desktop

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

// ── Phase cell (desktop) ─────────────────────────────────────────────────────
function PhaseCell({ phase }: { phase: RoadmapPhase }) {
  const cfg = statusConfig[phase.status] ?? statusConfig.planned;
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col items-center text-center px-2">
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

// ── Phase row (mobile) ───────────────────────────────────────────────────────
function PhaseRow({ phase }: { phase: RoadmapPhase }) {
  const cfg = statusConfig[phase.status] ?? statusConfig.planned;
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-4 pl-2">
      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.circleClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="pt-1 pb-6">
        <p className="text-xs text-muted-foreground mb-0.5">Phase {phase.phase_number}</p>
        <h3 className="text-sm font-semibold mb-1 leading-snug">{phase.title}</h3>
        {phase.description && <p className="text-xs text-muted-foreground mb-1.5">{phase.description}</p>}
        <Badge variant={cfg.badgeVariant} className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="hidden md:grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="h-2.5 w-12 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Desktop snake ────────────────────────────────────────────────────────────
// Splits into rows of COLS, alternates L→R / R→L, curves connect them like a river.
function DesktopSnake({ phases }: { phases: RoadmapPhase[] }) {
  const rows: RoadmapPhase[][] = [];
  for (let i = 0; i < phases.length; i += COLS) rows.push(phases.slice(i, i + COLS));

  // Half-column width as a percentage: where the line starts/ends on each edge
  const halfColPct = 100 / (COLS * 2); // 12.5% for 4 cols

  return (
    <div className="hidden md:block space-y-0">
      {rows.map((row, rowIdx) => {
        const isReversed = rowIdx % 2 !== 0;
        const isLastRow = rowIdx === rows.length - 1;
        const displayRow = isReversed ? [...row].reverse() : row;

        // Pad row to full COLS width so grid alignment stays consistent
        const padded = [...displayRow, ...Array(COLS - displayRow.length).fill(null)];

        return (
          <div key={rowIdx}>
            {/* ── Phase row ── */}
            <div className="relative">
              {/* Horizontal connector line — from first to last circle center */}
              <div
                className="absolute top-5 h-0.5 bg-border"
                style={{ left: `${halfColPct}%`, right: `${halfColPct}%` }}
              />
              <div className="grid grid-cols-4">
                {padded.map((phase, i) =>
                  phase ? <PhaseCell key={phase.id} phase={phase} /> : <div key={`pad-${i}`} />
                )}
              </div>
            </div>

            {/* ── Snake curve connector ── */}
            {!isLastRow && (
              <div className="relative h-14">
                {isReversed ? (
                  // Left-side curve: connects right-to-left row → left-to-right row
                  <div
                    className="absolute inset-y-0 border-t-2 border-l-2 border-b-2 border-border rounded-tl-[32px] rounded-bl-[32px]"
                    style={{ left: 0, width: `${halfColPct}%` }}
                  />
                ) : (
                  // Right-side curve: connects left-to-right row → right-to-left row
                  <div
                    className="absolute inset-y-0 border-t-2 border-r-2 border-b-2 border-border rounded-tr-[32px] rounded-br-[32px]"
                    style={{ right: 0, width: `${halfColPct}%` }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile vertical timeline ─────────────────────────────────────────────────
// Single continuous line on the left with all circles on top of it.
function MobileTimeline({ phases }: { phases: RoadmapPhase[] }) {
  return (
    <div className="md:hidden relative">
      {/* Continuous vertical line */}
      <div className="absolute left-7 top-5 bottom-5 w-0.5 bg-border" />
      <div>
        {phases.map(phase => <PhaseRow key={phase.id} phase={phase} />)}
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

        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            <DesktopSnake phases={phases} />
            <MobileTimeline phases={phases} />
          </>
        )}
      </div>
    </section>
  );
}
