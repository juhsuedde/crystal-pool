-- Crystal Pool Database Triggers
-- Run these in Supabase SQL Editor

-- 1. Function to recalculate pool status based on latest readings
CREATE OR REPLACE FUNCTION update_pool_status()
RETURNS TRIGGER AS $$
DECLARE
  _pool_ph NUMERIC;
  _pool_chlorine NUMERIC;
  _new_status TEXT;
BEGIN
  -- Get latest readings for the pool (only type 'reading')
  SELECT ph, chlorine INTO _pool_ph, _pool_chlorine
  FROM pool_logs
  WHERE pool_id = NEW.pool_id AND type = 'reading' AND ph IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate status based on chemistry rules
  IF _pool_ph IS NULL AND _pool_chlorine IS NULL THEN
    _new_status := 'offline';
  ELSIF _pool_ph IS NOT NULL AND (_pool_ph < 6.8 OR _pool_ph > 8.0) THEN
    _new_status := 'critical';
  ELSIF _pool_chlorine IS NOT NULL AND _pool_chlorine < 0.5 THEN
    _new_status := 'critical';
  ELSIF _pool_ph IS NOT NULL AND (_pool_ph < 7.2 OR _pool_ph > 7.6) THEN
    _new_status := 'warning';
  ELSIF _pool_chlorine IS NOT NULL AND (_pool_chlorine < 1.0 OR _pool_chlorine > 5.0) THEN
    _new_status := 'warning';
  ELSE
    _new_status := 'crystal';
  END IF;
  
  -- Update the pool status and last_reading_at
  UPDATE pools 
  SET status = _new_status, 
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