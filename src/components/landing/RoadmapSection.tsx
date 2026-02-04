import { Badge } from '@/components/ui/badge';
import { Check, Clock, Calendar, Rocket } from 'lucide-react';

const phases = [
  {
    number: 1,
    title: 'Trading Experience + Rewards',
    status: 'live',
    statusLabel: 'Live',
    icon: Check,
  },
  {
    number: 2,
    title: 'More Markets + Advanced Charting',
    status: 'coming',
    statusLabel: 'Coming Soon',
    icon: Clock,
  },
  {
    number: 3,
    title: 'Exchange Infrastructure Expansion',
    status: 'planned',
    statusLabel: 'Planned',
    icon: Calendar,
  },
  {
    number: 4,
    title: 'Full KieDex Exchange Launch',
    status: 'future',
    statusLabel: 'Future',
    icon: Rocket,
  },
];

export function RoadmapSection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Roadmap
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Our journey to building a full crypto exchange
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line (mobile) / Horizontal line (desktop) */}
          <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-border" />
          <div className="md:hidden absolute top-0 bottom-0 left-6 w-0.5 bg-border" />

          <div className="grid md:grid-cols-4 gap-6 md:gap-4">
            {phases.map((phase, index) => (
              <div 
                key={phase.number}
                className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-0"
              >
                {/* Circle */}
                <div 
                  className={`
                    relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full 
                    ${phase.status === 'live' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card border-2 border-border'
                    }
                  `}
                >
                  <phase.icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="md:text-center md:mt-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Phase {phase.number}
                  </p>
                  <h3 className="text-sm md:text-base font-semibold mb-2">
                    {phase.title}
                  </h3>
                  <Badge 
                    variant={phase.status === 'live' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {phase.statusLabel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
