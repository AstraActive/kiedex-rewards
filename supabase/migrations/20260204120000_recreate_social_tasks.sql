-- Drop and recreate social_tasks table with correct constraints

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.social_tasks CASCADE;

-- Create social_tasks table with ALL supported types from the guide
CREATE TABLE public.social_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    reward DECIMAL(20, 8) NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('usdt', 'oil', 'kdx')),
    link TEXT NOT NULL,
    icon_name TEXT NOT NULL CHECK (icon_name IN ('send', 'at_sign', 'repeat', 'globe')),
    proof_type TEXT NOT NULL CHECK (proof_type IN ('telegram_username', 'twitter_username', 'tweet_link', 'web_link')),
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

-- Insert example tasks from the guide
INSERT INTO public.social_tasks (task_id, name, description, reward, reward_type, link, icon_name, proof_type, is_active, sort_order) VALUES
('follow_twitter', 'Follow on Twitter', 'Follow KieDex on Twitter/X', 100, 'kdx', 'https://twitter.com/kiedex', 'at_sign', 'twitter_username', true, 1),
('join_telegram', 'Join Telegram', 'Join KieDex community on Telegram', 100, 'kdx', 'https://t.me/kiedex', 'send', 'telegram_username', true, 2),
('discord_join', 'Join Discord', 'Join our community Discord server', 5, 'usdt', 'https://discord.gg/kiedex', 'globe', 'web_link', true, 3);

-- Add index for performance
CREATE INDEX idx_social_tasks_active_sort ON public.social_tasks(is_active, sort_order) WHERE is_active = true;
