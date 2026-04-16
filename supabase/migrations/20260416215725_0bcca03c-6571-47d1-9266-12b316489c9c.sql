-- Pools table
CREATE TABLE public.pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  volume_liters INTEGER NOT NULL DEFAULT 50000,
  type TEXT NOT NULL DEFAULT 'outdoor',
  status TEXT NOT NULL DEFAULT 'offline',
  ph NUMERIC,
  chlorine NUMERIC,
  alkalinity NUMERIC,
  temperature NUMERIC,
  last_reading_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pools" ON public.pools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pools" ON public.pools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pools" ON public.pools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pools" ON public.pools FOR DELETE USING (auth.uid() = user_id);

-- Logs table
CREATE TABLE public.pool_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pool_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs" ON public.pool_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logs" ON public.pool_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own logs" ON public.pool_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_pools_user ON public.pools(user_id);
CREATE INDEX idx_logs_pool ON public.pool_logs(pool_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON public.pools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();