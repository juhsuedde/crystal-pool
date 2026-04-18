-- Crystal Pool Database Triggers
-- Run these in Supabase SQL Editor

-- 1. Function to recalculate pool status based on latest readings
CREATE OR REPLACE FUNCTION update_pool_status()
RETURNS TRIGGER AS $$
DECLARE
  r_ph NUMERIC;
  r_chlorine NUMERIC;
  new_status TEXT;
BEGIN
  -- Get latest readings for the pool (only type 'reading')
  SELECT ph, chlorine INTO r_ph, r_chlorine
  FROM pool_logs
  WHERE pool_id = NEW.pool_id AND type = 'reading' AND ph IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate status based on chemistry rules:
  -- Crystal: pH 7.2-7.6, chlorine 1.0-3.0
  -- Warning: pH < 7.2 OR > 7.6 OR chlorine < 1.0 OR > 5.0
  -- Critical: pH < 6.8 OR > 8.0 OR chlorine < 0.5
  -- Offline: no readings
  
  IF r_ph IS NULL AND r_chlorine IS NULL THEN
    new_status := 'offline';
  ELSIF r_ph IS NOT NULL AND (r_ph < 6.8 OR r_ph > 8.0) THEN
    new_status := 'critical';
  ELSIF r_chlorine IS NOT NULL AND r_chlorine < 0.5 THEN
    new_status := 'critical';
  ELSIF r_ph IS NOT NULL AND (r_ph < 7.2 OR r_ph > 7.6) THEN
    new_status := 'warning';
  ELSIF r_chlorine IS NOT NULL AND (r_chlorine < 1.0 OR r_chlorine > 5.0) THEN
    new_status := 'warning';
  ELSE
    new_status := 'crystal';
  END IF;
  
  -- Update the pool status and last_reading_at
  UPDATE pools 
  SET status = new_status, 
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