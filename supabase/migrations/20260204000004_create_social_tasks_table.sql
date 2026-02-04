-- Create social_tasks table to define available social tasks
CREATE TABLE public.social_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    reward DECIMAL(20, 8) NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('kdx', 'usdt')),
    link TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    proof_type TEXT NOT NULL CHECK (proof_type IN ('twitter_username', 'telegram_username', 'discord_username', 'email')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_tasks ENABLE ROW LEVEL SECURITY;

-- Anyone can view active social tasks
CREATE POLICY "Anyone can view active social tasks"
ON public.social_tasks
FOR SELECT
USING (is_active = true);

-- Insert initial social tasks
INSERT INTO public.social_tasks (task_id, name, description, reward, reward_type, link, icon_name, proof_type, sort_order) VALUES
('follow_twitter', 'Follow on Twitter', 'Follow KieDex on Twitter/X', 100, 'kdx', 'https://twitter.com/kiedex', 'twitter', 'twitter_username', 1),
('join_telegram', 'Join Telegram', 'Join KieDex community on Telegram', 100, 'kdx', 'https://t.me/kiedex', 'telegram', 'telegram_username', 2),
('join_discord', 'Join Discord', 'Join KieDex Discord server', 100, 'kdx', 'https://discord.gg/kiedex', 'discord', 'discord_username', 3);

-- Add index for performance
CREATE INDEX idx_social_tasks_active_sort ON public.social_tasks(is_active, sort_order) WHERE is_active = true;
