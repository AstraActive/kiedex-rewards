import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Clock, Calendar, Rocket, Zap } from 'lucide-react';
import { useRoadmap, type RoadmapPhase, type RoadmapStatus } from '@/hooks/useRoadmap';

const COLS = 4;
const CIRCLE_R  = 20;  // half of h-10 circle (40px), used for connector alignment
const CURVE_R   = 40;  // border-radius for river curves — larger = smoother
const SNAKE_GAP = 40;  // extra px below each row so rows have breathing room

const statusConfig: Record<RoadmapStatus, {
  icon: React.ElementType;
  circleClass: string;
  badgeVariant: 'default' | 'secondary';
  badgeClass: string;
  label: string;
}> = {
  completed:   { icon: CheckCheck, circleClass: 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400', badgeVariant: 'secondary', badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', label: 'Completed' },
  live:        { icon: Check,      circleClass: 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]', badgeVariant: 'default', badgeClass: '', label: 'Live' },
  in_progress: { icon: Zap,        circleClass: 'bg-blue-500/20 border-2 border-blue-500 text-blue-400',          badgeVariant: 'secondary', badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', label: 'In Progress' },
  coming:      { icon: Clock,      circleClass: 'bg-card border-2 border-border text-muted-foreground',            badgeVariant: 'secondary', badgeClass: '', label: 'Coming Soon' },
  planned:     { icon: Calendar,   circleClass: 'bg-card border-2 border-border text-muted-foreground',            badgeVariant: 'secondary', badgeClass: '', label: 'Planned' },
  future:      { icon: Rocket,     circleClass: 'bg-card border-2 border-border text-muted-foreground',            badgeVariant: 'secondary', badgeClass: '', label: 'Future' },
};

// ── Desktop phase cell — fixed 25% width ─────────────────────────────────────
function PhaseCell({ phase }: { phase: RoadmapPhase }) {
  const cfg = statusConfig[phase.status] ?? statusConfig.planned;
  const Icon = cfg.icon;
  return (
    <div className="group w-1/4 flex flex-col items-center text-center px-2 pb-12 shrink-0 cursor-default">
      {/* Circle — scale + glow on hover */}
      <div className={`
        relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full
        transition-all duration-300
        group-hover:scale-125 group-hover:shadow-[0_0_16px_4px_hsl(var(--primary)/0.35)]
        ${cfg.circleClass}
      `}>
        <Icon className="h-4 w-4" />
      </div>
      {/* Text — slides down slightly, brightens on hover */}
      <div className="transition-transform duration-300 group-hover:translate-y-1">
        <p className="text-xs text-muted-foreground mt-3 mb-1 transition-colors group-hover:text-foreground/70">Phase {phase.phase_number}</p>
        <h3 className="text-sm font-semibold mb-2 leading-snug transition-colors group-hover:text-primary">{phase.title}</h3>
        {phase.description && <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>}
        <Badge variant={cfg.badgeVariant} className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
      </div>
    </div>
  );
}

// ── Mobile phase row ──────────────────────────────────────────────────────────
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

// ── Desktop snake ─────────────────────────────────────────────────────────────
function DesktopSnake({ phases }: { phases: RoadmapPhase[] }) {
  const rows: RoadmapPhase[][] = [];
  for (let i = 0; i < phases.length; i += COLS) rows.push(phases.slice(i, i + COLS));

  const halfColPct = 100 / (COLS * 2); // 12.5 for 4-col

  return (
    <div className="hidden md:block">
      {rows.map((row, rowIdx) => {
        const isReversed = rowIdx % 2 !== 0;
        const isLastRow  = rowIdx === rows.length - 1;
        const n = row.length;
        const spacers = Array(COLS - n).fill(null);

        // ── Horizontal line span ───────────────────────────────────────────
        // For reversed rows, phases land on the RIGHT (flex-row-reverse).
        //   leftmost visible circle center:  (COLS-n)*100/COLS + halfColPct  %  from left
        //   rightmost visible circle center: halfColPct                       %  from right
        // For the non-last row that connects to a curve, extend the line all
        // the way to the connecting edge (0%) so it overlaps the curve's
        // border-top and there's no rendering gap.
        let lineLeft: string;
        let lineRight: string;

        if (isReversed) {
          // Phases on right side
          lineLeft  = isLastRow
            ? `${(COLS - n) * (100 / COLS) + halfColPct}%`
            : '0%'; // extend to left edge to overlap left-side connector
          lineRight = `${halfColPct}%`;
        } else {
          // Phases on left side
          lineLeft  = `${halfColPct}%`;
          lineRight = isLastRow
            ? `${(COLS - n) * (100 / COLS) + halfColPct}%`
            : '0%'; // extend to right edge to overlap right-side connector
        }

        return (
          <div key={rowIdx} className="relative overflow-visible">

            {/* Horizontal line — spans between circle centers (or to edge for connector overlap) */}
            <div
              className="absolute h-0.5 bg-border"
              style={{ top: CIRCLE_R, left: lineLeft, right: lineRight }}
            />

            {/* Phase cells — flex-row-reverse preserves natural phase order on right side */}
            <div className={`flex ${isReversed ? 'flex-row-reverse' : 'flex-row'} w-full`}>
              {row.map(phase => <PhaseCell key={phase.id} phase={phase} />)}
              {spacers.map((_, i) => <div key={`s${i}`} className="w-1/4 shrink-0" />)}
            </div>

            {/* Snake connector — from this row's circle center to next row's circle center */}
            {!isLastRow && (
              isReversed ? (
                <div
                  className="absolute border-t-2 border-l-2 border-b-2 border-border"
                  style={{
                    top: CIRCLE_R, bottom: -(CIRCLE_R + SNAKE_GAP),
                    left: 0, width: `${halfColPct}%`,
                    borderTopLeftRadius: CURVE_R, borderBottomLeftRadius: CURVE_R,
                  }}
                />
              ) : (
                <div
                  className="absolute border-t-2 border-r-2 border-b-2 border-border"
                  style={{
                    top: CIRCLE_R, bottom: -(CIRCLE_R + SNAKE_GAP),
                    right: 0, width: `${halfColPct}%`,
                    borderTopRightRadius: CURVE_R, borderBottomRightRadius: CURVE_R,
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

// ── Mobile vertical timeline ──────────────────────────────────────────────────
// Continuous line at left:20px (circle center x), circles at z-10 on top.
function MobileTimeline({ phases }: { phases: RoadmapPhase[] }) {
  return (
    <div className="md:hidden relative pl-0">
      <div className="absolute left-5 top-5 w-0.5 bg-border" style={{ bottom: CIRCLE_R }} />
      <div>
        {phases.map(phase => <PhaseRow key={phase.id} phase={phase} />)}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="hidden md:flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-1/4 flex flex-col items-center gap-3 pb-6">
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

// ── Main section ──────────────────────────────────────────────────────────────
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
