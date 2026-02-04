-- Create social_tasks_progress table for one-time social tasks
CREATE TABLE public.social_tasks_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Create volume_milestone_claims table for daily volume milestones
CREATE TABLE public.volume_milestone_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  milestone_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  volume_reached NUMERIC NOT NULL,
  reward_oil INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_id, date)
);

-- Enable RLS on social_tasks_progress
ALTER TABLE public.social_tasks_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social tasks progress"
ON public.social_tasks_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social tasks progress"
ON public.social_tasks_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social tasks progress"
ON public.social_tasks_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable RLS on volume_milestone_claims
ALTER TABLE public.volume_milestone_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own volume milestone claims"
ON public.volume_milestone_claims
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own volume milestone claims"
ON public.volume_milestone_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);