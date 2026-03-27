-- Dynamic roadmap phases for the landing page.
-- Admin manages via Supabase Dashboard — status is a dropdown (ENUM).

-- Create enum so Supabase Dashboard shows a dropdown selector for status
CREATE TYPE public.roadmap_status AS ENUM (
  'completed',   -- ✔ fully shipped and done (past phase)
  'live',        -- ✅ currently live / shipped
  'in_progress', -- 🔵 actively being worked on
  'coming',      -- 🕐 coming soon
  'planned',     -- 📅 planned, not started
  'future'       -- 🚀 long-term vision
);

CREATE TABLE IF NOT EXISTS public.roadmap_phases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number  INT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,                               -- optional subtitle shown on card
  status        public.roadmap_status NOT NULL DEFAULT 'planned',
  display_order INT NOT NULL DEFAULT 0,             -- controls left-to-right order
  is_active     BOOLEAN NOT NULL DEFAULT true,      -- false = hidden without deleting
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;

-- Public read: landing page is unauthenticated
CREATE POLICY "Public can read active roadmap phases"
  ON public.roadmap_phases
  FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS roadmap_phases_order_idx
  ON public.roadmap_phases (display_order ASC);

COMMENT ON TABLE public.roadmap_phases IS
  'Roadmap phases shown on the landing page. Manage in Supabase Dashboard. Status dropdown has 5 preset options.';

-- Pre-populate with current hardcoded phases
INSERT INTO public.roadmap_phases (phase_number, title, status, display_order) VALUES
  (1, 'Trading Experience + Rewards',       'live',     10),
  (2, 'More Markets + Advanced Charting',   'coming',   20),
  (3, 'Exchange Infrastructure Expansion',  'planned',  30),
  (4, 'Full KieDex Exchange Launch',        'future',   40);
