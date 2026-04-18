-- Add Stripe columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', null)),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('homeowner', 'pro', null)),
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_status, subscription_tier);