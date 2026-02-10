-- Create task_submissions table for proof-based social tasks
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  task_id TEXT NOT NULL,
  proof_type TEXT NOT NULL,  -- 'telegram_username' | 'twitter_username' | 'tweet_link'
  proof_value TEXT NOT NULL, -- '@username' or full tweet URL (stored lowercase)
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending' | 'approved' | 'rejected' | 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One submission per task per user
  CONSTRAINT unique_user_task UNIQUE(user_id, task_id),
  -- Proof must be globally unique (anti-spam)
  CONSTRAINT unique_proof UNIQUE(proof_type, proof_value)
);

-- Enable RLS
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.task_submissions;
CREATE POLICY "Users can view their own submissions"
  ON public.task_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.task_submissions;
CREATE POLICY "Users can insert their own submissions"
  ON public.task_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_proof ON public.task_submissions(proof_type, proof_value);