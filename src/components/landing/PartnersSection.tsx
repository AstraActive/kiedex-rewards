import { usePartners, type Partner } from '@/hooks/usePartners';
import { ExternalLink, Handshake } from 'lucide-react';

// ── Skeleton loader ──────────────────────────────────────────────────────────
function PartnerSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-card/40 border border-border/40 animate-pulse min-w-[180px]">
      <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-2.5 w-16 rounded bg-muted/60" />
      </div>
    </div>
  );
}

// ── Single partner card ──────────────────────────────────────────────────────
function PartnerCard({ partner }: { partner: Partner }) {
  const inner = (
    <div className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-card/40 border border-border/40 hover:border-primary/40 hover:bg-card/70 transition-all duration-300 min-w-[180px] select-none">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/50 overflow-hidden flex items-center justify-center">
        <img
          src={partner.logo_url}
          alt={partner.name}
          className="h-full w-full object-contain p-1"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
          {partner.name}
        </p>
        {partner.description && (
          <p className="text-xs text-muted-foreground truncate">{partner.description}</p>
        )}
      </div>
      {partner.website_url && (
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary/70 shrink-0 transition-colors ml-auto" />
      )}
    </div>
  );

  if (partner.website_url) {
    return (
      <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

// ── Marquee row (duplicates for seamless infinite scroll) ────────────────────
function MarqueeRow({ partners, reverse = false }: { partners: Partner[]; reverse?: boolean }) {
  const doubled = [...partners, ...partners];
  const duration = `${Math.max(20, partners.length * 5)}s`;
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-3 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
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

  // Hide entirely when no active partners exist (zero-config deploy)
  if (!isLoading && partners.length === 0) return null;

  const useMarquee = partners.length >= 5;

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
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: 5 }).map((_, i) => <PartnerSkeleton key={i} />)}
          </div>
        )}

        {/* Marquee for 5+ partners with edge fade */}
        {!isLoading && useMarquee && (
          <div
            className="space-y-3 overflow-hidden"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
          >
            <MarqueeRow partners={partners} />
            {partners.length >= 8 && <MarqueeRow partners={partners} reverse />}
          </div>
        )}

        {/* Static grid for 1–4 partners */}
        {!isLoading && !useMarquee && (
          <div className="flex flex-wrap justify-center gap-3">
            {partners.map((p) => <PartnerCard key={p.id} partner={p} />)}
          </div>
        )}

        {/* Partnership CTA */}
        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          Interested in partnering?{' '}
          <a
            href="mailto:partners@kiedex.com"
            className="hover:text-primary transition-colors underline underline-offset-2"
          >
            Get in touch
          </a>
        </p>
      </div>
    </section>
  );
}
