-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create wallet_connections table
CREATE TABLE public.wallet_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 8453,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, wallet_address)
);

-- Create balances table
CREATE TABLE public.balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    kdx_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    kdx_claimable DECIMAL(20, 8) NOT NULL DEFAULT 0,
    demo_usdt_balance DECIMAL(20, 8) NOT NULL DEFAULT 10000,
    base_eth_fee_balance DECIMAL(20, 18) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create open_positions table
CREATE TABLE public.open_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    leverage INTEGER NOT NULL CHECK (leverage >= 1 AND leverage <= 50),
    entry_price DECIMAL(20, 8) NOT NULL,
    margin DECIMAL(20, 8) NOT NULL,
    position_size DECIMAL(20, 8) NOT NULL,
    liquidation_price DECIMAL(20, 8) NOT NULL,
    fee_paid DECIMAL(20, 18) NOT NULL DEFAULT 0,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trades_history table
CREATE TABLE public.trades_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    leverage INTEGER NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    exit_price DECIMAL(20, 8),
    margin DECIMAL(20, 8) NOT NULL,
    position_size DECIMAL(20, 8) NOT NULL,
    realized_pnl DECIMAL(20, 8),
    fee_paid DECIMAL(20, 18) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('closed', 'liquidated')),
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rewards_claims table
CREATE TABLE public.rewards_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL,
    volume_score DECIMAL(20, 8) NOT NULL DEFAULT 0,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, claim_date)
);

-- Create leaderboard_daily table
CREATE TABLE public.leaderboard_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_volume DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
    trade_count INTEGER NOT NULL DEFAULT 0,
    win_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

-- Create referrals table
CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bonus_granted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (referred_id)
);

-- Create tasks_progress table
CREATE TABLE public.tasks_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    target INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, task_id, date)
);

-- Create deposits_history table
CREATE TABLE public.deposits_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tx_hash TEXT NOT NULL UNIQUE,
    amount DECIMAL(20, 18) NOT NULL,
    token TEXT NOT NULL DEFAULT 'ETH',
    chain_id INTEGER NOT NULL DEFAULT 8453,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (read only for users, admin can manage)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for wallet_connections
CREATE POLICY "Users can view their own wallet connections"
ON public.wallet_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet connections"
ON public.wallet_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallet connections"
ON public.wallet_connections FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for balances
CREATE POLICY "Users can view their own balances"
ON public.balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balances"
ON public.balances FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for open_positions
CREATE POLICY "Users can view their own open positions"
ON public.open_positions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own open positions"
ON public.open_positions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own open positions"
ON public.open_positions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for trades_history
CREATE POLICY "Users can view their own trade history"
ON public.trades_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade history"
ON public.trades_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rewards_claims
CREATE POLICY "Users can view their own rewards claims"
ON public.rewards_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards claims"
ON public.rewards_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for leaderboard_daily (public read for leaderboard)
CREATE POLICY "Anyone can view leaderboard"
ON public.leaderboard_daily FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own leaderboard entries"
ON public.leaderboard_daily FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leaderboard entries"
ON public.leaderboard_daily FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view referrals they made"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- RLS Policies for tasks_progress
CREATE POLICY "Users can view their own tasks progress"
ON public.tasks_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks progress"
ON public.tasks_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks progress"
ON public.tasks_progress FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for deposits_history
CREATE POLICY "Users can view their own deposits"
ON public.deposits_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposits"
ON public.deposits_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- Generate unique referral code
    LOOP
        new_referral_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
    END LOOP;
    
    -- Create profile
    INSERT INTO public.profiles (user_id, email, referral_code)
    VALUES (NEW.id, NEW.email, new_referral_code);
    
    -- Create default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Create initial balances
    INSERT INTO public.balances (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_balances_updated_at
    BEFORE UPDATE ON public.balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboard_daily_updated_at
    BEFORE UPDATE ON public.leaderboard_daily
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_progress_updated_at
    BEFORE UPDATE ON public.tasks_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();