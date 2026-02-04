-- Update social_tasks constraints to support oil rewards and web_link proof types

-- Drop existing constraints
ALTER TABLE public.social_tasks DROP CONSTRAINT IF EXISTS social_tasks_reward_type_check;
ALTER TABLE public.social_tasks DROP CONSTRAINT IF EXISTS social_tasks_proof_type_check;

-- Add updated constraints
ALTER TABLE public.social_tasks 
ADD CONSTRAINT social_tasks_reward_type_check 
CHECK (reward_type IN ('kdx', 'usdt', 'oil'));

ALTER TABLE public.social_tasks 
ADD CONSTRAINT social_tasks_proof_type_check 
CHECK (proof_type IN ('twitter_username', 'telegram_username', 'discord_username', 'email', 'tweet_link', 'web_link'));
