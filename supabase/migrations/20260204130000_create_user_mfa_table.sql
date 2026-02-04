-- Create user_mfa table for two-factor authentication
CREATE TABLE public.user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    enabled_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    backup_codes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

-- Users can only view their own MFA settings
CREATE POLICY "Users can view their own MFA settings"
ON public.user_mfa
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own MFA settings
CREATE POLICY "Users can insert their own MFA settings"
ON public.user_mfa
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own MFA settings
CREATE POLICY "Users can update their own MFA settings"
ON public.user_mfa
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own MFA settings
CREATE POLICY "Users can delete their own MFA settings"
ON public.user_mfa
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_user_mfa_user_id ON public.user_mfa(user_id);
CREATE INDEX idx_user_mfa_enabled ON public.user_mfa(user_id, is_enabled) WHERE is_enabled = true;
