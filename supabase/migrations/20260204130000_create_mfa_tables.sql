-- Enable Multi-Factor Authentication (MFA) support

-- Create user_mfa table to track MFA status
CREATE TABLE public.user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    backup_codes TEXT[], -- Array of hashed backup codes
    enabled_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

-- Users can view their own MFA status
CREATE POLICY "Users can view their own MFA status"
ON public.user_mfa
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own MFA settings
CREATE POLICY "Users can insert their own MFA settings"
ON public.user_mfa
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own MFA settings
CREATE POLICY "Users can update their own MFA settings"
ON public.user_mfa
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own MFA settings
CREATE POLICY "Users can delete their own MFA settings"
ON public.user_mfa
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_mfa_user_id ON public.user_mfa(user_id);
CREATE INDEX idx_user_mfa_enabled ON public.user_mfa(is_enabled) WHERE is_enabled = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_mfa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_mfa_updated_at
    BEFORE UPDATE ON public.user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_user_mfa_updated_at();
