-- Crystal Pool Database Triggers
-- Run these in Supabase SQL Editor

-- 1. Function to recalculate pool status based on latest readings
CREATE OR REPLACE FUNCTION update_pool_status()
RETURNS TRIGGER AS $$
DECLARE
  v_ph NUMERIC;
  v_chlorine NUMERIC;
  v_status TEXT;
BEGIN
  -- Get latest readings for the pool (only type 'reading')
  SELECT pool_logs.ph, pool_logs.chlorine INTO v_ph, v_chlorine
  FROM pool_logs
  WHERE pool_logs.pool_id = NEW.pool_id 
    AND pool_logs.type = 'reading' 
    AND pool_logs.ph IS NOT NULL
  ORDER BY pool_logs.created_at DESC
  LIMIT 1;
  
  -- Calculate status based on chemistry rules
  IF v_ph IS NULL AND v_chlorine IS NULL THEN
    v_status := 'offline';
  ELSIF v_ph IS NOT NULL AND (v_ph < 6.8 OR v_ph > 8.0) THEN
    v_status := 'critical';
  ELSIF v_chlorine IS NOT NULL AND v_chlorine < 0.5 THEN
    v_status := 'critical';
  ELSIF v_ph IS NOT NULL AND (v_ph < 7.2 OR v_ph > 7.6) THEN
    v_status := 'warning';
  ELSIF v_chlorine IS NOT NULL AND (v_chlorine < 1.0 OR v_chlorine > 5.0) THEN
    v_status := 'warning';
  ELSE
    v_status := 'crystal';
  END IF;
  
  -- Update the pool status and last_reading_at
  UPDATE pools 
  SET status = v_status, 
      updated_at = NOW(),
      last_reading_at = NEW.created_at
  WHERE id = NEW.pool_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger to call function after each pool_logs insert
DROP TRIGGER IF EXISTS on_pool_logs_status_update ON pool_logs;
CREATE TRIGGER on_pool_logs_status_update
  AFTER INSERT ON pool_logs
  FOR EACH ROW
  WHEN (NEW.type = 'reading')
  EXECUTE FUNCTION update_pool_status();