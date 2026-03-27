-- Partners table for the landing page Partners section.
-- Admins manage this directly via the Supabase dashboard.

CREATE TABLE IF NOT EXISTS public.partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  logo_url      TEXT NOT NULL,           -- direct image URL (external CDN or Supabase Storage)
  website_url   TEXT,                    -- optional clickable link
  description   TEXT,                    -- short tagline, e.g. "Blockchain Infrastructure"
  display_order INT NOT NULL DEFAULT 0,  -- lower = shown first
  is_active     BOOLEAN NOT NULL DEFAULT true,  -- false = hidden without deleting
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Public read: anyone (including unauthenticated) can see active partners on the landing page
CREATE POLICY "Public can read active partners"
  ON public.partners
  FOR SELECT
  USING (is_active = true);

-- Index for fast, ordered reads
CREATE INDEX IF NOT EXISTS partners_display_order_idx ON public.partners (display_order ASC, created_at ASC);

-- Comment describing admin workflow
COMMENT ON TABLE public.partners IS
  'Partner logos shown on the landing page. Manage rows directly in the Supabase Dashboard. Set is_active=false to hide without deleting.';
