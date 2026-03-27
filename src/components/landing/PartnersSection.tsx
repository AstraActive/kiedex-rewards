import { usePartners, type Partner } from '@/hooks/usePartners';
import { Handshake } from 'lucide-react';

// ── Skeleton ─────────────────────────────────────────────────────────────────
function PartnerSkeleton() {
  return (
    <div className="w-[160px] h-[90px] rounded-xl bg-card/40 border border-border/40 animate-pulse shrink-0" />
  );
}

// ── Single card: image fills card, hover shows overlay ───────────────────────
function PartnerCard({ partner }: { partner: Partner }) {
  const card = (
    <div className="group relative w-[160px] h-[90px] shrink-0 rounded-xl overflow-hidden border border-border/40 cursor-pointer">
      {/* Full-bleed logo image */}
      <img
        src={partner.logo_url}
        alt={partner.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = 'none';
          if (el.parentElement) el.parentElement.style.background = 'hsl(var(--muted))';
        }}
      />

      {/* Hover overlay — full card coverage, fades in */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3
                      bg-black/85 backdrop-blur-sm
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-300 ease-out">
        <p className="text-sm font-bold text-foreground text-center leading-tight line-clamp-1">
          {partner.name}
        </p>
        {partner.description && (
          <p className="text-[11px] text-primary/80 text-center leading-tight line-clamp-2">
            {partner.description}
          </p>
        )}
        {partner.website_url && (
          <span className="mt-1 text-[10px] text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
            Visit ↗
          </span>
        )}
      </div>
    </div>
  );

  if (partner.website_url) {
    return (
      <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }
  return card;
}

// ── Marquee row — hover on the row pauses the animation ──────────────────────
function MarqueeRow({ partners, reverse = false }: { partners: Partner[]; reverse?: boolean }) {
  const doubled = [...partners, ...partners];
  const duration = `${Math.max(20, partners.length * 6)}s`;

  return (
    <div className="overflow-hidden group/row">
      <div
        className={`flex gap-4 w-max
          ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}
          group-hover/row:[animation-play-state:paused]`}
        style={{ animationDuration: duration }}
      >
        {doubled.map((p, i) => (
          <PartnerCard key={`${p.id}-${i}`} partner={p} />
        ))}
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export function PartnersSection() {
  const { data: partners = [], isLoading } = usePartners();

  if (!isLoading && partners.length === 0) return null;

  const useMarquee = partners.length >= 4;

  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Handshake className="h-5 w-5 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">Our Partners</h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Trusted by leading projects across the ecosystem
          </p>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="flex justify-center gap-4 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => <PartnerSkeleton key={i} />)}
          </div>
        )}

        {/* Marquee — hover pauses, edge fade */}
        {!isLoading && useMarquee && (
          <div
            className="space-y-4 overflow-hidden"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
          >
            <MarqueeRow partners={partners} />
            {partners.length >= 7 && <MarqueeRow partners={partners} reverse />}
          </div>
        )}

        {/* Static grid for fewer than 4 */}
        {!isLoading && !useMarquee && (
          <div className="flex flex-wrap justify-center gap-4">
            {partners.map((p) => <PartnerCard key={p.id} partner={p} />)}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/40 mt-8">
          Interested in partnering?{' '}
          <a href="mailto:partners@kiedex.com" className="hover:text-primary transition-colors underline underline-offset-2">
            Get in touch
          </a>
        </p>
      </div>
    </section>
  );
}
